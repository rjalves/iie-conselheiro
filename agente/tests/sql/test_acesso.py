"""Contrato de UFs das funções de dados (0006): recusam UF fora da lista recebida e pedido sem lista.
Desde a 0012, os dados são públicos: o site sempre manda as 27 UFs, e não há lista por usuário."""
import psycopg
import pytest

from tests.sql.test_site import NEGADO, cadastrar

SEM_ACESSO = psycopg.errors.InsufficientPrivilege


def test_dados_sao_publicos_sem_lista_por_usuario(sql, banco):
    """0012: não há mais UFs por usuário; o site manda todas, e qualquer UF responde."""
    cadastrar(banco)
    assert sql("select count(*) from information_schema.columns where table_schema = 'app' "
               "and table_name = 'usuario' and column_name = 'ufs_acesso'") == 0
    r = sql("select iie.fn_consultar_iie('CE', p_ufs => iie.ufs_todas())")
    assert r["territorio"]["sigla"] == "CE" and r["serie"]


def test_dados_de_uf_nao_liberada_sao_recusados(banco):
    with pytest.raises(SEM_ACESSO) as erro:
        banco.execute("select iie.fn_consultar_iie('CE', p_ufs => array['PE'])")
    assert "territorio_sem_acesso: Ceará" in str(erro.value)
    assert "Pernambuco" in erro.value.diag.message_hint
    assert "Estados liberados para este usuário: Pernambuco" in erro.value.diag.message_primary  # lida pelo agente
    for consulta in ("select iie.fn_decompor('Cearense', 2019, array['PE'])",
                     "select iie.fn_comparar(array['PE', 'CE'], 'IIE', 2019, array['PE'])"):
        with pytest.raises(SEM_ACESSO, match="Ceará"):
            banco.execute(consulta)


def test_brasil_e_a_propria_uf_sempre_respondem(sql):
    assert sql("select iie.fn_consultar_iie('Brasil', p_ufs => array['PE'])")["territorio"]["sigla"] == "BR"
    pe = sql("select iie.fn_consultar_iie('PE', p_ufs => array['PE'])")
    assert pe["posicao"] == {"ano": 2023, "posicao": 10, "de": 27}  # posição nacional continua visível
    assert sql("select iie.fn_decompor('Brasil', 2019, array['PE'])")["iie_oficial"] == 18.88


def test_sem_lista_de_acesso_nada_responde(banco):
    for consulta in ("select iie.fn_consultar_iie('PE')", "select iie.fn_decompor('Brasil', 2019)",
                     "select iie.fn_ranking('IIE', 2019)", "select iie.fn_comparar(array['PE', 'BR'], 'IIE', 2019)"):
        with pytest.raises(SEM_ACESSO, match="acesso_nao_informado"):
            with banco.transaction():
                banco.execute(consulta)


def test_ranking_mostra_so_as_ufs_liberadas_com_a_posicao_nacional(sql):
    r = sql("select iie.fn_ranking('IIE', 2019, p_ufs => array['PE', 'CE'])")
    assert [(x["sigla"], x["posicao"]) for x in r["ranking"]] == [("CE", 7), ("PE", 8)]
    assert r["apenas_ufs_liberadas"] is True and r["de"] == 27
    todas = sql("select iie.fn_ranking('IIE', 2019, null, 3, iie.ufs_todas())")
    assert [x["sigla"] for x in todas["ranking"]] == ["SP", "DF", "GO"] and todas["apenas_ufs_liberadas"] is False


def test_agente_usa_a_lista_e_nao_escreve(banco):
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        assert banco.execute("select cardinality(iie.ufs_todas())").fetchone()[0] == 27
        with pytest.raises(NEGADO):
            with banco.transaction():
                banco.execute("update app.usuario set papel = 'admin'")
