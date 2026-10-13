import psycopg
import pytest


def test_papel_agente_so_le(banco):
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        assert banco.execute("select iie.fn_decompor('CE', 2019, p_ufs => iie.ufs_todas())").fetchone()[0]["ano"] == 2019
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute("insert into iie.alerta_dado (natureza, severidade, texto) values ('ambos', 'info', 'x')")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute("select count(*) from app.usuario")
        banco.execute("reset role")


def test_agente_nao_le_app(banco):
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        for tabela in ("app.kb_versao", "app.mensagem"):
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                with banco.transaction():
                    banco.execute(f"select count(*) from {tabela}")


def test_n8n_grava_mensagem_mas_nao_muda_usuario(banco):
    with banco.transaction():
        banco.execute("set local role n8n_operacao")
        assert banco.execute("select count(*) from app.kb_versao").fetchone()[0] == 0
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute("update app.usuario set status = 'ativo'")
