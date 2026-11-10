from dados.carregar_iie import (ANEXOS, FONTE_PAINEL, SEEDS, ler_alertas, ler_componentes, ler_indicadores,
                                ler_matriz, ler_oficial, ler_painel, ler_territorios, normalizar)


def _ids():
    return {t[3]: t[0] for t in ler_territorios(SEEDS / "territorios.csv")}


def test_normalizar_remove_acento_e_caixa():
    assert normalizar("  Ceará ") == "ceara"


def test_territorios_tem_brasil_e_27_ufs():
    territorios = ler_territorios(SEEDS / "territorios.csv")
    assert len(territorios) == 28
    assert ("BR", "BR", "0", "BR", "Brasil", "Brasil", ["brasil", "pais", "nacional"]) in territorios


def test_oficial_vira_formato_longo():
    linhas = ler_oficial(ANEXOS / "iie_uf_oficial_2013_2019.csv", _ids())
    assert len(linhas) == 28 * 4 * 3
    assert ("UF-23", 2019, "EM", 21.2, "Fernandes, Felicio e Saad (2024), Tabela 7") in linhas


def test_painel_traz_o_iie_do_em_de_2015_a_2023():
    linhas = ler_painel(ANEXOS / "iie_uf_painel_2015_2023.csv", _ids())
    assert len(linhas) == 28 * 5
    assert ("UF-23", 2023, "EM", 18.135, FONTE_PAINEL) in linhas
    assert ("BR", 2015, "EM", 9.468, FONTE_PAINEL) in linhas


def test_componentes_mantem_metodos_de_2019_e_trazem_o_painel():
    linhas = ler_componentes(ANEXOS / "iie_uf_reproducao.csv", _ids())
    metodos = {(l[1], l[2]) for l in linhas}
    assert metodos == {(2015, "regular"), (2017, "regular"), (2019, "2019_A_alternativa"),
                       (2019, "2019_B_procedimento_publicado"), (2019, "painel"), (2021, "painel"), (2023, "painel")}
    painel = {(l[0], l[1]): l for l in linhas if l[2] == "painel"}
    assert all(l[3] for l in painel.values())  # oficial
    br19, br23 = painel[("BR", 2019)], painel[("BR", 2023)]
    assert br19[4] == 18.878 and br19[5] is not None and br19[14] is None  # trajetória do Censo; sem A2 em 2019
    assert br23[4] == 15.485 and br23[5] is None and br23[14] is not None  # sem trajetória; A2 do SAEB
    # A identidade IIE = F1 × A1 / 100 vale para o que o painel publica.
    assert abs(br23[10] * br23[11] / 100 - br23[4]) < 0.01


def test_matriz_ignora_base_e_pratica_tem_fonte_unica():
    praticas, vinculos = ler_matriz(ANEXOS / "matriz_indicador_pratica.csv")
    assert all(v[0] != "BASE" for v in vinculos)
    assert len(vinculos) == 133
    assert len({p[0] for p in praticas}) == len(praticas)


def test_indicadores_e_alertas():
    assert [i[0] for i in ler_indicadores(SEEDS / "indicadores.json")] == [
        "P1", "F2", "F1", "A1", "A2", "A3", "E1", "E2", "E3", "Q1", "D1"]
    alertas = ler_alertas(SEEDS / "alertas.csv", _ids())
    assert ("UF-29", 2019, "D1", "ambos", "alta") == alertas[0][:5]


INDICADORES = {"P1", "F2", "F1", "A1", "A2", "A3", "E1", "E2", "E3", "Q1", "D1"}


def test_catalogo_tem_541_praticas_e_confere_com_as_ancoras():
    from dados.carregar_iie import ler_catalogo
    from dados.conferir_catalogo import conferir, ler_ancoras
    from dados.conferir_catalogo import ler_catalogo as ler_para_conferir
    catalogo = ler_catalogo(ANEXOS / "catalogo_praticas.csv")
    assert len(catalogo) == len({p[0] for p in catalogo}) == 541
    erros, _ = conferir(ler_para_conferir([ANEXOS / "catalogo_praticas.csv"]), ler_ancoras())
    assert erros == []


def test_precondicoes_vem_das_linhas_base_da_matriz():
    from dados.carregar_iie import ler_precondicoes
    precondicoes, vinculos = ler_precondicoes(ANEXOS / "matriz_indicador_pratica.csv")
    assert [p[0] for p in precondicoes] == ["lideranca", "acompanhamento", "planejamento", "monitoramento",
                                            "recursos", "coerencia"]
    recursos = [v[1] for v in vinculos if v[0] == "recursos"]
    assert recursos[:3] == ["SM-17", "SM-33", "SM-34"] and "SM-49" in recursos and recursos[-1] == "GE-208"
    assert len(vinculos) == 50


def test_perfis_e_lacunas():
    from dados.carregar_iie import ler_lacunas, ler_perfis
    perfis, vinculos = ler_perfis(SEEDS / "perfis.json", INDICADORES)
    assert [p[0] for p in perfis] == ["fluxo", "aprendizagem", "duplo", "evasao", "perda_em", "dado"]
    assert len(vinculos) == 26
    assert len(ler_lacunas(SEEDS / "lacunas.json", INDICADORES)) == 8


def test_perfil_com_indicador_desconhecido_e_recusado(tmp_path):
    import pytest
    from dados.carregar_iie import ler_perfis
    arquivo = tmp_path / "perfis.json"
    arquivo.write_text('[{"id": "x", "nome": "X", "criterio": "c", "sequencia": ["Z9"], "descricao": "d", "praticas": []}]')
    with pytest.raises(ValueError, match="Z9"):
        ler_perfis(arquivo, INDICADORES)
