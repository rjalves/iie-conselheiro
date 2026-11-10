def test_carga_completa(sql):
    contagens = {
        "iie.territorio": 28, "iie.resultado_oficial": 336, "iie.componente": 112, "iie.indicador": 11,
        "iie.pratica": 541, "iie.indicador_pratica": 133, "iie.alerta_dado": 10, "iie.precondicao": 6,
        "iie.precondicao_pratica": 50, "iie.perfil_territorio": 6, "iie.perfil_pratica": 26, "iie.lacuna": 8,
    }
    for tabela, esperado in contagens.items():
        assert sql(f"select count(*) from {tabela}") == esperado, tabela
    assert sql("select linhas ->> 'vinculos' from iie.carga order by id desc limit 1") == "133"
    assert sql("select linhas ->> 'praticas' from iie.carga order by id desc limit 1") == "541"


def test_sinonimos_sem_acento(sql):
    assert sql("select sinonimos from iie.territorio where sigla = 'CE'") == ["ceara", "cearense"]


def test_tabelas_do_app_para_o_site(sql):
    tabelas = sql("""select array_agg(table_name::text order by table_name) from information_schema.tables
                     where table_schema = 'app' and table_type = 'BASE TABLE'""")
    assert tabelas == ["conversa", "cota_diaria", "feedback", "kb_versao", "mensagem", "usuario"]
