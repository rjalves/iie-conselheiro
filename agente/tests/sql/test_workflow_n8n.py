"""Workflow do agente no n8n, gerado por n8n/montar.py (P2, Tarefas 4 e 5)."""
import json
import re
from pathlib import Path

import pytest

from n8n import montar

NOMES = ["buscar_praticas", "comparar_territorios", "consultar_iie", "decompor_iie", "pacote_por_perfil",
         "praticas_para_indicador", "ranking"]
POR_NOME = {f.nome: f for f in montar.FERRAMENTAS}
CORPO = "$('Webhook').first().json.body."
UFS_DO_WEBHOOK = CORPO + "ufs_permitidas"


def test_ferramentas_em_ordem_alfabetica():
    nomes = [f.nome for f in montar.FERRAMENTAS]
    assert nomes == sorted(nomes) == NOMES


def test_ufs_vem_do_webhook_e_nunca_do_modelo():
    assert {f.nome for f in montar.FERRAMENTAS if f.usa_ufs} == {
        "comparar_territorios", "consultar_iie", "decompor_iie", "ranking"}
    for f in montar.FERRAMENTAS:
        assert all("ufs" not in p.chave for p in f.parametros)
        if f.usa_ufs:
            assert montar.query_replacement(f).endswith(UFS_DO_WEBHOOK + " ] }}")
            assert f.sql.endswith(f"${len(f.parametros) + 1}::text[]) as resultado")
        else:
            assert UFS_DO_WEBHOOK not in montar.query_replacement(f)


def test_parametros_validos():
    for f in montar.FERRAMENTAS:
        assert "'" not in f.descricao
        for p in f.parametros:
            assert re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", p.chave)
            assert p.tipo in {"string", "number", "json"}
            assert "'" not in p.descricao
            assert f"$fromAI('{p.chave}', '{p.descricao}', '{p.tipo}')" in montar.query_replacement(f)
        marcadores = [int(n) for n in re.findall(r"\$(\d+)", f.sql)]
        assert marcadores == list(range(1, len(f.parametros) + f.usa_ufs + 1))


# nome → (valores do modelo, UFs do webhook ou None, chamada direta equivalente, conferência do conteúdo)
EXEMPLOS = {
    "buscar_praticas": (["busca ativa", "todas", "todos"], None,
                        "select iie.fn_buscar_praticas('busca ativa', null, null)",
                        lambda r: '"SM-79"' in json.dumps(r)),
    "comparar_territorios": (["CE, PE", "IIE", 2019], ["CE", "PE"],
                             "select iie.fn_comparar(array['CE', 'PE'], 'IIE', 2019, array['CE', 'PE'])",
                             lambda r: "Pernambuco" in json.dumps(r, ensure_ascii=False)),
    "consultar_iie": (["CE", "EM"], ["CE"], "select iie.fn_consultar_iie('CE', 'EM', array['CE'])",
                      lambda r: r["serie"][-1] == {"ano": 2023, "valor": 18.14}),
    "decompor_iie": (["Cearense", 2019], ["CE"], "select iie.fn_decompor('Cearense', 2019, array['CE'])",
                     lambda r: r["ano"] == 2019),
    "pacote_por_perfil": (["evasao"], None, "select iie.fn_pacote('evasao')", lambda r: '"SM-79"' in json.dumps(r)),
    "praticas_para_indicador": (["F2", "todos", "nucleo"], None, "select iie.fn_praticas('F2', null, 'nucleo')",
                                lambda r: '"SM-92"' in json.dumps(r)),
    "ranking": (["IIE", 2019, "todas", 3], "todas", "select iie.fn_ranking('IIE', 2019, null, 3, iie.ufs_todas())",
                lambda r: [x["sigla"] for x in r["ranking"]] == ["SP", "DF", "GO"]),
}


def como_agente(banco, consulta, valores=()):
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        return banco.execute(consulta, valores).fetchone()[0]


@pytest.mark.parametrize("nome", NOMES)
def test_sql_da_ferramenta_igual_a_funcao(banco, nome):
    valores, ufs, direta, confere = EXEMPLOS[nome]
    if ufs == "todas":
        ufs = banco.execute("select iie.ufs_todas()").fetchone()[0]
    f = POR_NOME[nome]
    resultado = como_agente(banco, re.sub(r"\$\d+", "%s", f.sql), valores + ([ufs] if f.usa_ufs else []))
    assert resultado == como_agente(banco, direta)
    assert confere(resultado)


def test_mensagem_de_sistema_estavel():
    texto = (Path(montar.__file__).parent / "prompt" / "sistema.md").read_text(encoding="utf-8")
    assert "{{" not in texto and "$json" not in texto and "$(" not in texto
    mensagem = montar.mensagem_de_sistema()
    assert mensagem.startswith("=" + texto.rstrip("\n"))
    assert re.findall(r"\{\{.*?\}\}", mensagem) == ["{{ $('base-ativa').first().json.conteudo }}"]
    for trecho in ("<contexto>", "UF padrão", "são públicos"):
        assert trecho in texto
    assert "liberad" not in texto  # dados públicos: nada de "UFs liberadas" no prompt


def test_texto_do_usuario_traz_o_contexto():
    texto = montar.texto_do_usuario()
    assert texto.startswith("={{ ") and texto.endswith(" }}")
    for campo in ("perfil", "municipio", "data_referencia", "mensagem"):
        assert CORPO + campo in texto
    assert "ufs_permitidas" not in texto  # a lista (todas as UFs) só vai para as ferramentas
    assert re.search(re.escape(CORPO) + r"uf(?![_s])", texto)
    assert "$json.body" not in texto
    assert "'</contexto>\\n\\n'" in texto  # quebra de linha como escape JS dentro da string


# --- Tarefa 5: workflows completos -----------------------------------------------------------------------------

ARQUIVO_AGENTE = Path(montar.__file__).parent / "iie-agente-web.json"
ARQUIVO_ERROS = Path(montar.__file__).parent / "iie-erros.json"
CADASTRO = {"nome": "Ana Souza", "perfil": "secretaria_estadual", "instituicao": "Seduc CE", "uf": "CE",
            "municipio_ibge": "2312908", "municipio_nome": "Sobral", "aceite_termo": True}


def _no(w, nome):
    return next(n for n in w["nodes"] if n["name"] == nome)


def _ligacoes(w):
    """{(origem, tipo, saída): [destinos]}"""
    return {(origem, tipo, i): [d["node"] for d in destinos]
            for origem, tipos in w["connections"].items()
            for tipo, saidas in tipos.items()
            for i, destinos in enumerate(saidas)}


def test_json_versionado_esta_atualizado():
    assert montar.workflow_agente() == json.loads(ARQUIVO_AGENTE.read_text(encoding="utf-8"))
    assert montar.workflow_erros() == json.loads(ARQUIVO_ERROS.read_text(encoding="utf-8"))


def test_fluxo_do_workflow():
    w = montar.workflow_agente()
    assert _ligacoes(w) == {
        ("Webhook", "main", 0): ["validar-pedido"],
        ("validar-pedido", "main", 0): ["grava-pergunta"],
        ("grava-pergunta", "main", 0): ["base-ativa"],
        ("base-ativa", "main", 0): ["AI Agent"],
        ("AI Agent", "main", 0): ["saidas-da-conversa"],
        ("AI Agent", "main", 1): ["erro-agente"],
        ("saidas-da-conversa", "main", 0): ["rastreabilidade"],
        ("rastreabilidade", "main", 0): ["grava-resposta"],
        ("erro-agente", "main", 0): ["grava-resposta"],
        ("Anthropic Chat Model", "ai_languageModel", 0): ["AI Agent"],
        ("Postgres Chat Memory", "ai_memory", 0): ["AI Agent"],
        **{(nome, "ai_tool", 0): ["AI Agent"] for nome in NOMES},
    }
    agente = _no(w, "AI Agent")
    assert agente["onError"] == "continueErrorOutput" and agente["typeVersion"] == montar.VERSAO_AGENTE == 3.1
    opcoes = agente["parameters"]["options"]
    assert (opcoes["maxIterations"], opcoes["returnIntermediateSteps"], opcoes["enableStreaming"]) == (6, True, True)
    assert opcoes["systemMessage"] == montar.mensagem_de_sistema()
    assert agente["parameters"]["text"] == montar.texto_do_usuario()
    credenciais = {n["name"]: next(iter(n.get("credentials", {}).values()), {}).get("name") for n in w["nodes"]}
    assert credenciais == {
        "Webhook": "iie-chave-site", "validar-pedido": None, "grava-pergunta": "iie-operacao",
        "base-ativa": "iie-operacao", "AI Agent": None, "Anthropic Chat Model": "anthropic-iie",
        "Postgres Chat Memory": "iie-operacao", **{nome: "iie-leitura" for nome in NOMES},
        "saidas-da-conversa": "iie-operacao", "rastreabilidade": None, "erro-agente": None,
        "grava-resposta": "iie-operacao"}
    assert w["settings"]["errorWorkflow"] == montar.NOME_ERROS
    erros = montar.workflow_erros()
    assert _ligacoes(erros) == {("Error Trigger", "main", 0): ["grava-falha"]}
    assert _no(erros, "grava-falha")["credentials"]["postgres"]["name"] == "iie-operacao"


def test_nenhuma_query_cola_texto():
    for w in (montar.workflow_agente(), montar.workflow_erros()):
        for n in w["nodes"]:
            assert "{{" not in n["parameters"].get("query", ""), n["name"]


def test_codigo_dos_nos_e_o_dos_arquivos():
    w = montar.workflow_agente()
    pasta = Path(montar.__file__).parent / "codigo"
    for no, arquivo in (("validar-pedido", "validar_pedido.js"), ("rastreabilidade", "rastreabilidade.js"),
                        ("erro-agente", "rastreabilidade.js")):
        assert _no(w, no)["parameters"]["jsCode"].startswith((pasta / arquivo).read_text(encoding="utf-8"))


def test_variante_de_teste_so_muda_nome_caminho_e_credencial():
    normal = montar.workflow_agente()
    teste = montar.workflow_agente(nome="IIE Conselheiro — teste de erro", caminho="iie-chat-teste-erro",
                                   credencial_anthropic="anthropic-iie-invalida")
    assert _no(teste, "Webhook")["parameters"]["path"] == "iie-chat-teste-erro"
    assert _no(teste, "Anthropic Chat Model")["credentials"]["anthropicApi"]["name"] == "anthropic-iie-invalida"
    assert _no(teste, "Webhook")["webhookId"] != _no(normal, "Webhook")["webhookId"]
    for chave in ("parameters", "webhookId"):
        _no(teste, "Webhook")[chave] = _no(normal, "Webhook")[chave]
    _no(teste, "Anthropic Chat Model")["credentials"] = _no(normal, "Anthropic Chat Model")["credentials"]
    teste["name"] = normal["name"]
    assert teste == normal


def _como_n8n(banco, consulta, valores=()):
    with banco.transaction():
        banco.execute("set local role n8n_operacao")
        return banco.execute(re.sub(r"\$\d+", "%s", consulta), valores).fetchone()


def test_sql_de_gravacao_como_n8n(banco):
    from psycopg.types.json import Jsonb
    import uuid
    uid = uuid.uuid4()
    banco.execute("insert into auth.users (id, email, raw_user_meta_data) values (%s, %s, %s)",
                  (uid, f"{uid}@teste.gov.br", Jsonb(CADASTRO)))
    banco.execute("update app.usuario set status = 'ativo' where id = %s", (uid,))
    conversa = str(banco.execute("insert into app.conversa (usuario_id, titulo) values (%s, 'x') returning id",
                                 (uid,)).fetchone()[0])
    assert _como_n8n(banco, montar.SQL_GRAVA_PERGUNTA, (conversa, "Como está o Ceará?"))[0]
    assert _como_n8n(banco, montar.SQL_BASE_ATIVA) == ("sem-base", "")
    assert _como_n8n(banco, montar.SQL_SAIDAS_DA_CONVERSA, (conversa,)) == ([],)
    # Formato da memória do n8n (achatado: type e content no primeiro nível), visto na fumaça da P2.
    for mensagem in ({"type": "human", "content": "Como está o Ceará?"},
                     {"type": "tool", "content": '[{"resultado": {"valor": 21.2}}]', "tool_call_id": "t1",
                      "name": "consultar_iie"}):
        _como_n8n(banco, "insert into agente.memoria (session_id, message) values ($1, $2) returning id",
                  (conversa, Jsonb(mensagem)))
    assert _como_n8n(banco, montar.SQL_SAIDAS_DA_CONVERSA, (conversa,)) == (['[{"resultado": {"valor": 21.2}}]'],)
    ferramentas = [{"nome": "consultar_iie", "args": {"territorio": "CE"}}]
    _como_n8n(banco, montar.SQL_GRAVA_RESPOSTA, (conversa, "Resposta", json.dumps(ferramentas), "[]", "[]", 1200,
                                                 montar.MODELO, "sem-base", None))
    assert banco.execute("select ferramentas, modelo, latencia_ms, erro from app.mensagem "
                         "where conversa_id = %s and papel = 'agente'", (conversa,)).fetchone() == (
        ferramentas, montar.MODELO, 1200, None)
    assert _como_n8n(banco, montar.SQL_GRAVA_FALHA, ("1", montar.NOME_AGENTE, "grava-pergunta", "falhou"))[0]


def test_conferencia_do_publicado_acusa_diferencas_e_credenciais_nao_encontradas():
    """publicar.sh termina com erro se o n8n guardou algo diferente do git ou não achou uma credencial (revisão final)."""
    local = montar.workflow_agente()
    remoto = json.loads(json.dumps(local))
    for n in remoto["nodes"]:  # como o n8n devolve: credenciais resolvidas, com o id real
        for c in n.get("credentials", {}).values():
            c["id"] = "id-" + c["name"]
    assert montar.diferencas_publicadas(local, remoto) == []
    _no(remoto, "consultar_iie")["credentials"]["postgres"]["id"] = "iie-leitura"  # não resolvida: id == nome
    _no(remoto, "base-ativa")["parameters"]["query"] = "select 1"
    remoto["connections"].pop("erro-agente")
    assert montar.diferencas_publicadas(local, remoto) == [
        "nó diferente: base-ativa", "conexões diferentes", "credencial não encontrada: consultar_iie (iie-leitura)"]
