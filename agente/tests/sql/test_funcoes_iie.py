import psycopg
import pytest


def test_resolve_sigla_nome_e_gentilico(sql):
    for texto in ["CE", "Ceará", "ceara", "Cearense", " cearense "]:
        assert sql("select (iie.fn_resolver_territorio(%s)).id", texto) == "UF-23"
    assert sql("select (iie.fn_resolver_territorio(%s)).id", "Brasil") == "BR"
    assert sql("select (iie.fn_resolver_territorio(%s)).id", "capixaba") == "UF-32"


def test_territorio_inexistente_sugere(banco):
    with pytest.raises(psycopg.errors.NoDataFound) as erro:
        banco.execute("select iie.fn_resolver_territorio('Cearaa')")
    assert "territorio_nao_encontrado" in str(erro.value)
    assert "Ceará" in erro.value.diag.message_hint


def test_consultar_iie_ceara(sql):
    r = sql("select iie.fn_consultar_iie('CE')")
    assert [p["valor"] for p in r["serie"]] == [10.7, 7.8, 13.5, 21.2]
    assert r["posicao"] == {"ano": 2019, "posicao": 7, "de": 27}
    assert r["brasil"][-1] == {"ano": 2019, "valor": 19.0}
    assert r["status_ultimo_ano"] == "ok"
    assert r["natureza"] == "oficial"


def test_consultar_iie_anos_finais(sql):
    r = sql("select iie.fn_consultar_iie('SP', 'AF')")
    assert r["serie"][-1] == {"ano": 2019, "valor": 32.4}


def test_decompor_brasil_2019_respeita_identidade(sql):
    r = sql("select iie.fn_decompor('Brasil', 2019)")
    c = r["componentes"]
    assert (c["F2_atraso_2_ou_mais"], c["P1_fora_da_escola_sem_em"], c["A1_basico_entre_concluintes"]) == (31.0, 6.4, 29.8)
    assert r["iie_reproduzido"] == 18.6
    assert r["iie_oficial"] == 19.0
    assert r["prioridade"] == []


def test_decompor_semaforo_ganho_e_prioridade(sql):
    am = sql("select iie.fn_decompor('AM', 2019)")
    assert am["semaforo"]["A1"] == "critico"
    assert am["semaforo"]["E3"] == "critico"
    assert am["ganho_potencial"]["A1"] == pytest.approx(9.6, abs=0.05)
    assert am["prioridade"][0] == "A1"
    rj = sql("select iie.fn_decompor('RJ', 2019)")
    assert rj["semaforo"]["F2"] == "critico"
    assert rj["ganho_potencial"]["F2"] == pytest.approx(3.7, abs=0.05)
    assert rj["prioridade"] == ["F2"]
    ce = sql("select iie.fn_decompor('CE', 2019)")
    assert ce["semaforo"]["P1"] == "critico" and ce["prioridade"] == ["P1"]


def test_decompor_traz_alerta_da_bahia(sql):
    ba = sql("select iie.fn_decompor('BA', 2019)")
    assert ba["alertas"][0]["severidade"] == "alta"
    assert "77%" in ba["alertas"][0]["texto"]
    assert ba["natureza"] == "reproducao"


def test_decompor_ano_sem_dado(banco):
    with pytest.raises(psycopg.errors.NoDataFound, match="sem_componentes"):
        banco.execute("select iie.fn_decompor('CE', 2021)")


def test_comparar_ce_pe(sql):
    r = sql("select iie.fn_comparar(array['CE', 'Pernambuco'], 'IIE', 2019)")
    assert [(v["sigla"], v["valor"]) for v in r["valores"]] == [("CE", 21.2), ("PE", 19.3)]
    assert r["brasil"] == 19.0


def test_ranking_iie_2019_e_por_regiao(sql):
    r = sql("select iie.fn_ranking('IIE', 2019)")["ranking"]
    assert (r[0]["sigla"], r[0]["valor"]) == ("SP", 27.0)
    assert (r[-1]["sigla"], r[-1]["valor"]) == ("AP", 6.5)
    ne = sql("select iie.fn_ranking('IIE', 2019, 'Nordeste', 3)")["ranking"]
    assert [x["sigla"] for x in ne] == ["CE", "PE", "PB"]
    p1 = sql("select iie.fn_ranking('P1', 2019, null, 1)")["ranking"]
    assert p1[0]["sigla"] == "SP"


def test_praticas_evasao_secretaria_nucleo(sql):
    r = sql("select iie.fn_praticas('P1', 'Secretaria', 'nucleo')")
    ids = [p["id"] for p in r["praticas"]]
    assert ids == ["SM-79", "SM-76", "SM-78", "SM-73", "GE-SEC-68"]
    assert all(p["linhas"].startswith("L") for p in r["praticas"])
    assert r["indicador"]["id"] == "P1"


def test_praticas_estrategico_sem_acento(sql):
    r = sql("select iie.fn_praticas('A1', 'Estrategico')")
    assert {p["id"] for p in r["praticas"]} == {"PE-08", "PE-32", "PE-37", "PE-25"}


def test_semaforo_bate_com_doc_09(sql):
    esperado = {"SP": "ok", "AC": "critico", "MT": "critico", "RJ": "ok"}
    for sigla, status in esperado.items():
        s = sql("""select status from iie.vw_semaforo s join iie.territorio t on t.id = s.territorio_id
                   where t.sigla = %s and s.ano = 2019 and s.indicador_id = 'A1'""", sigla)
        assert s == status, sigla
