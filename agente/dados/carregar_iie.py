"""Carrega os dados do IIE, os indicadores, a base de práticas e os alertas no esquema `iie` do Supabase.

Uso (a partir de agente/):
    python -m dados.carregar_iie --database-url "$DATABASE_URL_CARGA" --responsavel "nome"
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import unicodedata
from pathlib import Path

import psycopg

from dados.conferir_catalogo import citacoes

AGENTE = Path(__file__).resolve().parents[1]
ANEXOS = AGENTE.parent / "contexto" / "anexos"
SEEDS = Path(__file__).resolve().parent / "seeds"

FONTE_OFICIAL = "Fernandes, Felicio e Saad (2024), Tabela 7"
FONTE_REPRODUCAO = "Reprodução a partir das bases do IIE (contexto/anexos/iie_uf_reproducao.csv)"
FONTE_PAINEL = "Painel do IIE (Lupa Social), consultado em 10/11/2026"
FONTE_PAINEL_COMPONENTES = (FONTE_PAINEL + "; P1, F2, F1 e A1 derivados do que o painel publica; "
                            "A2 e básico por trajetória: reprodução a partir do SAEB")
ETAPAS = ("AI", "AF", "EM")


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return sem_acento.strip().lower()


def _ler_csv(caminho: Path) -> list[dict[str, str]]:
    with open(caminho, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def ler_territorios(caminho: Path) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        sinonimos = [normalizar(s) for s in r["sinonimos"].split("|") if s.strip()]
        linhas.append((r["id"], r["tipo"], r["codigo_ibge"], r["sigla"], r["nome"], r["regiao"], sinonimos))
    return linhas


def ler_oficial(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        territorio = id_por_sigla[r["uf_sigla"]]
        for coluna, valor in r.items():
            if coluna == "uf_sigla" or valor == "":
                continue
            etapa, ano = coluna.split("_")
            if etapa not in ETAPAS:
                raise ValueError(f"coluna inesperada: {coluna}")
            linhas.append((territorio, int(ano), etapa, float(valor), FONTE_OFICIAL))
    return linhas


def ler_painel(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    """IIE do Ensino Médio publicado no painel do IIE (contexto/anexos/iie_uf_painel_2015_2023.csv)."""
    return [(id_por_sigla[r["uf_sigla"]], int(r["ano"]), "EM", float(r["iie"]), FONTE_PAINEL)
            for r in _ler_csv(caminho)]


def ler_componentes(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    """Decomposição por método. No método "painel", o que não é publicado nem calculável vem vazio (None)."""
    def num(valor: str) -> float | None:
        return float(valor) if valor != "" else None

    linhas = []
    for r in _ler_csv(caminho):
        painel = r["metodo"] == "painel"
        linhas.append((
            id_por_sigla[r["uf_sigla"]], int(r["ano"]), r["metodo"], painel, float(r["IIE"]),
            num(r["pct_adiantado"]), num(r["pct_em_linha"]), num(r["pct_atrasado1"]),
            float(r["pct_atrasado2"]), float(r["pct_fora_escola"]), float(r["pct_concluiu_ate18"]),
            float(r["pct_basico_entre_concluintes"]), num(r["p_basico_adiantado"]),
            num(r["p_basico_em_linha"]), num(r["p_basico_atrasado1"]), num(r["coorte_ajustada"]),
            FONTE_PAINEL_COMPONENTES if painel else FONTE_REPRODUCAO,
        ))
    return linhas


def ler_matriz(caminho: Path) -> tuple[list[tuple], list[tuple]]:
    praticas: dict[str, tuple] = {}
    vinculos = []
    for ordem, r in enumerate(_ler_csv(caminho)):
        if r["indicador_id"] == "BASE":
            continue
        pratica = (r["pratica_id"], r["fonte"], r["documento"], r["linhas"])
        anterior = praticas.setdefault(r["pratica_id"], pratica)
        if anterior != pratica:
            raise ValueError(f"prática {r['pratica_id']} com fonte ou linhas divergentes: {anterior} x {pratica}")
        vinculos.append((r["indicador_id"], r["pratica_id"], r["nivel"], r["papel"], r["pratica"], r["o_que_fazer"], ordem))
    return list(praticas.values()), vinculos


def ler_catalogo(caminho: Path) -> list[tuple]:
    """Catálogo completo de práticas (contexto/anexos/catalogo_praticas.csv)."""
    return [(r["id"], r["fonte"], r["documento"], r["linhas"], r["nivel"], r["secao"], r["nome"], r["descricao"],
             [a for a in r["alavancas"].split("|") if a]) for r in _ler_csv(caminho)]


def ler_precondicoes(caminho_matriz: Path) -> tuple[list[tuple], list[tuple]]:
    """Pré-condições: linhas BASE da matriz, no formato "o que garantir — práticas citadas com linhas"."""
    precondicoes, vinculos = [], []
    for r in _ler_csv(caminho_matriz):
        if r["indicador_id"] != "BASE":
            continue
        precondicao_id = normalizar(r["pratica"]).split()[0]  # "Liderança escolar" -> "lideranca"
        texto, _, referencias = r["o_que_fazer"].partition(" — ")
        precondicoes.append((precondicao_id, r["pratica"], texto.strip(), len(precondicoes) + 1))
        citadas = list(dict.fromkeys(pid for pid, _ in citacoes(referencias)))
        vinculos.extend((precondicao_id, pid, ordem) for ordem, pid in enumerate(citadas, start=1))
    return precondicoes, vinculos


def ler_perfis(caminho: Path, indicadores: set[str]) -> tuple[list[tuple], list[tuple]]:
    """Pacotes por perfil de território (doc 09 §7). A sequência usa IDs de indicador ou "base" (pré-condições)."""
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    for d in dados:
        invalidos = set(d["sequencia"]) - indicadores - {"base"}
        if invalidos:
            raise ValueError(f"perfil {d['id']}: sequência com indicadores desconhecidos {sorted(invalidos)}")
    perfis = [(d["id"], d["nome"], d["criterio"], d["sequencia"], d["descricao"], ordem)
              for ordem, d in enumerate(dados, start=1)]
    vinculos = [(d["id"], pid, ordem) for d in dados for ordem, pid in enumerate(d["praticas"], start=1)]
    return perfis, vinculos


def ler_lacunas(caminho: Path, indicadores: set[str]) -> list[tuple]:
    """Lacunas dos referenciais em relação ao IIE (doc 09 §8)."""
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    for d in dados:
        if not d["indicadores"] or not set(d["indicadores"]) <= indicadores:
            raise ValueError(f"lacuna {d['id']}: indicadores inválidos {d['indicadores']}")
    return [(d["id"], d["tema"], d["cobertura"], d["complemento"], d["indicadores"], ordem)
            for ordem, d in enumerate(dados, start=1)]


def ler_indicadores(caminho: Path) -> list[tuple]:
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    return [(d["id"], d["nome"], d["grupo"], d["pergunta"], d["metrica"], d["sentido"], d["gatilho_atencao"],
             d["gatilho_critico"], d["significado"], d["diagnostico"], d["monitorar"], d["horizonte"]) for d in dados]


def ler_alertas(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        territorio = id_por_sigla[r["sigla"]] if r["sigla"] else None
        ano = int(r["ano"]) if r["ano"] else None
        linhas.append((territorio, ano, r["indicador_id"] or None, r["natureza"], r["severidade"], r["texto"]))
    return linhas


def _hash_arquivos(caminhos: list[Path]) -> str:
    h = hashlib.sha256()
    for c in caminhos:
        h.update(c.read_bytes())
    return h.hexdigest()


def carregar(conn: psycopg.Connection, responsavel: str, anexos: Path = ANEXOS, seeds: Path = SEEDS) -> dict[str, int]:
    arquivos = {
        "territorios": seeds / "territorios.csv",
        "indicadores": seeds / "indicadores.json",
        "alertas": seeds / "alertas.csv",
        "oficial": anexos / "iie_uf_oficial_2013_2019.csv",
        "painel": anexos / "iie_uf_painel_2015_2023.csv",
        "componentes": anexos / "iie_uf_reproducao.csv",
        "matriz": anexos / "matriz_indicador_pratica.csv",
        "catalogo": anexos / "catalogo_praticas.csv",
        "perfis": seeds / "perfis.json",
        "lacunas": seeds / "lacunas.json",
    }
    territorios = ler_territorios(arquivos["territorios"])
    id_por_sigla = {t[3]: t[0] for t in territorios}
    # O painel substitui a Tabela 7 no EM dos anos que publica; a Tabela 7 fica para 2013 e para AI e AF.
    oficial = list({r[:3]: r for r in ler_oficial(arquivos["oficial"], id_por_sigla)
                    + ler_painel(arquivos["painel"], id_por_sigla)}.values())
    componentes = ler_componentes(arquivos["componentes"], id_por_sigla)
    _, vinculos = ler_matriz(arquivos["matriz"])
    praticas = ler_catalogo(arquivos["catalogo"])
    indicadores = ler_indicadores(arquivos["indicadores"])
    ids_indicador = {i[0] for i in indicadores}
    precondicoes, vinculos_precondicao = ler_precondicoes(arquivos["matriz"])
    perfis, vinculos_perfil = ler_perfis(arquivos["perfis"], ids_indicador)
    lacunas = ler_lacunas(arquivos["lacunas"], ids_indicador)
    alertas = ler_alertas(arquivos["alertas"], id_por_sigla)

    with conn.transaction(), conn.cursor() as cur:
        cur.executemany(
            """insert into iie.territorio (id, tipo, codigo_ibge, sigla, nome, regiao, sinonimos)
               values (%s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set tipo = excluded.tipo, codigo_ibge = excluded.codigo_ibge,
                 sigla = excluded.sigla, nome = excluded.nome, regiao = excluded.regiao, sinonimos = excluded.sinonimos""",
            territorios)
        cur.executemany(
            """insert into iie.resultado_oficial (territorio_id, ano, etapa, valor, fonte) values (%s, %s, %s, %s, %s)
               on conflict (territorio_id, ano, etapa) do update set valor = excluded.valor, fonte = excluded.fonte""",
            oficial)
        cur.executemany(
            """insert into iie.componente (territorio_id, ano, metodo, oficial, iie_reproduzido, pct_adiantado,
                 pct_em_linha, pct_atrasado1, pct_atrasado2, pct_fora_escola, pct_concluiu_ate18,
                 pct_basico_entre_concluintes, p_basico_adiantado, p_basico_em_linha, p_basico_atrasado1,
                 coorte_ajustada, fonte)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               on conflict (territorio_id, ano, metodo) do update set oficial = excluded.oficial,
                 iie_reproduzido = excluded.iie_reproduzido, pct_adiantado = excluded.pct_adiantado,
                 pct_em_linha = excluded.pct_em_linha, pct_atrasado1 = excluded.pct_atrasado1,
                 pct_atrasado2 = excluded.pct_atrasado2, pct_fora_escola = excluded.pct_fora_escola,
                 pct_concluiu_ate18 = excluded.pct_concluiu_ate18,
                 pct_basico_entre_concluintes = excluded.pct_basico_entre_concluintes,
                 p_basico_adiantado = excluded.p_basico_adiantado, p_basico_em_linha = excluded.p_basico_em_linha,
                 p_basico_atrasado1 = excluded.p_basico_atrasado1, coorte_ajustada = excluded.coorte_ajustada,
                 fonte = excluded.fonte""",
            componentes)
        for tabela in ("indicador_pratica", "precondicao_pratica", "perfil_pratica", "alerta_dado",
                       "precondicao", "perfil_territorio", "lacuna"):
            cur.execute(f"delete from iie.{tabela}")
        cur.execute("delete from iie.pratica where id <> all(%s)", ([p[0] for p in praticas],))
        cur.executemany(
            """insert into iie.indicador (id, nome, grupo, pergunta, metrica, sentido, gatilho_atencao, gatilho_critico,
                 significado, diagnostico, monitorar, horizonte)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set nome = excluded.nome, grupo = excluded.grupo, pergunta = excluded.pergunta,
                 metrica = excluded.metrica, sentido = excluded.sentido, gatilho_atencao = excluded.gatilho_atencao,
                 gatilho_critico = excluded.gatilho_critico, significado = excluded.significado,
                 diagnostico = excluded.diagnostico, monitorar = excluded.monitorar, horizonte = excluded.horizonte""",
            indicadores)
        cur.executemany(
            """insert into iie.pratica (id, fonte, documento, linhas, nivel, secao, nome, descricao, alavancas)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set fonte = excluded.fonte, documento = excluded.documento,
                 linhas = excluded.linhas, nivel = excluded.nivel, secao = excluded.secao, nome = excluded.nome,
                 descricao = excluded.descricao, alavancas = excluded.alavancas""",
            praticas)
        cur.executemany("insert into iie.precondicao (id, nome, o_que_garantir, ordem) values (%s, %s, %s, %s)",
                        precondicoes)
        cur.executemany("insert into iie.precondicao_pratica (precondicao_id, pratica_id, ordem) values (%s, %s, %s)",
                        vinculos_precondicao)
        cur.executemany("""insert into iie.perfil_territorio (id, nome, criterio, sequencia, descricao, ordem)
                           values (%s, %s, %s, %s, %s, %s)""", perfis)
        cur.executemany("insert into iie.perfil_pratica (perfil_id, pratica_id, ordem) values (%s, %s, %s)",
                        vinculos_perfil)
        cur.executemany("""insert into iie.lacuna (id, tema, cobertura, complemento, indicadores, ordem)
                           values (%s, %s, %s, %s, %s, %s)""", lacunas)
        cur.executemany(
            """insert into iie.indicador_pratica (indicador_id, pratica_id, nivel, papel, nome, o_que_fazer, ordem)
               values (%s, %s, %s, %s, %s, %s, %s)""",
            vinculos)
        cur.executemany(
            """insert into iie.alerta_dado (territorio_id, ano, indicador_id, natureza, severidade, texto)
               values (%s, %s, %s, %s, %s, %s)""",
            alertas)
        contagem = {"territorios": len(territorios), "resultados_oficiais": len(oficial),
                    "componentes": len(componentes), "indicadores": len(indicadores), "praticas": len(praticas),
                    "vinculos": len(vinculos), "alertas": len(alertas), "precondicoes": len(precondicoes),
                    "vinculos_precondicao": len(vinculos_precondicao), "perfis": len(perfis),
                    "vinculos_perfil": len(vinculos_perfil), "lacunas": len(lacunas)}
        cur.execute("insert into iie.carga (hash, linhas, responsavel) values (%s, %s, %s)",
                    (_hash_arquivos(list(arquivos.values())), json.dumps(contagem), responsavel))
    return contagem


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--responsavel", required=True)
    args = parser.parse_args(argv)
    with psycopg.connect(args.database_url) as conn:
        print(json.dumps(carregar(conn, args.responsavel), ensure_ascii=False))


if __name__ == "__main__":
    main()
