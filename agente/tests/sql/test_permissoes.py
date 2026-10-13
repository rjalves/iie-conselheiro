import psycopg
import pytest


def test_papel_agente_so_le(banco):
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        assert banco.execute("select iie.fn_decompor('CE', 2019)").fetchone()[0]["ano"] == 2019
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute("insert into iie.alerta_dado (natureza, severidade, texto) values ('ambos', 'info', 'x')")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute("select count(*) from app.usuario")
        banco.execute("reset role")
