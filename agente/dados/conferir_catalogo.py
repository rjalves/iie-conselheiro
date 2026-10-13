"""Confere o catálogo de práticas (contexto/anexos/catalogo_praticas.csv) contra as âncoras da matriz e do doc 09.

Uso (a partir de agente/):
    python -m dados.conferir_catalogo [CATALOGO.csv ...] [--serie PE]

Sai com código 1 se houver erro. Totais diferentes dos esperados são só avisos (decisão do especialista).
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CATALOGO = RAIZ / "contexto" / "anexos" / "catalogo_praticas.csv"
MATRIZ = RAIZ / "contexto" / "anexos" / "matriz_indicador_pratica.csv"
DOC09 = RAIZ / "contexto" / "09_indicadores_iie_e_praticas_de_gestao.md"

COLUNAS = ["id", "fonte", "documento", "nivel", "secao", "nome", "descricao", "linhas", "alavancas"]
ALAVANCAS = {"acesso", "fluxo", "aprendizagem", "equidade", "dados", "estruturantes"}
SERIES = {  # série: (fonte, documento, nível, total esperado)
    "GE": ("MEC", "boas-praticas/referencial-gestao-escolar-mec.md", "Escola", 279),
    "GE-SEC": ("MEC", "boas-praticas/referencial-gestao-escolar-mec.md", "Secretaria", 93),
    "SM": ("Itaú Social", "boas-praticas/031_Secretaria Municipal de Educação_Práticas para uma boa gestão.md",
           "Secretaria", 117),
    "PE": ("TPE", "boas-praticas/planejamento-estrategico-de-uma-secretaria-de-educacao.md", "Estratégico", 52),
}
RE_ID = re.compile(r"^(GE-SEC|GE|SM|PE)-(\d{2,3})$")
RE_LINHAS = re.compile(r"^L(\d+)(?:–(\d+))?$")
RE_ANCORA_DOC09 = re.compile(r"\b((?:GE-SEC|GE|SM|PE)-\d+) \((?:MEC|Itaú|TPE) (L\d+(?:–\d+)?)\)")


def serie(pratica_id: str) -> str:
    m = RE_ID.match(pratica_id)
    if not m:
        raise ValueError(f"id inválido: {pratica_id}")
    return m.group(1)


def intervalo(linhas: str) -> tuple[int, int]:
    m = RE_LINHAS.match(linhas)
    if not m:
        raise ValueError(f"linhas inválidas: {linhas!r} (use L123 ou L123–130, com travessão –)")
    ini = int(m.group(1))
    fim = int(m.group(2) or ini)
    if fim < ini:
        raise ValueError(f"linhas invertidas: {linhas}")
    return ini, fim


def ler_ancoras(matriz: Path = MATRIZ, doc09: Path = DOC09) -> dict[str, tuple[int, int]]:
    """IDs já usados na matriz e no doc 09, com o intervalo de linhas em que precisam cair."""
    ancoras: dict[str, tuple[int, int]] = {}
    with open(matriz, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["pratica_id"] != "—":
                ancoras[r["pratica_id"]] = intervalo(r["linhas"])
    for m in RE_ANCORA_DOC09.finditer(doc09.read_text(encoding="utf-8")):
        ancoras.setdefault(m.group(1), intervalo(m.group(2)))
    return ancoras


def ler_catalogo(caminhos: list[Path]) -> list[dict[str, str]]:
    linhas: list[dict[str, str]] = []
    for caminho in caminhos:
        with open(caminho, newline="", encoding="utf-8") as f:
            leitor = csv.DictReader(f)
            if leitor.fieldnames != COLUNAS:
                raise ValueError(f"{caminho}: colunas {leitor.fieldnames}, esperado {COLUNAS}")
            linhas.extend(leitor)
    return linhas


def conferir(catalogo: list[dict[str, str]], ancoras: dict[str, tuple[int, int]],
             series: list[str] | None = None) -> tuple[list[str], list[str]]:
    """Devolve (erros, avisos). `series` limita a conferência (útil para conferir uma série por vez)."""
    series = series or list(SERIES)
    erros: list[str] = []
    avisos: list[str] = []
    por_serie: dict[str, list[tuple[int, dict[str, str]]]] = {s: [] for s in series}
    vistos: set[str] = set()

    for r in catalogo:
        pid = r["id"]
        try:
            s = serie(pid)
            ini, fim = intervalo(r["linhas"])
        except ValueError as e:
            erros.append(str(e))
            continue
        if s not in por_serie:
            continue
        if pid in vistos:
            erros.append(f"{pid}: id repetido")
        vistos.add(pid)
        numero = int(RE_ID.match(pid).group(2))
        if pid != f"{s}-{numero:02d}":
            erros.append(f"{pid}: use 2 dígitos no mínimo, sem zeros a mais ({s}-{numero:02d})")
        fonte, documento, nivel, _ = SERIES[s]
        if (r["fonte"], r["documento"], r["nivel"]) != (fonte, documento, nivel):
            erros.append(f"{pid}: fonte/documento/nível devem ser {fonte} / {documento} / {nivel}")
        for campo, limite in (("secao", 200), ("nome", 120), ("descricao", 500)):
            if not r[campo].strip():
                erros.append(f"{pid}: {campo} vazio")
            elif len(r[campo]) > limite:
                erros.append(f"{pid}: {campo} com mais de {limite} caracteres")
        alavancas = set(r["alavancas"].split("|")) if r["alavancas"] else set()
        if not alavancas or not alavancas <= ALAVANCAS:
            erros.append(f"{pid}: alavancas {r['alavancas']!r} fora de {sorted(ALAVANCAS)}")
        por_serie[s].append((numero, r | {"_ini": ini, "_fim": fim}))

    for s, itens in por_serie.items():
        itens.sort(key=lambda x: x[0])
        numeros = [n for n, _ in itens]
        if numeros != list(range(1, len(numeros) + 1)):
            faltando = sorted(set(range(1, max(numeros, default=0) + 1)) - set(numeros))
            erros.append(f"{s}: numeração não é contínua a partir de 1 (faltam {faltando[:10]})")
        for (n_a, a), (n_b, b) in zip(itens, itens[1:]):
            if b["_ini"] < a["_ini"]:  # aviso: o próprio inventário original tem GE-SEC-49 depois de GE-SEC-50
                avisos.append(f"{s}-{n_b:02d} começa na L{b['_ini']}, antes de {s}-{n_a:02d} (L{a['_ini']}): "
                             "a numeração deveria seguir a ordem de aparição")
        esperado = SERIES[s][3]
        if len(itens) != esperado:
            avisos.append(f"{s}: {len(itens)} práticas; o inventário de 2026-09-11 tinha {esperado}")

    indice = {r["id"]: (r["_ini"], r["_fim"]) for itens in por_serie.values() for _, r in itens}
    for pid, (a_ini, a_fim) in sorted(ancoras.items()):
        if serie(pid) not in por_serie:
            continue
        if pid not in indice:
            erros.append(f"âncora {pid} (L{a_ini}–{a_fim}) ausente do catálogo")
            continue
        ini, fim = indice[pid]
        if fim < a_ini or ini > a_fim:
            erros.append(f"âncora {pid}: catálogo em L{ini}–{fim}, mas a matriz/doc 09 usa L{a_ini}–{a_fim}")
    return erros, avisos


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalogos", nargs="*", type=Path, default=[CATALOGO])
    parser.add_argument("--serie", action="append", choices=list(SERIES))
    args = parser.parse_args(argv)
    erros, avisos = conferir(ler_catalogo(args.catalogos), ler_ancoras(), args.serie)
    for a in avisos:
        print(f"AVISO: {a}")
    for e in erros:
        print(f"ERRO: {e}")
    print(f"{len(erros)} erro(s), {len(avisos)} aviso(s)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
