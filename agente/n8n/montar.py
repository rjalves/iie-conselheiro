"""Monta os workflows do n8n do IIE Conselheiro a partir das partes versionadas (proposta 03, §5).

As partes: o prompt (n8n/prompt/sistema.md), o código dos nós Code (n8n/codigo/*.js, testado com node --test) e a
tabela de ferramentas abaixo. O JSON gerado é o que n8n/publicar.sh publica; os testes conferem que ele está em dia.

Uso (a partir de agente/):
    python -m n8n.montar                          grava n8n/iie-agente-web.json e n8n/iie-erros.json
    python -m n8n.montar --teste-erro ARQUIVO     grava a variante com a credencial da Anthropic inválida
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PASTA = Path(__file__).resolve().parent
WEBHOOK = "$('Webhook').first().json.body"


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
