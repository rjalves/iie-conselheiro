"""Reprodução do cálculo do IIE (script 04_calculo_iie.Rmd) a partir das bases .rds de dados/.

Uso (na raiz do repositório):
    pip install pyreadr pandas numpy
    python contexto/anexos/reproducao_iie.py

Gera contexto/anexos/iie_uf_reproducao.csv com o IIE e a decomposição da coorte por UF.
- 2015 e 2017: transcrição fiel da fórmula do script 04 ("regular").
- 2019: o script 04 depende de calc_iie_2019_geral(), ausente no repositório. Aqui ficam duas
  reconstruções (NÃO oficiais) da regra "proporções de desempenho por grupo de 2017
  aplicadas ao total observado em 2019":
    A_alternativa: p_g,2019 = p_total,2019 * p_g,2017 / p_total,2017
    B_procedimento_publicado: totais de básico e abaixo de 2019 repartidos entre grupos pela
      distribuição de 2017 e linhas renormalizadas (Fernandes, Felicio e Saad, 2024, p. 22)
- 2019, 2021 e 2023, método "painel": componentes coerentes com o IIE publicado no painel do IIE (Lupa Social),
  transcrito em iie_uf_painel_2015_2023.csv. Ver painel().
"""
from pathlib import Path

import numpy as np
import pandas as pd
import pyreadr

RAIZ = Path(__file__).resolve().parents[2]
DADOS = RAIZ / "dados"
SAIDA = Path(__file__).resolve().parent / "iie_uf_reproducao.csv"
PAINEL = Path(__file__).resolve().parent / "iie_uf_painel_2015_2023.csv"

UF_SIGLA = dict(zip(
    [0, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29,
     31, 32, 33, 35, 41, 42, 43, 50, 51, 52, 53],
    ["BR", "RO", "AC", "AM", "RR", "PA", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA",
     "MG", "ES", "RJ", "SP", "PR", "SC", "RS", "MS", "MT", "GO", "DF"],
))
GRUPOS_SAEB = {"linha": "emlinha", "atrasado1ano": "atrasado", "atrasado2anos": "atrasado2"}
A, L, T, T2 = "adiantado", "emlinha", "atrasado", "atrasado2"


def ler(nome):
    df = next(iter(pyreadr.read_r(DADOS / f"{nome}.rds").values()))
    df["ano"] = df["ano"].astype(int)
    df["uf"] = df["uf"].astype(int)
    return df


def contagens_censo(censo):
    c = censo.assign(grupo=censo.grupo.str.replace("coorte_", "").str.replace("_Censo", ""))
    return c.pivot_table(index=["ano", "uf"], columns="grupo", values="n", aggfunc="sum", fill_value=0)


def p_basico_regular(saeb):
    s = saeb[saeb.grupo != "total"].assign(grupo=lambda d: d.grupo.replace(GRUPOS_SAEB))
    w = s.pivot_table(index=["ano", "uf", "grupo"], columns="metric", values="valor", aggfunc="sum", fill_value=0)
    return (w.basico / (w.basico + w.abaixo)).unstack("grupo")


def p_basico_2019(saeb, hipotese):
    s = saeb.assign(grupo=saeb.grupo.replace(GRUPOS_SAEB))
    w = s.pivot_table(index=["ano", "uf", "grupo"], columns="metric", values="valor", aggfunc="sum")
    g17 = w.loc[2017]
    tot17 = g17.groupby("uf").sum()
    tot19 = w.loc[2019].xs("total", level="grupo")
    if hipotese == "A_alternativa":
        p_tot17 = tot17.basico / (tot17.basico + tot17.abaixo)
        p_tot19 = tot19.basico / (tot19.basico + tot19.abaixo)
        p = (g17.basico / (g17.basico + g17.abaixo)).unstack("grupo")
        return p.mul(p_tot19 / p_tot17, axis=0)
    basico = g17.basico.unstack("grupo").div(tot17.basico, axis=0).mul(tot19.basico, axis=0)
    abaixo = g17.abaixo.unstack("grupo").div(tot17.abaixo, axis=0).mul(tot19.abaixo, axis=0)
    return basico / (basico + abaixo)


def calcula(cont, p, perc_fora):
    df = cont.join(p.add_prefix("p_")).join(perc_fora)
    censo_tot = df[[A, L, T, T2]].sum(axis=1)
    coorte_aj = censo_tot / (1 - df.perc_fora)
    fora = np.maximum(coorte_aj - censo_tot, 0)
    num = df[A] * df[f"p_{A}"] + df[L] * df[f"p_{L}"] + df[T] * df[f"p_{T}"]
    den = df[A] + df[L] + df[T] + df[T2] + fora
    concl = df[A] + df[L] + df[T]
    return pd.DataFrame({
        "IIE": 100 * num / den,
        "pct_adiantado": 100 * df[A] / den,
        "pct_em_linha": 100 * df[L] / den,
        "pct_atrasado1": 100 * df[T] / den,
        "pct_atrasado2": 100 * df[T2] / den,
        "pct_fora_escola": 100 * fora / den,
        "pct_concluiu_ate18": 100 * concl / den,
        "pct_basico_entre_concluintes": 100 * num / concl,
        "p_basico_adiantado": 100 * df[f"p_{A}"],
        "p_basico_em_linha": 100 * df[f"p_{L}"],
        "p_basico_atrasado1": 100 * df[f"p_{T}"],
        "coorte_ajustada": den,
    })


def painel(trajetoria_2019, p_regular):
    """IIE do painel (2019 em diante) e componentes coerentes com ele, pela identidade IIE = (100 − F2 − P1) × A1 / 100.

    - P1 é o fora da escola do painel. O painel publica o atraso de 2+ anos entre quem está na escola; F2 é esse
      percentual sobre a geração toda. F1 = 100 − F2 − P1 e A1 = 100 × IIE / F1. Em 2015 e 2017 isso reproduz o
      método "regular" (diferença ≤ 0,02 ponto).
    - 2019: adiantados, em linha e 1 ano de atraso vêm do Censo (não dependem do SAEB). O SAEB 2019 não traz a idade
      do aluno, então o básico por trajetória fica vazio.
    - 2021 e 2023: sem a coorte do Censo, a trajetória fica vazia; o básico por trajetória vem do SAEB (regra regular).
    """
    p = pd.read_csv(PAINEL).query("ano >= 2019")
    p["uf"] = p.uf_sigla.map({s: c for c, s in UF_SIGLA.items()})
    p = p.set_index(["ano", "uf"])
    f2 = p.pct_atraso2_na_escola * (100 - p.pct_fora_escola) / 100
    f1 = 100 - f2 - p.pct_fora_escola
    basico = (100 * p_regular[[A, L, T]]).rename(
        columns={A: "p_basico_adiantado", L: "p_basico_em_linha", T: "p_basico_atrasado1"})
    return (pd.DataFrame({"IIE": p.iie, "pct_atrasado2": f2, "pct_fora_escola": p.pct_fora_escola,
                          "pct_concluiu_ate18": f1, "pct_basico_entre_concluintes": 100 * p.iie / f1})
            .join(trajetoria_2019[["pct_adiantado", "pct_em_linha", "pct_atrasado1", "coorte_ajustada"]])
            .join(basico)
            .assign(metodo="painel"))


def main():
    censo, saeb, pnad = ler("censo_escolar_iie_geral"), ler("saeb_iie_geral"), ler("pnadc_iie_geral")
    cont = contagens_censo(censo)
    perc_fora = (pnad.set_index(["ano", "uf"]).eval("coorte_fora_sem_EM_PNAD / coorte_PNAD").rename("perc_fora"))

    partes = []
    reg = calcula(cont.loc[[2015, 2017]], p_basico_regular(saeb), perc_fora).assign(metodo="regular")
    partes.append(reg)
    c19 = cont.loc[[2019]]
    for h in ("A_alternativa", "B_procedimento_publicado"):
        p = pd.concat({2019: p_basico_2019(saeb, h)}, names=["ano", "uf"])
        partes.append(calcula(c19, p, perc_fora).assign(metodo=f"2019_{h}"))
    partes.append(painel(partes[-1], p_basico_regular(saeb)))  # a trajetória de 2019 é a mesma nos dois métodos

    out = pd.concat(partes).reset_index()
    out.insert(2, "uf_sigla", out.uf.map(UF_SIGLA))
    cols = ["ano", "uf", "uf_sigla", "metodo"] + [c for c in out.columns if c not in ("ano", "uf", "uf_sigla", "metodo")]
    out = out[cols].sort_values(["ano", "metodo", "uf"])
    out.round(3).to_csv(SAIDA, index=False)
    print(out[out.uf == 0][["ano", "metodo", "IIE", "pct_concluiu_ate18", "pct_basico_entre_concluintes"]].round(2).to_string(index=False))
    print(f"\nGravado em {SAIDA}")


if __name__ == "__main__":
    main()
