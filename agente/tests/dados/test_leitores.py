from dados.carregar_iie import (ANEXOS, SEEDS, ler_alertas, ler_componentes, ler_indicadores, ler_matriz,
                                ler_oficial, ler_territorios, normalizar)


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


def test_componentes_mantem_metodos_de_2019():
    linhas = ler_componentes(ANEXOS / "iie_uf_reproducao.csv", _ids())
    metodos = {(l[1], l[2]) for l in linhas}
    assert metodos == {(2015, "regular"), (2017, "regular"), (2019, "2019_A_alternativa"),
                       (2019, "2019_B_procedimento_publicado")}


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
