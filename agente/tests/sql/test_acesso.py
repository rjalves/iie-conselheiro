"""Acesso por UF (migração 0006): lista de UFs por usuário e recusa, no banco, dos dados de UFs não liberadas."""
import psycopg
import pytest

from tests.sql.test_site import NEGADO, ativar, cadastrar, como

SEM_ACESSO = psycopg.errors.InsufficientPrivilege


def test_cadastro_libera_so_a_uf_do_cadastro(sql, banco):
    uid = cadastrar(banco)
    assert sql("select ufs_acesso from app.usuario where id = %s", uid) == ["CE"]


def test_admin_edita_a_lista_que_e_normalizada(banco, sql):
    admin, outro = ativar(banco, cadastrar(banco), "admin"), cadastrar(banco)
    with como(banco, admin):
        banco.execute("update app.usuario set ufs_acesso = array['pe', 'CE', 'PE'] where id = %s", (outro,))
    assert sql("select ufs_acesso from app.usuario where id = %s", outro) == ["CE", "PE"]


def test_usuario_comum_nao_muda_a_propria_lista(banco, sql):
    uid = ativar(banco, cadastrar(banco))
    with como(banco, uid):
        banco.execute("update app.usuario set ufs_acesso = array['SP'] where id = %s", (uid,))
    assert sql("select ufs_acesso from app.usuario where id = %s", uid) == ["CE"]


@pytest.mark.parametrize("lista", ["array['XX']", "array['BR']", "array[]::text[]"])
def test_lista_invalida_ou_vazia_e_recusada(banco, lista):
    uid = cadastrar(banco)
    with pytest.raises(psycopg.errors.InvalidParameterValue, match="ufs_acesso"):
        with banco.transaction():
            banco.execute(f"update app.usuario set ufs_acesso = {lista} where id = %s", (uid,))


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
    assert pe["posicao"] == {"ano": 2019, "posicao": 8, "de": 27}  # posição nacional continua visível
    assert sql("select iie.fn_decompor('Brasil', 2019, array['PE'])")["iie_oficial"] == 19.0


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
                banco.execute("update app.usuario set ufs_acesso = array['SP']")
