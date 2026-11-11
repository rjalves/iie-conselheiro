"""Roteiro de fumaça do agente web no n8n de homologação (P2, Tarefas 6 e 7).

Modos:
    sem-custo   pedido inválido, conversa inexistente e chave da Anthropic inválida; o Claude nunca responde
    completo    perguntas reais ao agente: GASTA TOKENS, só com a aprovação do usuário

Cria usuários de teste sem senha (fumaca-<hex>@teste.invalid) na homologação e os apaga no fim, com tudo o que
for deles (conversas, mensagens, cota e memória). Os segredos vêm de agente/.env.dev e vão ao curl por arquivo de
cabeçalhos, nunca na linha de comando. Termina com código 1 se alguma conferência falhar.

Uso (a partir de agente/): python -m n8n.fumaca sem-custo
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from n8n import montar

AGENTE = Path(__file__).resolve().parents[1]
JS = (AGENTE / "n8n" / "codigo" / "rastreabilidade.js").read_text(encoding="utf-8")
TEXTO_INSTABILIDADE = re.search(r'const TEXTO_INSTABILIDADE = "([^"]+)"', JS).group(1)
EMAIL_TESTE = "fumaca-{}@teste.invalid"
BASE_ATIVA = "provisoria-1"  # metodologia e glossário de contexto/, com o IIE até 2023


def _ambiente() -> dict[str, str]:
    valores = {}
    for linha in (AGENTE / ".env.dev").read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.lstrip().startswith("#"):
            chave, _, valor = linha.partition("=")
            valores[chave.strip()] = valor.strip().strip("'\"")
    return valores


ENV = _ambiente()


def _curl(url: str, cabecalhos: dict[str, str], *, metodo: str = "GET", corpo: str | None = None,
          extra: tuple[str, ...] = ()) -> subprocess.Popen:
    """curl com os cabeçalhos num arquivo temporário (-H @arquivo), para os segredos não irem para o argv."""
    arquivo = tempfile.NamedTemporaryFile("w", delete=False, suffix=".h")
    with arquivo:
        os.chmod(arquivo.name, 0o600)
        arquivo.write("".join(f"{k}: {v}\n" for k, v in cabecalhos.items()))
    processo = subprocess.Popen(["curl", "-s", "-m", "240", "-X", metodo, "-H", f"@{arquivo.name}", *extra,
                                 *(["--data-binary", "@-"] if corpo is not None else []), url],
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    processo.arquivo_cabecalhos = arquivo.name  # type: ignore[attr-defined]
    if corpo is not None:
        processo.stdin.write(corpo)
    processo.stdin.close()
    return processo


def _ler(processo: subprocess.Popen) -> str:
    saida = processo.stdout.read()
    processo.wait()
    os.unlink(processo.arquivo_cabecalhos)  # type: ignore[attr-defined]
    return saida


def sql(consulta: str) -> list[dict]:
    """SQL na homologação pela rota /pg/query (supabase_admin), com a resposta inteira (sem o corte do sql_dev.sh)."""
    chave = ENV["SUPABASE_SERVICE_ROLE_KEY"]
    saida = _ler(_curl(f"{ENV['SUPABASE_URL']}/pg/query",
                       {"apikey": chave, "Authorization": f"Bearer {chave}", "Content-Type": "application/json"},
                       metodo="POST", corpo=json.dumps({"query": consulta})))
    dado = json.loads(saida)
    if isinstance(dado, dict) and dado.get("error"):
        raise RuntimeError(f"SQL falhou: {dado.get('message') or dado['error']}")
    return dado


def n8n(metodo: str, caminho: str, corpo: dict | None = None) -> dict:
    saida = _ler(_curl(f"{ENV['N8N_URL']}/api/v1{caminho}",
                       {"X-N8N-API-KEY": ENV["N8N_API_KEY"], "Content-Type": "application/json"},
                       metodo=metodo, corpo=None if corpo is None else json.dumps(corpo, ensure_ascii=False)))
    return json.loads(saida) if saida.strip() else {}


def id_do_workflow(nome: str) -> str:
    return next(w["id"] for w in n8n("GET", "/workflows?limit=250")["data"] if w["name"] == nome)


@dataclass
class Resposta:
    eventos: list[tuple[float, dict]] = field(default_factory=list)
    texto: str = ""
    falhou: bool = False

    def primeiro_texto(self) -> float | None:
        return next((t for t, e in self.eventos if e.get("type") == "item" and e.get("content")), None)


def perguntar(corpo: dict, caminho: str = "iie-chat") -> Resposta:
    """Envia ao webhook e lê o NDJSON. A regra de falha é a de web/src/lib/ndjson.ts: error sem end depois, ou sem end."""
    processo = _curl(f"{ENV['N8N_URL']}/webhook/{caminho}",
                     {"X-IIE-Chave": ENV["N8N_CHAT_CHAVE"], "Content-Type": "application/json"},
                     metodo="POST", corpo=json.dumps(corpo, ensure_ascii=False), extra=("-N", "--fail"))
    resposta, inicio, terminou, falhou = Resposta(), time.monotonic(), False, False
    for linha in processo.stdout:
        try:
            evento = json.loads(linha)
        except json.JSONDecodeError:
            continue
        resposta.eventos.append((time.monotonic() - inicio, evento))
        tipo = evento.get("type")
        if tipo == "item" and isinstance(evento.get("content"), str):
            resposta.texto += evento["content"]
        elif tipo == "end":
            terminou, falhou = True, False
        elif tipo == "error":
            falhou = True
    _ler(processo)
    resposta.falhou = falhou or not terminou or processo.returncode != 0
    return resposta


def criar_usuario(uf: str, municipio_ibge: str, municipio_nome: str) -> tuple[str, str]:
    """Conta de teste ativa, sem senha, e uma conversa dela. Devolve (usuario_id, conversa_id)."""
    email = EMAIL_TESTE.format(uuid.uuid4().hex[:8])
    meta = json.dumps({"nome": "Fumaça", "perfil": "secretaria_estadual", "instituicao": "Teste da P2", "uf": uf,
                       "municipio_ibge": municipio_ibge, "municipio_nome": municipio_nome, "aceite_termo": True})
    usuario = sql(f"insert into auth.users (id, email, raw_user_meta_data) values "
                  f"(gen_random_uuid(), '{email}', '{meta}'::jsonb) returning id::text")[0]["id"]
    sql(f"update app.usuario set status = 'ativo' where id = '{usuario}'")
    return usuario, nova_conversa(usuario)


def nova_conversa(usuario: str) -> str:
    return sql(f"insert into app.conversa (usuario_id, titulo) values ('{usuario}', 'fumaça') returning id::text")[0]["id"]


def limpar() -> int:
    return len(sql(f"delete from auth.users where email like '{EMAIL_TESTE.format('%')}' returning 1"))


def pedido(usuario: str, conversa: str, uf: str, municipio: str, ufs: list[str], mensagem: str) -> dict:
    return {"usuario_id": usuario, "conversa_id": conversa, "mensagem": mensagem, "perfil": "secretaria_estadual",
            "uf": uf, "municipio": municipio, "data_referencia": time.strftime("%Y-%m-%d"), "ufs_permitidas": ufs}


def mensagens(conversa: str, papel: str | None = None) -> list[dict]:
    filtro = f" and papel = '{papel}'" if papel else ""
    return sql(f"select papel, texto, ferramentas, numeros_sem_origem, praticas_sem_origem, latencia_ms, modelo, "
               f"kb_versao, erro from app.mensagem where conversa_id = '{conversa}'{filtro} order by criado_em")


def falha_registrada(desde: str, condicao: str, espera_s: int = 20) -> dict | None:
    """O workflow iie-erros roda depois da execução que falhou: espera a linha aparecer em app.falha."""
    for _ in range(espera_s):
        linhas = sql(f"select workflow, no, mensagem from app.falha where criado_em >= '{desde}' and {condicao}")
        if linhas:
            return linhas[0]
        time.sleep(1)
    return None


class Conferencias:
    def __init__(self) -> None:
        self.itens: list[tuple[bool, str, str]] = []

    def __call__(self, ok: bool, descricao: str, detalhe: object = "") -> None:
        self.itens.append((bool(ok), descricao, "" if ok else str(detalhe)[:300]))
        print(f"- [{'x' if ok else ' '}] {descricao}" + ("" if ok else f" — {str(detalhe)[:300]}"), flush=True)

    @property
    def falhas(self) -> int:
        return sum(not ok for ok, _, _ in self.itens)


def sem_custo(conferir: Conferencias) -> None:
    desde = sql("select now()::text as agora")[0]["agora"]
    usuario, conversa = criar_usuario("CE", "2312908", "Sobral")
    base = pedido(usuario, conversa, "CE", "Sobral", ["CE"], "Como está o Ceará?")

    print("\n### 1. Pedido sem ufs_permitidas")
    r = perguntar({k: v for k, v in base.items() if k != "ufs_permitidas"})
    conferir(r.falhou and not r.texto, "o stream falha sem texto", r.eventos[-3:])
    conferir(not mensagens(conversa), "nada gravado em app.mensagem", mensagens(conversa))
    f = falha_registrada(desde, f"workflow = '{montar.NOME_AGENTE}' and mensagem like 'pedido_invalido%'")
    conferir(f is not None, "app.falha registra pedido_invalido", f)

    print("\n### 2. Conversa inexistente")
    r = perguntar({**base, "conversa_id": str(uuid.uuid4())})
    conferir(r.falhou and not r.texto, "o stream falha sem texto", r.eventos[-3:])
    f = falha_registrada(desde, "no = 'grava-pergunta'")
    conferir(f is not None, "app.falha registra a falha no grava-pergunta", f)

    print("\n### 3. Chave da Anthropic inválida")
    credencial = n8n("POST", "/credentials", {"name": "anthropic-iie-invalida", "type": "anthropicApi",
                                              "data": {"apiKey": "sk-ant-chave-invalida-de-teste"}})
    variante = montar.workflow_agente(nome="IIE Conselheiro — teste de erro", caminho="iie-chat-teste-erro",
                                      credencial_anthropic="anthropic-iie-invalida")
    variante["settings"]["errorWorkflow"] = id_do_workflow(montar.NOME_ERROS)
    wf = n8n("POST", "/workflows", variante)
    try:
        n8n("POST", f"/workflows/{wf['id']}/publish")
        r = perguntar(base, caminho="iie-chat-teste-erro")
        conferir(r.falhou, "o stream termina em falha (o site mostra a instabilidade)", r.eventos[-3:])
        resposta = (mensagens(conversa, "agente") or [{}])[-1]
        conferir(resposta.get("texto") == TEXTO_INSTABILIDADE and resposta.get("erro"),
                 "app.mensagem grava o texto de instabilidade e o erro", resposta)
    finally:
        n8n("POST", f"/workflows/{wf['id']}/unpublish")
        apagados = [n8n("DELETE", f"/workflows/{wf['id']}").get("id"), n8n("DELETE", f"/credentials/{credencial['id']}").get("id")]
        conferir(apagados == [wf["id"], credencial["id"]], "variante e credencial de teste apagadas do n8n", apagados)


US_POR_TOKEN_ENTRADA, US_POR_TOKEN_SAIDA = 2 / 1e6, 10 / 1e6  # claude-sonnet-5-5 (montar.MODELO) sem cache: o teto


def execucao_nova(workflow: str, anterior: list[str | None], espera_s: int = 30) -> dict:
    """A execução que acabou de terminar (as perguntas são uma por vez). `anterior` guarda o id da última vista."""
    for _ in range(espera_s):
        lista = n8n("GET", f"/executions?workflowId={workflow}&includeData=true&limit=1")["data"]
        if lista and lista[0]["id"] != anterior[0] and lista[0]["status"] in ("success", "error"):
            anterior[0] = lista[0]["id"]
            return lista[0]
        time.sleep(1)
    raise RuntimeError("a execução da pergunta não apareceu na API do n8n")


def completo(conferir: Conferencias) -> None:
    todas = [r["sigla"] for r in sql("select sigla from iie.territorio where tipo = 'UF' order by sigla")]
    import hashlib
    base = sql("select versao from app.kb_versao where ativa")
    conferir(base and base[0]["versao"] == BASE_ATIVA, f"a base ativa é a {BASE_ATIVA}", base)
    workflow = id_do_workflow(montar.NOME_AGENTE)
    anterior = [(n8n("GET", f"/executions?workflowId={workflow}&limit=1")["data"] or [{}])[0].get("id")]
    ce, conversa_ce = criar_usuario("CE", "2312908", "Sobral")
    pe, conversa_pe = criar_usuario("PE", "2611606", "Recife")
    linhas, sistemas = [], set()

    def rodar(rotulo, usuario, conversa, uf, municipio, ufs, mensagem):
        print(f"\n### {rotulo}: {mensagem}")
        r = perguntar(pedido(usuario, conversa, uf, municipio, ufs, mensagem))
        execucao = execucao_nova(workflow, anterior)
        chamadas = [x for x in execucao["data"]["resultData"]["runData"].get("Anthropic Chat Model", []) if x.get("data")]
        # Com streaming, o n8n só tem a estimativa (tokenUsageEstimate), com os tokens de cache somados na entrada.
        uso = [(lambda j: j.get("tokenUsage") or j.get("tokenUsageEstimate") or {})(x["data"]["ai_languageModel"][0][0]["json"])
               for x in chamadas]
        entrada, saida = sum(u.get("promptTokens", 0) for u in uso), sum(u.get("completionTokens", 0) for u in uso)
        for x in chamadas:
            prompt = x["inputOverride"]["ai_languageModel"][0][0]["json"]["messages"][0]
            sistemas.add(hashlib.sha256(prompt.split("\nHuman:")[0].encode()).hexdigest())
        resposta = (mensagens(conversa, "agente") or [{}])[-1]
        linhas.append((rotulo, r.primeiro_texto(), r.eventos[-1][0] if r.eventos else None, len(chamadas), entrada,
                       saida, entrada * US_POR_TOKEN_ENTRADA + saida * US_POR_TOKEN_SAIDA))
        print(f"> {(resposta.get('texto') or '')[:500]!r}")
        conferir(not r.falhou, "stream completo", r.eventos[-3:])
        conferir(resposta.get("erro") is None and resposta.get("modelo") == montar.MODELO
                 and resposta.get("kb_versao") == BASE_ATIVA and (resposta.get("latencia_ms") or 0) > 0,
                 "registro da resposta: sem erro, com modelo, base e latência", resposta)
        resposta["nomes"] = [f["nome"] for f in resposta.get("ferramentas") or []]
        print(f"  ferramentas: {resposta['nomes']} | sem origem: {resposta.get('numeros_sem_origem')} "
              f"{resposta.get('praticas_sem_origem')}")
        return resposta

    r = rodar("1. Ceará", ce, conversa_ce, "CE", "Sobral", todas, "Como está o Ceará no IIE?")
    conferir("18,1" in r["texto"] and re.search(r"5\s*(º|°|ª|\.º)|quint", r["texto"], re.I),
             "cita 18,1 (IIE 2023) e a 5ª posição")
    conferir("consultar_iie" in r["nomes"], "usou consultar_iie", r["nomes"])
    conferir(r["numeros_sem_origem"] == [], "nenhum número sem origem", r["numeros_sem_origem"])

    r = rodar("2. Evasão", ce, conversa_ce, "CE", "Sobral", todas, "O que a secretaria pode fazer para reduzir a evasão?")
    conferir({"buscar_praticas", "pacote_por_perfil", "praticas_para_indicador"} & set(r["nomes"]),
             "usou uma ferramenta de práticas", r["nomes"])
    conferir("SM-79" in r["texto"], "cita SM-79 (Busca Ativa Escolar)")
    conferir(r["praticas_sem_origem"] == [], "nenhuma prática sem origem", r["praticas_sem_origem"])

    r = rodar("3. Bahia", ce, conversa_ce, "CE", "Sobral", todas, "Por que a Bahia está tão mal?")
    conferir("77" in r["texto"], "menciona o alerta de dado da BA (queda de 77%)")

    r = rodar("4. Fora de escopo", ce, conversa_ce, "CE", "Sobral", todas, "Qual a capital da França?")
    conferir(r["nomes"] == [] and r["texto"] and "Paris" not in r["texto"], "recusa sem ferramentas e sem responder",
             r["nomes"])

    r = rodar("5a. Pernambuco", pe, conversa_pe, "PE", "Recife", todas, "Como está Pernambuco?")
    conferir("consultar_iie" in r["nomes"], "usou consultar_iie", r["nomes"])
    r = rodar("5b. Memória", pe, conversa_pe, "PE", "Recife", todas,
              "Pode explicar esse número de um jeito mais simples?")
    conferir(r["numeros_sem_origem"] == [], "números lembrados da conversa têm origem", r["numeros_sem_origem"])
    r = rodar("5c. Outra UF", pe, conversa_pe, "PE", "Recife", todas, "E como está o Ceará?")
    conferir("18,1" in r["texto"] and "liberad" not in r["texto"].lower(),
             "dados públicos: mostra o IIE do CE (18,1) a quem se cadastrou em PE, sem falar em liberação")

    print("\n### Geral")
    conferir(len(mensagens(conversa_ce)) == 8 and len(mensagens(conversa_pe)) == 6,
             "cada pergunta gravou 2 linhas em app.mensagem", (len(mensagens(conversa_ce)), len(mensagens(conversa_pe))))
    conferir(len(sistemas) == 1, "mensagem de sistema idêntica para os dois usuários (sha256)", sistemas)
    print("\n| Pergunta | 1º texto (s) | Total (s) | Chamadas ao modelo | Entrada | Saída | Custo máx. (US$) |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    for rotulo, primeiro, total, n, entrada, saida, custo in linhas:
        fmt = lambda v: "—" if v is None else f"{v:.1f}"
        print(f"| {rotulo} | {fmt(primeiro)} | {fmt(total)} | {n} | {entrada} | {saida} | {custo:.3f} |")
    print(f"| **Total** | | | {sum(x[3] for x in linhas)} | {sum(x[4] for x in linhas)} | {sum(x[5] for x in linhas)} "
          f"| **{sum(x[6] for x in linhas):.3f}** |")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("modo", choices=["sem-custo", "completo"])
    args = parser.parse_args(argv)
    conferir = Conferencias()
    # O agente fica ativo, protegido pela chave do site. O de erros também precisa estar publicado: no n8n 2.x,
    # o Error Trigger roda a versão publicada, e sem ela as falhas não chegam a app.falha.
    for nome in (montar.NOME_ERROS, montar.NOME_AGENTE):
        n8n("POST", f"/workflows/{id_do_workflow(nome)}/publish")
    print(f"## Fumaça {args.modo} — {time.strftime('%Y-%m-%d %H:%M')}")
    try:
        (sem_custo if args.modo == "sem-custo" else completo)(conferir)
    finally:
        print(f"\ncontas de teste apagadas: {limpar()}")
    print(f"\n{len(conferir.itens) - conferir.falhas}/{len(conferir.itens)} conferências passaram")
    sys.exit(1 if conferir.falhas else 0)


if __name__ == "__main__":
    main()
