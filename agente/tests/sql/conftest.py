"""Banco de teste: simula o Supabase, recria os esquemas, aplica as migrações e carrega os dados.

Requer DATABASE_URL_TEST apontando para um Postgres descartável (nunca produção).
"""
import os
from pathlib import Path

import psycopg
import pytest

from dados.carregar_iie import carregar

MIGRACOES = sorted((Path(__file__).resolve().parents[2] / "supabase" / "migrations").glob("*.sql"))
SIMULADO = Path(__file__).resolve().parent / "supabase_simulado.sql"  # auth.users, auth.uid() e papéis do Supabase


@pytest.fixture(scope="session")
def banco():
    url = os.environ.get("DATABASE_URL_TEST")
    if not url:
        pytest.skip("DATABASE_URL_TEST não definido")
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("drop schema if exists iie cascade; drop schema if exists app cascade")
        conn.execute(SIMULADO.read_text(encoding="utf-8"))
        conn.execute("truncate auth.users")
        for arquivo in MIGRACOES:
            conn.execute(arquivo.read_text(encoding="utf-8"))
        carregar(conn, responsavel="teste")
        yield conn


@pytest.fixture
def sql(banco):
    def executar(consulta, *params):
        with banco.cursor() as cur:
            cur.execute(consulta, params)
            return cur.fetchone()[0]
    return executar
