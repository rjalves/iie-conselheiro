from dados.conferir_catalogo import conferir, ler_ancoras

DOC = "boas-praticas/planejamento-estrategico-de-uma-secretaria-de-educacao.md"


def _pe(n, linhas, **extra):
    return {"id": f"PE-{n:02d}", "fonte": "TPE", "documento": DOC, "nivel": "Estratégico",
            "secao": "1. Diagnóstico", "nome": f"Prática {n}", "descricao": "Descrição.", "linhas": linhas,
            "alavancas": "dados"} | extra


def test_catalogo_valido_so_avisa_do_total():
    erros, avisos = conferir([_pe(1, "L10"), _pe(2, "L29–52")], {"PE-02": (29, 52)}, ["PE"])
    assert erros == []
    assert avisos == ["PE: 2 práticas; o inventário de 2026-09-11 tinha 52"]


def test_ancora_fora_do_lugar_e_erro():
    erros, _ = conferir([_pe(1, "L10"), _pe(2, "L60")], {"PE-02": (29, 52)}, ["PE"])
    assert erros == ["âncora PE-02: catálogo em L60–60, mas a matriz/doc 09 usa L29–52"]


def test_ancora_ausente_e_erro():
    erros, _ = conferir([_pe(1, "L10")], {"PE-02": (29, 52)}, ["PE"])
    assert erros == ["âncora PE-02 (L29–52) ausente do catálogo"]


def test_ordem_de_aparicao_numeracao_e_formato():
    erros, avisos = conferir([_pe(1, "L50"), _pe(3, "L40")], {}, ["PE"])
    assert any("numeração não é contínua" in e for e in erros)
    assert any("ordem de aparição" in a for a in avisos)
    erros, _ = conferir([_pe(1, "L10", id="PE-1")], {}, ["PE"])
    assert any("id inválido: PE-1" in e for e in erros)


def test_campos_e_alavancas():
    erros, _ = conferir([_pe(1, "L10", nome="", alavancas="dados|magia", nivel="Escola")], {}, ["PE"])
    assert "PE-01: nome vazio" in erros
    assert any("alavancas" in e for e in erros)
    assert any("fonte/documento/nível" in e for e in erros)
    erros, _ = conferir([_pe(1, "L10-12")], {}, ["PE"])
    assert any("travessão" in e for e in erros)


def test_ancoras_reais():
    ancoras = ler_ancoras()
    assert len(ancoras) == 147
    assert ancoras["SM-79"][0] > 0 and ancoras["PE-02"] == (29, 52)


def test_ancoras_de_intervalos_e_pares_do_doc09():
    ancoras = ler_ancoras()
    assert ancoras["SM-40"] == (790, 1133)                       # "SM-35 a 49 (Itaú L790–1133)"
    assert ancoras["GE-SEC-04"] == (2187, 2216) and ancoras["GE-SEC-07"] == (2274, 2316)
    assert ancoras["SM-115"] == ancoras["SM-116"] == (2560, 2590)
