"""Carrega os dados do IIE, os indicadores, as práticas e os alertas no esquema `iie` do Supabase.

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

AGENTE = Path(__file__).resolve().parents[1]
ANEXOS = AGENTE.parent / "contexto" / "anexos"
SEEDS = Path(__file__).resolve().parent / "seeds"

FONTE_OFICIAL = "Fernandes, Felicio e Saad (2024), Tabela 7"
FONTE_REPRODUCAO = "Reprodução a partir das bases do IIE (contexto/anexos/iie_uf_reproducao.csv)"
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


def ler_componentes(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        linhas.append((
            id_por_sigla[r["uf_sigla"]], int(r["ano"]), r["metodo"], False, float(r["IIE"]),
            float(r["pct_adiantado"]), float(r["pct_em_linha"]), float(r["pct_atrasado1"]),
            float(r["pct_atrasado2"]), float(r["pct_fora_escola"]), float(r["pct_concluiu_ate18"]),
            float(r["pct_basico_entre_concluintes"]), float(r["p_basico_adiantado"]),
            float(r["p_basico_em_linha"]), float(r["p_basico_atrasado1"]), float(r["coorte_ajustada"]),
            FONTE_REPRODUCAO,
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
        "componentes": anexos / "iie_uf_reproducao.csv",
        "matriz": anexos / "matriz_indicador_pratica.csv",
    }
    territorios = ler_territorios(arquivos["territorios"])
    id_por_sigla = {t[3]: t[0] for t in territorios}
    oficial = ler_oficial(arquivos["oficial"], id_por_sigla)
    componentes = ler_componentes(arquivos["componentes"], id_por_sigla)
    praticas, vinculos = ler_matriz(arquivos["matriz"])
    indicadores = ler_indicadores(arquivos["indicadores"])
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
        cur.execute("delete from iie.indicador_pratica")
        cur.execute("delete from iie.alerta_dado")
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
            """insert into iie.pratica (id, fonte, documento, linhas) values (%s, %s, %s, %s)
               on conflict (id) do update set fonte = excluded.fonte, documento = excluded.documento, linhas = excluded.linhas""",
            praticas)
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
                    "vinculos": len(vinculos), "alertas": len(alertas)}
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
