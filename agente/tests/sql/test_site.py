"""Regras do site: cadastro pelo Supabase Auth, administração e RLS do usuário logado (migração 0004)."""
import uuid
from contextlib import contextmanager

import psycopg
import pytest
from psycopg.types.json import Jsonb

SOBRAL = {"nome": "Ana Souza", "perfil": "secretaria_estadual", "instituicao": "Seduc CE", "uf": "CE",
          "municipio_ibge": "2312908", "municipio_nome": "Sobral", "aceite_termo": True}
NEGADO = psycopg.errors.InsufficientPrivilege  # falta de permissão e violação de RLS (42501)


def cadastrar(banco, **mudancas):
    """Faz o que o signUp do site faz: cria a conta em auth.users com os metadados do formulário."""
    uid = uuid.uuid4()
    banco.execute("insert into auth.users (id, email, raw_user_meta_data) values (%s, %s, %s)",
                  (uid, f"{uid}@teste.gov.br", Jsonb(SOBRAL | mudancas)))
    return uid


def ativar(banco, uid, papel="usuario"):
    banco.execute("update app.usuario set status = 'ativo', papel = %s where id = %s", (papel, uid))
    return uid


@contextmanager
def como(banco, uid):
    """Executa como o usuário logado no site (papel authenticated, auth.uid() = uid)."""
    with banco.transaction():
        banco.execute("select set_config('request.jwt.claim.sub', %s, true)", (str(uid),))
        banco.execute("set local role authenticated")
        yield banco


@contextmanager
def como_n8n(banco):
    with banco.transaction():
        banco.execute("set local role n8n_operacao")
        yield banco


def nova_conversa(banco, uid, titulo="Como está o Ceará?"):
    with como(banco, uid):
        return banco.execute("insert into app.conversa (usuario_id, titulo) values (%s, %s) returning id",
                             (uid, titulo)).fetchone()[0]


def mensagem(banco, conversa, papel="usuario", texto="Como está o Ceará?"):
    with como_n8n(banco):
        return banco.execute("insert into app.mensagem (conversa_id, papel, texto) values (%s, %s, %s) returning id",
                             (conversa, papel, texto)).fetchone()[0]


def test_cadastro_cria_usuario_ja_ativo(banco):
    uid = cadastrar(banco)
    u = banco.execute("""select status, papel, uf, municipio_nome, email, aceite_termo_em is not null, decidido_por
                         from app.usuario where id = %s""", (uid,)).fetchone()
    assert u == ("ativo", "usuario", "CE", "Sobral", f"{uid}@teste.gov.br", True, None)


@pytest.mark.parametrize("mudanca, motivo", [
    ({"municipio_ibge": "3550308"}, "não pertence à UF CE"),   # São Paulo (SP) com UF CE
    ({"municipio_ibge": "23129"}, "não pertence à UF CE"),
    ({"uf": "XX"}, "UF XX"),
    ({"uf": "BR"}, "UF BR"),
    ({"aceite_termo": False}, "termo de uso"),
])
def test_cadastro_invalido_e_recusado(banco, mudanca, motivo):
    with pytest.raises(psycopg.errors.InvalidParameterValue, match=motivo):
        with banco.transaction():
            cadastrar(banco, **mudanca)


def test_cadastro_com_perfil_inexistente_e_recusado(banco):
    with pytest.raises(psycopg.errors.CheckViolation):
        with banco.transaction():
            cadastrar(banco, perfil="prefeito")


def test_usuario_ve_so_os_proprios_dados(banco):
    a, b = ativar(banco, cadastrar(banco)), ativar(banco, cadastrar(banco))
    conversa_b = nova_conversa(banco, b)
    mensagem(banco, conversa_b)
    with como(banco, a):
        assert banco.execute("select array_agg(id) from app.usuario").fetchone()[0] == [a]
        assert banco.execute("select count(*) from app.conversa where id = %s", (conversa_b,)).fetchone()[0] == 0
        assert banco.execute("select count(*) from app.mensagem where conversa_id = %s",
                             (conversa_b,)).fetchone()[0] == 0


def test_so_ativo_cria_conversa_e_so_para_si(banco):
    pendente = cadastrar(banco)
    banco.execute("update app.usuario set status = 'pendente' where id = %s", (pendente,))
    with pytest.raises(NEGADO):
        nova_conversa(banco, pendente)
    a, b = ativar(banco, cadastrar(banco)), ativar(banco, cadastrar(banco))
    with pytest.raises(NEGADO):
        with como(banco, a):
            banco.execute("insert into app.conversa (usuario_id, titulo) values (%s, 'x')", (b,))
    assert nova_conversa(banco, a)


def test_so_admin_muda_status_e_fica_registrado(banco, sql):
    admin, comum, novo = ativar(banco, cadastrar(banco), "admin"), ativar(banco, cadastrar(banco)), cadastrar(banco)
    with como(banco, comum):
        banco.execute("update app.usuario set status = 'bloqueado' where id = %s", (novo,))
        banco.execute("update app.usuario set papel = 'admin' where id = %s", (comum,))
    assert sql("select status from app.usuario where id = %s", novo) == "ativo"
    assert sql("select papel from app.usuario where id = %s", comum) == "usuario"
    with como(banco, admin):
        banco.execute("update app.usuario set status = 'bloqueado' where id = %s", (novo,))
    assert banco.execute("select status, decidido_por, decidido_em is not null from app.usuario where id = %s",
                         (novo,)).fetchone() == ("bloqueado", admin, True)


def test_admin_nao_muda_aceite_nem_email(banco):
    admin, outro = ativar(banco, cadastrar(banco), "admin"), cadastrar(banco)
    with pytest.raises(NEGADO):
        with como(banco, admin):
            banco.execute("update app.usuario set email = 'x@y.z' where id = %s", (outro,))


def test_apagar_conversa_limpa_mensagens_e_memoria(banco, sql):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    mensagem(banco, conversa)
    with como_n8n(banco):
        banco.execute("insert into agente.memoria (session_id, message) values (%s, '{}')", (str(conversa),))
    with como(banco, uid):
        banco.execute("delete from app.conversa where id = %s", (conversa,))
    assert sql("select count(*) from app.mensagem where conversa_id = %s", conversa) == 0
    assert sql("select count(*) from agente.memoria where session_id = %s", str(conversa)) == 0


def test_limite_diario_conta_perguntas_e_nao_zera_ao_apagar_conversa(banco):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    for papel in ("usuario", "agente", "usuario"):
        mensagem(banco, conversa, papel)
    with como(banco, uid):
        assert banco.execute("select app.fn_perguntas_hoje()").fetchone()[0] == 2
        banco.execute("delete from app.conversa where id = %s", (conversa,))
        assert banco.execute("select app.fn_perguntas_hoje()").fetchone()[0] == 2


def test_mensagem_nova_atualiza_a_conversa(banco, sql):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    antes = sql("select atualizada_em from app.conversa where id = %s", conversa)
    mensagem(banco, conversa)
    assert sql("select atualizada_em from app.conversa where id = %s", conversa) > antes


def test_feedback_so_em_resposta_da_propria_conversa(banco, sql):
    a, b = ativar(banco, cadastrar(banco)), ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, a)
    pergunta, resposta = mensagem(banco, conversa), mensagem(banco, conversa, "agente", "Resposta")
    votar = """insert into app.feedback (mensagem_id, usuario_id, nota) values (%s, %s, %s)
               on conflict (mensagem_id, usuario_id) do update set nota = excluded.nota"""
    with como(banco, a):
        banco.execute(votar, (resposta, a, 1))
        banco.execute(votar, (resposta, a, -1))
    assert sql("select nota from app.feedback where mensagem_id = %s", resposta) == -1
    for uid, msg in ((b, resposta), (a, pergunta)):
        with pytest.raises(NEGADO):
            with como(banco, uid):
                banco.execute(votar, (msg, uid, 1))


def test_excluir_conta_apaga_tudo(banco, sql):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    resposta = mensagem(banco, conversa, "agente", "Resposta")
    mensagem(banco, conversa)
    with como_n8n(banco):
        banco.execute("insert into agente.memoria (session_id, message) values (%s, '{}')", (str(conversa),))
    with como(banco, uid):
        banco.execute("insert into app.feedback (mensagem_id, usuario_id, nota) values (%s, %s, 1)", (resposta, uid))
    banco.execute("delete from auth.users where id = %s", (uid,))  # o que auth.admin.deleteUser faz
    for consulta, param in [("select count(*) from app.usuario where id = %s", uid),
                            ("select count(*) from app.conversa where usuario_id = %s", uid),
                            ("select count(*) from app.mensagem where conversa_id = %s", conversa),
                            ("select count(*) from app.feedback where usuario_id = %s", uid),
                            ("select count(*) from app.cota_diaria where usuario_id = %s", uid),
                            ("select count(*) from agente.memoria where session_id = %s", str(conversa))]:
        assert sql(consulta, param) == 0, consulta


def test_anonimo_nao_acessa_app(banco):
    with pytest.raises(NEGADO):
        with banco.transaction():
            banco.execute("set local role anon")
            banco.execute("select count(*) from app.usuario")


@pytest.mark.parametrize("tabela", ["app.kb_versao", "agente.memoria", "app.cota_diaria", "iie.pratica", "app.falha"])
def test_logado_nao_le_tabelas_internas(banco, tabela):
    uid = ativar(banco, cadastrar(banco))
    with pytest.raises(NEGADO):
        with como(banco, uid):
            banco.execute(f"select count(*) from {tabela}")


def test_painel_de_uso(banco, sql):
    uid = ativar(banco, cadastrar(banco))
    conversa = nova_conversa(banco, uid)
    mensagem(banco, conversa)
    with como_n8n(banco):
        banco.execute("""insert into app.mensagem (conversa_id, papel, texto, latencia_ms, numeros_sem_origem)
                         values (%s, 'agente', 'Resposta', 1200, '["12,3"]')""", (conversa,))
    hoje = sql("""select jsonb_build_object('perguntas', perguntas, 'respostas', respostas,
                                            'sem_origem', com_numero_sem_origem, 'pendentes', cadastros_pendentes)
                  from app.vw_uso_diario where dia = (now() at time zone 'America/Sao_Paulo')::date""")
    assert hoje["perguntas"] >= 1 and hoje["respostas"] >= 1 and hoje["sem_origem"] >= 1
    assert hoje["pendentes"] >= 0
