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


def test_memoria_do_agente_aceita_o_create_do_n8n(banco):
    """O nó Postgres Chat Memory roda CREATE TABLE IF NOT EXISTS a cada uso (migração 0007)."""
    ddl = 'CREATE TABLE IF NOT EXISTS "{}"."{}" (id SERIAL PRIMARY KEY, session_id VARCHAR(255) NOT NULL, message JSONB NOT NULL)'
    with banco.transaction():
        banco.execute("set local role n8n_operacao")
        banco.execute(ddl.format("agente", "memoria"))
        banco.execute("insert into agente.memoria (session_id, message) values ('s', '{}')")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with banco.transaction():
                banco.execute(ddl.format("app", "memoria_indevida"))
        banco.execute("delete from agente.memoria where session_id = 's'")


def test_n8n_registra_falha_e_agente_nao(banco):
    """O workflow iie-erros grava as falhas não tratadas em app.falha (migração 0008)."""
    with banco.transaction():
        banco.execute("set local role n8n_operacao")
        banco.execute("insert into app.falha (workflow, mensagem) values ('w', 'm')")
        assert banco.execute("select count(*) from app.falha").fetchone()[0] >= 1
    with banco.transaction():
        banco.execute("set local role agente_leitura")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            banco.execute("insert into app.falha (workflow, mensagem) values ('w', 'm')")
