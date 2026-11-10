"""Base de práticas completa no banco: catálogo, pré-condições, pacotes, lacunas e funções de busca (migração 0005)."""
import psycopg
import pytest

from dados.conferir_catalogo import SERIES

PRECONDICOES = ["lideranca", "acompanhamento", "planejamento", "monitoramento", "recursos", "coerencia"]


def test_catalogo_completo_no_banco(sql):
    por_serie = sql("""select jsonb_object_agg(serie, n) from (
                         select case when id like 'GE-SEC-%%' then 'GE-SEC' else split_part(id, '-', 1) end as serie,
                                count(*) as n
                         from iie.pratica group by 1) x""")
    assert por_serie == {s: v[3] for s, v in SERIES.items()}
    assert sql("""select count(*) from iie.pratica
                  where nome is null or descricao is null or nivel is null or secao is null
                     or cardinality(alavancas) = 0""") == 0


def test_buscar_praticas_busca_ativa(sql):
    r = sql("select iie.fn_buscar_praticas('busca ativa')")
    assert "SM-79" in [p["id"] for p in r["praticas"]]
    assert all({"id", "nome", "descricao", "fonte", "linhas", "indicadores"} <= set(p) for p in r["praticas"])


def test_buscar_praticas_filtra_fonte_nivel_e_limite(sql):
    r = sql("select iie.fn_buscar_praticas('diretores', 'MEC', 'Secretaria')")
    assert r["total"] >= 1 and all(p["fonte"] == "MEC" and p["nivel"] == "Secretaria" for p in r["praticas"])
    r = sql("select iie.fn_buscar_praticas('planejamento', 'Itau Social', null, 3)")
    assert 1 <= r["total"] <= 3 and all(p["fonte"] == "Itaú Social" for p in r["praticas"])


def test_buscar_sem_acento_e_com_qualquer_palavra(sql):
    com, sem = sql("select iie.fn_buscar_praticas('evasão escolar')"), sql("select iie.fn_buscar_praticas('evasao escolar')")
    assert com["praticas"] == sem["praticas"] and com["total"] >= 1
    assert sql("select iie.fn_buscar_praticas('evasão xyzzyinexistente')")["total"] >= 1


def test_buscar_termo_vazio(banco):
    with pytest.raises(psycopg.errors.InvalidParameterValue, match="termo_vazio"):
        banco.execute("select iie.fn_buscar_praticas('  ')")


def test_pacote_evasao(sql):
    r = sql("select iie.fn_pacote('evasao')")
    assert [p["id"] for p in r["praticas"]] == ["SM-79", "SM-76", "SM-73", "GE-201", "GE-84"]
    assert [pc["id"] for pc in r["precondicoes"]] == PRECONDICOES
    assert r["perfil"]["sequencia"] == ["P1", "E3"]
    assert "Evasão aos 17 anos" in [lac["tema"] for lac in r["lacunas"]]


def test_pacote_pelo_nome_e_duplo_so_com_precondicoes(sql):
    r = sql("select iie.fn_pacote('Gargalo duplo')")
    assert r["perfil"]["id"] == "duplo" and r["praticas"] == []
    recursos = next(pc for pc in r["precondicoes"] if pc["id"] == "recursos")
    assert len(recursos["praticas"]) == 19


def test_pacote_desconhecido_sugere(banco):
    with pytest.raises(psycopg.errors.NoDataFound) as erro:
        banco.execute("select iie.fn_pacote('gargalo mágico')")
    assert "fluxo" in erro.value.diag.message_hint
    assert "Perfis: " in erro.value.diag.message_primary and "fluxo" in erro.value.diag.message_primary


def test_praticas_traz_lacunas_do_indicador(sql):
    r = sql("select iie.fn_praticas('F2')")
    assert [lac["tema"] for lac in r["lacunas"]][:2] == ["Ensino Médio e conclusão até os 18 anos",
                                                          "Atraso de 2 anos ou mais já instalado"]


def test_agente_executa_funcoes_novas_e_nao_escreve(banco):
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        assert banco.execute("select iie.fn_pacote('fluxo')").fetchone()[0]["perfil"]["id"] == "fluxo"
        assert banco.execute("select iie.fn_buscar_praticas('busca ativa')").fetchone()[0]["total"] >= 1
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute("delete from iie.lacuna")
