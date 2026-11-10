"""Monta os workflows do n8n do IIE Conselheiro a partir das partes versionadas (proposta 03, §5).

As partes: o prompt (n8n/prompt/sistema.md), o código dos nós Code (n8n/codigo/*.js, testado com node --test) e a
tabela de ferramentas abaixo. O JSON gerado é o que n8n/publicar.sh publica; os testes conferem que ele está em dia.

Uso (a partir de agente/):
    python -m n8n.montar                          grava n8n/iie-agente-web.json e n8n/iie-erros.json
    python -m n8n.montar --teste-erro ARQUIVO     grava a variante com a credencial da Anthropic inválida
"""
from __future__ import annotations

import argparse
import json
import uuid
from dataclasses import dataclass
from pathlib import Path

PASTA = Path(__file__).resolve().parent
WEBHOOK = "$('Webhook').first().json.body"
NOME_AGENTE = "IIE Conselheiro — agente web"
NOME_ERROS = "IIE Conselheiro — erros"
MODELO = "claude-opus-5-5"
VERSAO_AGENTE = 3.1  # a 2.2 também entrega de uma vez a resposta que vem depois da ferramenta (P2, Tarefa 1)
_NS = uuid.UUID("6f1c1d2e-0000-4000-8000-000000000000")  # ids de nó e de webhook fixos: JSON determinístico


@dataclass(frozen=True)
class Parametro:
    chave: str
    descricao: str
    tipo: str  # tipo do $fromAI: "string", "number" ou "json"


@dataclass(frozen=True)
class Ferramenta:
    nome: str
    descricao: str
    sql: str
    parametros: tuple[Parametro, ...]
    usa_ufs: bool  # o último parâmetro do SQL é a lista de UFs do webhook, nunca do modelo


_TERRITORIO = Parametro("territorio", "Sigla, nome ou gentílico da UF, ou Brasil", "string")
_INDICADOR = Parametro("indicador", "Um de: IIE, P1, F1, F2, A1, A2, E1, E2, E2R, E3", "string")
_ANO = Parametro("ano", "2013, 2015, 2017 ou 2019", "number")
_NIVEL = Parametro("nivel", "todos, Escola, Secretaria ou Estrategico", "string")

FERRAMENTAS: tuple[Ferramenta, ...] = (
    Ferramenta(
        "buscar_praticas",
        "Busca no catálogo de 541 práticas de gestão (MEC, Itaú Social e TPE) as até 10 mais parecidas com o termo, "
        "por busca textual em português. Para cada uma: id, nome, descrição, fonte, seção do documento, linhas e "
        "indicadores a que está vinculada.",
        "select iie.fn_buscar_praticas($1, nullif($2, 'todas'), nullif($3, 'todos')) as resultado",
        (Parametro("termo", "O que procurar, em português (ex.: busca ativa, recomposição da aprendizagem)", "string"),
         Parametro("fonte", "todas, MEC, Itaú Social ou TPE", "string"),
         _NIVEL),
        False,
    ),
    Ferramenta(
        "comparar_territorios",
        "Compara de 2 a 6 territórios num indicador e ano, com o Brasil como referência. "
        "E2R = razão IIE-AF ÷ IIE-AI; E3 = razão IIE-EM ÷ IIE-AF.",
        "select iie.fn_comparar(array(select trim(x) from unnest(string_to_array($1, ',')) as x), $2, $3::int, "
        "$4::text[]) as resultado",
        (Parametro("territorios", "De 2 a 6 territórios separados por vírgula (siglas, nomes ou gentílicos das UFs, "
                                  "ou Brasil), ex.: CE, PE", "string"),
         _INDICADOR,
         _ANO),
        True,
    ),
    Ferramenta(
        "consultar_iie",
        "Série oficial do IIE de um território (2013 a 2019), posição entre as UFs e valor do Brasil. "
        "Use para qualquer valor oficial do IIE.",
        "select iie.fn_consultar_iie($1, $2, $3::text[]) as resultado",
        (_TERRITORIO,
         Parametro("etapa", "EM (Ensino Médio), AF ou AI; use EM se a pessoa não disser", "string")),
        True,
    ),
    Ferramenta(
        "decompor_iie",
        "Decompõe o IIE de um território em evasão (P1), retenção 2+ anos (F2), conclusão no tempo (F1) e "
        "aprendizagem (A1, A2), com semáforo, ganho potencial, prioridade e alertas de dado.",
        "select iie.fn_decompor($1, $2::int, $3::text[]) as resultado",
        (_TERRITORIO,
         Parametro("ano", "2015, 2017 ou 2019; use 2019 se a pessoa não disser", "number")),
        True,
    ),
    Ferramenta(
        "pacote_por_perfil",
        "Pacote de práticas para um perfil de território: nome e critério do perfil, sequência de indicadores "
        "recomendada, práticas do pacote e as pré-condições da base comum com suas práticas. Escolha o perfil pela "
        "prioridade e pelo semáforo de decompor_iie.",
        "select iie.fn_pacote($1) as resultado",
        (Parametro("perfil", "Um de: fluxo, aprendizagem, duplo, evasao, perda_em, dado", "string"),),
        False,
    ),
    Ferramenta(
        "praticas_para_indicador",
        "Práticas de gestão recomendadas para melhorar um indicador (referenciais MEC, Itaú Social e Todos Pela "
        "Educação), com perguntas de diagnóstico, o que monitorar, fonte com linhas e as lacunas dos referenciais "
        "para o indicador.",
        "select iie.fn_praticas($1, nullif($2, 'todos'), nullif($3, 'todos')) as resultado",
        (Parametro("indicador", "Um de: P1, F2, F1, A1, A2, A3, E1, E2, E3, Q1, D1", "string"),
         _NIVEL,
         Parametro("papel", "todos, nucleo ou complementar", "string")),
        False,
    ),
    Ferramenta(
        "ranking",
        "Ranking das UFs num indicador e ano, do melhor para o pior, com semáforo. Mostra só as UFs liberadas para "
        "a pessoa, com a posição nacional.",
        "select iie.fn_ranking($1, $2::int, nullif($3, 'todas'), $4::int, $5::text[]) as resultado",
        (_INDICADOR,
         _ANO,
         Parametro("regiao", "todas, Norte, Nordeste, Sudeste, Sul ou Centro-Oeste", "string"),
         Parametro("limite", "Quantas posições devolver, de 1 a 27", "number")),
        True,
    ),
)


def query_replacement(f: Ferramenta) -> str:
    """Uma expressão que devolve um array: o n8n passa cada elemento como um $n, sem espalhar a lista de UFs."""
    valores = [f"$fromAI('{p.chave}', '{p.descricao}', '{p.tipo}')" for p in f.parametros]
    if f.usa_ufs:
        valores.append(f"{WEBHOOK}.ufs_permitidas")
    return "={{ [ " + ", ".join(valores) + " ] }}"


def mensagem_de_sistema() -> str:
    """Regras fixas e a base ativa: nada do pedido entra aqui, para o prefixo do cache não mudar entre usuários."""
    regras = (PASTA / "prompt" / "sistema.md").read_text(encoding="utf-8").rstrip("\n")
    return "=" + regras + "\n\n# Base de conhecimento\n\n{{ $('base-ativa').first().json.conteudo }}"


def texto_do_usuario() -> str:
    """Bloco <contexto> (perfil, UF padrão, UFs liberadas, município, data) e a pergunta (proposta 03, §5.3)."""
    b = WEBHOOK
    return ("={{ '<contexto>perfil: ' + " + b + ".perfil + ' · UF padrão: ' + " + b + ".uf"
            " + ' · UFs liberadas: ' + " + b + ".ufs_permitidas.join(', ') + ' · município: ' + " + b + ".municipio"
            " + ' · data: ' + " + b + ".data_referencia + '</contexto>\\n\\n' + " + b + ".mensagem }}")


# --- SQL dos nós de operação (credencial iie-operacao) ----------------------------------------------------------

SQL_GRAVA_PERGUNTA = "insert into app.mensagem (conversa_id, papel, texto) values ($1::uuid, 'usuario', $2) returning id"
# Sempre uma linha, mesmo sem base ativa: o workflow não para no meio.
SQL_BASE_ATIVA = ("select coalesce(max(versao), 'sem-base') as versao, coalesce(max(conteudo), '') as conteudo "
                  "from app.kb_versao where ativa")
# Resultados de ferramentas de perguntas anteriores (a memória do agente 3.1 grava as mensagens de ferramenta).
SQL_SAIDAS_DA_CONVERSA = ("select coalesce(jsonb_agg(message->'data'->>'content' order by id), '[]'::jsonb) as saidas "
                          "from agente.memoria where session_id = $1 and message->>'type' = 'tool'")
SQL_GRAVA_RESPOSTA = ("insert into app.mensagem (conversa_id, papel, texto, ferramentas, numeros_sem_origem, "
                      "praticas_sem_origem, latencia_ms, modelo, kb_versao, erro) values ($1::uuid, 'agente', $2, "
                      "$3::jsonb, $4::jsonb, $5::jsonb, $6::int, $7, $8, $9) returning id")
SQL_GRAVA_FALHA = "insert into app.falha (execucao, workflow, no, mensagem) values ($1, $2, $3, $4) returning id"


# --- Montagem -----------------------------------------------------------------------------------------------------

def _credencial(tipo: str, nome: str) -> dict:
    return {tipo: {"id": nome, "name": nome}}  # resolvida pelo nome quando o workflow é criado ou atualizado


def _no(nome: str, tipo: str, versao: float, posicao: tuple[int, int], parametros: dict, **extra) -> dict:
    return {"id": str(uuid.uuid5(_NS, nome)), "name": nome, "type": tipo, "typeVersion": versao,
            "position": list(posicao), "parameters": parametros, **extra}


def _postgres(nome: str, posicao: tuple[int, int], sql: str, valores: list[str] | None = None, **extra) -> dict:
    opcoes = {"queryReplacement": "={{ [ " + ", ".join(valores) + " ] }}"} if valores else {}
    return _no(nome, "n8n-nodes-base.postgres", 2.6, posicao,
               {"operation": "executeQuery", "query": sql, "options": opcoes},
               credentials=_credencial("postgres", "iie-operacao"), **extra)


def _codigo(nome: str, posicao: tuple[int, int], arquivo: str, cola: str) -> dict:
    js = (PASTA / "codigo" / arquivo).read_text(encoding="utf-8")
    return _no(nome, "n8n-nodes-base.code", 2, posicao, {"jsCode": js + "\n" + cola})


def _ligar(*destinos: str) -> list[dict]:
    return [{"node": d, "type": "main", "index": 0} for d in destinos]


def workflow_agente(*, nome: str = NOME_AGENTE, caminho: str = "iie-chat",
                    credencial_anthropic: str = "anthropic-iie") -> dict:
    """Workflow iie-agente-web (proposta 03, §5.2), no formato aceito por POST /api/v1/workflows."""
    b = WEBHOOK
    registro = "return [{ json: { ...registro, kb_versao: $('base-ativa').first().json.versao } }];"
    nos = [
        _no("Webhook", "n8n-nodes-base.webhook", 2.2, (0, 0),
            {"httpMethod": "POST", "path": caminho, "authentication": "headerAuth", "responseMode": "streaming",
             "options": {}},
            webhookId=str(uuid.uuid5(_NS, "webhook:" + caminho)),
            credentials=_credencial("httpHeaderAuth", "iie-chave-site")),
        _codigo("validar-pedido", (220, 0), "validar_pedido.js",
                "validarPedido($input.first().json.body);\nreturn [{ json: { inicio: Date.now() } }];"),
        _postgres("grava-pergunta", (440, 0), SQL_GRAVA_PERGUNTA, [f"{b}.conversa_id", f"{b}.mensagem"]),
        _postgres("base-ativa", (660, 0), SQL_BASE_ATIVA),
        _no("AI Agent", "@n8n/n8n-nodes-langchain.agent", VERSAO_AGENTE, (880, 0),
            {"promptType": "define", "text": texto_do_usuario(), "hasOutputParser": False, "needsFallback": False,
             "options": {"systemMessage": mensagem_de_sistema(), "maxIterations": 6, "returnIntermediateSteps": True,
                         "enableStreaming": True}},
            onError="continueErrorOutput"),
        _no("Anthropic Chat Model", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.6, (700, 260),
            {"model": {"__rl": True, "mode": "id", "value": MODELO},
             "options": {"maxTokensToSample": 16000, "thinkingMode": "adaptive", "effort": "medium",
                         "promptCaching": "5m"}},
            credentials=_credencial("anthropicApi", credencial_anthropic)),
        _no("Postgres Chat Memory", "@n8n/n8n-nodes-langchain.memoryPostgresChat", 1.4, (880, 260),
            {"sessionIdType": "customKey", "sessionKey": f"={{{{ {b}.conversa_id }}}}",
             "tableName": "agente.memoria", "contextWindowLength": 10},
            credentials=_credencial("postgres", "iie-operacao")),
        *[_no(f.nome, "n8n-nodes-base.postgresTool", 2.8, (1060 + 180 * i, 260),
              {"descriptionType": "manual", "toolDescription": f.descricao, "resource": "database",
               "operation": "executeQuery", "query": f.sql, "options": {"queryReplacement": query_replacement(f)}},
              credentials=_credencial("postgres", "iie-leitura"))
          for i, f in enumerate(FERRAMENTAS)],
        _postgres("saidas-da-conversa", (1100, -120), SQL_SAIDAS_DA_CONVERSA, [f"{b}.conversa_id"],
                  alwaysOutputData=True),
        _codigo("rastreabilidade", (1320, -120), "rastreabilidade.js",
                "const registro = registroDaResposta($('AI Agent').first().json, $input.first().json.saidas, "
                "$('validar-pedido').first().json.inicio, Date.now());\n" + registro),
        _codigo("erro-agente", (1320, 120), "rastreabilidade.js",
                "const registro = registroDeErro($input.first().json.error, $('validar-pedido').first().json.inicio, "
                "Date.now());\n" + registro),
        _postgres("grava-resposta", (1540, 0), SQL_GRAVA_RESPOSTA,
                  [f"{b}.conversa_id", "$json.texto", "JSON.stringify($json.ferramentas)",
                   "JSON.stringify($json.numeros_sem_origem)", "JSON.stringify($json.praticas_sem_origem)",
                   "$json.latencia_ms", f"'{MODELO}'", "$json.kb_versao", "$json.erro"]),
    ]
    conexoes = {
        "Webhook": {"main": [_ligar("validar-pedido")]},
        "validar-pedido": {"main": [_ligar("grava-pergunta")]},
        "grava-pergunta": {"main": [_ligar("base-ativa")]},
        "base-ativa": {"main": [_ligar("AI Agent")]},
        "AI Agent": {"main": [_ligar("saidas-da-conversa"), _ligar("erro-agente")]},
        "saidas-da-conversa": {"main": [_ligar("rastreabilidade")]},
        "rastreabilidade": {"main": [_ligar("grava-resposta")]},
        "erro-agente": {"main": [_ligar("grava-resposta")]},
        "Anthropic Chat Model": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]},
        "Postgres Chat Memory": {"ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]]},
        **{f.nome: {"ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]} for f in FERRAMENTAS},
    }
    return {"name": nome, "nodes": nos, "connections": conexoes,
            "settings": {"executionOrder": "v1", "saveDataSuccessExecution": "all", "saveDataErrorExecution": "all",
                         "errorWorkflow": NOME_ERROS}}  # o publicar.sh troca o nome pelo id


def workflow_erros() -> dict:
    """Workflow iie-erros: grava em app.falha as falhas não tratadas do agente."""
    nos = [
        _no("Error Trigger", "n8n-nodes-base.errorTrigger", 1, (0, 0), {}),
        _postgres("grava-falha", (220, 0), SQL_GRAVA_FALHA,
                  ["$json.execution.id", "$json.workflow.name", "$json.execution.lastNodeExecuted",
                   "$json.execution.error.message"]),
    ]
    return {"name": NOME_ERROS, "nodes": nos, "connections": {"Error Trigger": {"main": [_ligar("grava-falha")]}},
            "settings": {"executionOrder": "v1"}}


def _gravar(caminho: Path, workflow: dict) -> None:
    caminho.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"gravado: {caminho}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--teste-erro", metavar="ARQUIVO", type=Path,
                        help="grava a variante com a credencial anthropic-iie-invalida (P2, Tarefa 6)")
    args = parser.parse_args(argv)
    if args.teste_erro:
        _gravar(args.teste_erro, workflow_agente(nome="IIE Conselheiro — teste de erro", caminho="iie-chat-teste-erro",
                                                 credencial_anthropic="anthropic-iie-invalida"))
        return
    _gravar(PASTA / "iie-agente-web.json", workflow_agente())
    _gravar(PASTA / "iie-erros.json", workflow_erros())


if __name__ == "__main__":
    main()
