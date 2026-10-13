# P1 — Camada de dados no Supabase: plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** criar no Supabase os esquemas `iie` e `app`, carregar os dados do IIE, os indicadores, as práticas e os alertas, e expor as funções SQL somente leitura que o agente usa como ferramentas.

**Arquitetura:** migrações SQL versionadas em `agente/supabase/migrations/`, um script Python de carga idempotente (`agente/dados/carregar_iie.py`) que lê os CSVs de `contexto/anexos/` e as sementes, e funções `iie.fn_*` que devolvem `jsonb`. Tudo é testado contra um Postgres 17 descartável antes de ir para o Supabase.

**Stack:** PostgreSQL 17 (Supabase), extensões `unaccent` e `pg_trgm`, Python 3.12, psycopg 3, pytest.

**Especificação:** [`projeto/01_proposta_arquitetura.md`](../01_proposta_arquitetura.md), seções 6.3 (ferramentas) e 8 (dados).

## Restrições globais

- PostgreSQL 17. Extensões no esquema `extensions` (padrão do Supabase).
- Esquemas `iie` (analítico) e `app` (operação). Nenhum dos dois é exposto na API REST do Supabase.
- Funções `iie.fn_*` são `STABLE`, somente leitura, e devolvem `jsonb` com `natureza` (`oficial` ou `reproducao`), `fonte` e `alertas`.
- Fonte única dos números: `contexto/anexos/iie_uf_oficial_2013_2019.csv`, `contexto/anexos/iie_uf_reproducao.csv` e `contexto/anexos/matriz_indicador_pratica.csv`.
- Componentes vigentes: 2015 e 2017 com `metodo = 'regular'`; 2019 com `metodo = '2019_B_procedimento_publicado'`.
- Semáforo: atenção = pior que o Brasil; crítico = quartil das piores UFs no mesmo ano (P25 quando baixo é ruim; P75 quando alto é ruim). P1 e F2: alto é ruim.
- Papéis `agente_leitura` (só leitura) e `n8n_operacao`. Usuários de login e senhas ficam fora do git.
- Testes só rodam contra o Postgres descartável apontado por `DATABASE_URL_TEST`, **nunca contra o Supabase**.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `agente/pyproject.toml` | dependências e configuração do pytest |
| `agente/.gitignore` | ignorar ambiente virtual, caches e builds da base de conhecimento |
| `agente/dados/seeds/territorios.csv` | Brasil + 27 UFs, com sinônimos e gentílicos |
| `agente/dados/seeds/indicadores.json` | os 11 indicadores do doc 09 (pergunta, gatilhos, diagnóstico, o que monitorar) |
| `agente/dados/seeds/alertas.csv` | alertas de qualidade de dado (BA 2019, SC, PNADc em UFs pequenas, 2015, 2019) |
| `agente/dados/carregar_iie.py` | leitura dos arquivos e carga idempotente no esquema `iie` |
| `agente/supabase/migrations/0001_esquemas.sql` | extensões, esquemas e tabelas |
| `agente/supabase/migrations/0002_funcoes_iie.sql` | visões (semáforo, ganho, valores) e funções `iie.fn_*`; painel `app.vw_uso_diario` |
| `agente/supabase/migrations/0003_papeis_rls.sql` | papéis, permissões e RLS |
| `agente/tests/dados/test_leitores.py` | leitores de arquivos (sem banco) |
| `agente/tests/sql/conftest.py` | recria o banco de teste, aplica as migrações e carrega os dados |
| `agente/tests/sql/test_carga.py` | contagens da carga |
| `agente/tests/sql/test_funcoes_iie.py` | números, semáforo, ganho, ranking e práticas |
| `agente/tests/sql/test_permissoes.py` | o papel do agente só lê |

---

### Tarefa 1: Projeto `agente/` e leitura dos arquivos

**Arquivos:**
- Criar: `agente/pyproject.toml`, `agente/.gitignore`, `agente/dados/__init__.py`, `agente/dados/carregar_iie.py`, `agente/dados/seeds/*` (copiados de `projeto/planos/anexos/seeds/`)
- Teste: `agente/tests/__init__.py`, `agente/tests/dados/__init__.py`, `agente/tests/dados/test_leitores.py`

**Interfaces:**
- Produz:
  - `normalizar(texto: str) -> str`;
  - `ler_territorios(caminho) -> list[tuple]`;
  - `ler_oficial(caminho, id_por_sigla) -> list[tuple]`;
  - `ler_componentes(caminho, id_por_sigla) -> list[tuple]`;
  - `ler_matriz(caminho) -> tuple[list[tuple], list[tuple]]`;
  - `ler_indicadores(caminho) -> list[tuple]`;
  - `ler_alertas(caminho, id_por_sigla) -> list[tuple]`;
  - `carregar(conn, responsavel, anexos=ANEXOS, seeds=SEEDS) -> dict[str, int]`;
  - as constantes `ANEXOS` e `SEEDS`.

- [ ] **Passo 1: Criar a estrutura e o ambiente**

Na raiz do repositório:

```bash
mkdir -p agente/dados/seeds agente/tests/dados
cp projeto/planos/anexos/seeds/* agente/dados/seeds/
touch agente/dados/__init__.py agente/tests/__init__.py agente/tests/dados/__init__.py
```

`agente/pyproject.toml`:

```toml
[build-system]
requires = ["setuptools>=69"]
build-backend = "setuptools.build_meta"

[project]
name = "iie-conselheiro-agente"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["psycopg[binary]>=3.2"]

[project.optional-dependencies]
dev = ["pytest>=8"]

[tool.setuptools]
packages = ["dados"]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

`agente/.gitignore`:

```text
.venv/
__pycache__/
*.pyc
.pytest_cache/
kb/dist/
```

```bash
cd agente && python3.12 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
```

- [ ] **Passo 2: Escrever o teste que falha** — `agente/tests/dados/test_leitores.py`

```python
from dados.carregar_iie import (ANEXOS, SEEDS, ler_alertas, ler_componentes, ler_indicadores, ler_matriz,
                                ler_oficial, ler_territorios, normalizar)


def _ids():
    return {t[3]: t[0] for t in ler_territorios(SEEDS / "territorios.csv")}


def test_normalizar_remove_acento_e_caixa():
    assert normalizar("  Ceará ") == "ceara"


def test_territorios_tem_brasil_e_27_ufs():
    territorios = ler_territorios(SEEDS / "territorios.csv")
    assert len(territorios) == 28
    assert ("BR", "BR", "0", "BR", "Brasil", "Brasil", ["brasil", "pais", "nacional"]) in territorios


def test_oficial_vira_formato_longo():
    linhas = ler_oficial(ANEXOS / "iie_uf_oficial_2013_2019.csv", _ids())
    assert len(linhas) == 28 * 4 * 3
    assert ("UF-23", 2019, "EM", 21.2, "Fernandes, Felicio e Saad (2024), Tabela 7") in linhas


def test_componentes_mantem_metodos_de_2019():
    linhas = ler_componentes(ANEXOS / "iie_uf_reproducao.csv", _ids())
    metodos = {(l[1], l[2]) for l in linhas}
    assert metodos == {(2015, "regular"), (2017, "regular"), (2019, "2019_A_alternativa"),
                       (2019, "2019_B_procedimento_publicado")}


def test_matriz_ignora_base_e_pratica_tem_fonte_unica():
    praticas, vinculos = ler_matriz(ANEXOS / "matriz_indicador_pratica.csv")
    assert all(v[0] != "BASE" for v in vinculos)
    assert len(vinculos) == 133
    assert len({p[0] for p in praticas}) == len(praticas)


def test_indicadores_e_alertas():
    assert [i[0] for i in ler_indicadores(SEEDS / "indicadores.json")] == [
        "P1", "F2", "F1", "A1", "A2", "A3", "E1", "E2", "E3", "Q1", "D1"]
    alertas = ler_alertas(SEEDS / "alertas.csv", _ids())
    assert ("UF-29", 2019, "D1", "ambos", "alta") == alertas[0][:5]
```

- [ ] **Passo 3: Rodar e ver falhar**

Rode `pytest tests/dados -v`.
Esperado: ERRO de coleta com `ModuleNotFoundError: No module named 'dados.carregar_iie'`.

- [ ] **Passo 4: Implementar** — `agente/dados/carregar_iie.py`

```python
"""Carrega os dados do IIE, os indicadores, as práticas e os alertas no esquema `iie` do Supabase.

Uso (a partir de agente/):
    python -m dados.carregar_iie --database-url "$DATABASE_URL_CARGA" --responsavel "nome"
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import unicodedata
from pathlib import Path

import psycopg

AGENTE = Path(__file__).resolve().parents[1]
ANEXOS = AGENTE.parent / "contexto" / "anexos"
SEEDS = Path(__file__).resolve().parent / "seeds"

FONTE_OFICIAL = "Fernandes, Felicio e Saad (2024), Tabela 7"
FONTE_REPRODUCAO = "Reprodução a partir das bases do IIE (contexto/anexos/iie_uf_reproducao.csv)"
ETAPAS = ("AI", "AF", "EM")


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return sem_acento.strip().lower()


def _ler_csv(caminho: Path) -> list[dict[str, str]]:
    with open(caminho, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def ler_territorios(caminho: Path) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        sinonimos = [normalizar(s) for s in r["sinonimos"].split("|") if s.strip()]
        linhas.append((r["id"], r["tipo"], r["codigo_ibge"], r["sigla"], r["nome"], r["regiao"], sinonimos))
    return linhas


def ler_oficial(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        territorio = id_por_sigla[r["uf_sigla"]]
        for coluna, valor in r.items():
            if coluna == "uf_sigla" or valor == "":
                continue
            etapa, ano = coluna.split("_")
            if etapa not in ETAPAS:
                raise ValueError(f"coluna inesperada: {coluna}")
            linhas.append((territorio, int(ano), etapa, float(valor), FONTE_OFICIAL))
    return linhas


def ler_componentes(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        linhas.append((
            id_por_sigla[r["uf_sigla"]], int(r["ano"]), r["metodo"], False, float(r["IIE"]),
            float(r["pct_adiantado"]), float(r["pct_em_linha"]), float(r["pct_atrasado1"]),
            float(r["pct_atrasado2"]), float(r["pct_fora_escola"]), float(r["pct_concluiu_ate18"]),
            float(r["pct_basico_entre_concluintes"]), float(r["p_basico_adiantado"]),
            float(r["p_basico_em_linha"]), float(r["p_basico_atrasado1"]), float(r["coorte_ajustada"]),
            FONTE_REPRODUCAO,
        ))
    return linhas


def ler_matriz(caminho: Path) -> tuple[list[tuple], list[tuple]]:
    praticas: dict[str, tuple] = {}
    vinculos = []
    for ordem, r in enumerate(_ler_csv(caminho)):
        if r["indicador_id"] == "BASE":
            continue
        pratica = (r["pratica_id"], r["fonte"], r["documento"], r["linhas"])
        anterior = praticas.setdefault(r["pratica_id"], pratica)
        if anterior != pratica:
            raise ValueError(f"prática {r['pratica_id']} com fonte ou linhas divergentes: {anterior} x {pratica}")
        vinculos.append((r["indicador_id"], r["pratica_id"], r["nivel"], r["papel"], r["pratica"], r["o_que_fazer"], ordem))
    return list(praticas.values()), vinculos


def ler_indicadores(caminho: Path) -> list[tuple]:
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    return [(d["id"], d["nome"], d["grupo"], d["pergunta"], d["metrica"], d["sentido"], d["gatilho_atencao"],
             d["gatilho_critico"], d["significado"], d["diagnostico"], d["monitorar"], d["horizonte"]) for d in dados]


def ler_alertas(caminho: Path, id_por_sigla: dict[str, str]) -> list[tuple]:
    linhas = []
    for r in _ler_csv(caminho):
        territorio = id_por_sigla[r["sigla"]] if r["sigla"] else None
        ano = int(r["ano"]) if r["ano"] else None
        linhas.append((territorio, ano, r["indicador_id"] or None, r["natureza"], r["severidade"], r["texto"]))
    return linhas


def _hash_arquivos(caminhos: list[Path]) -> str:
    h = hashlib.sha256()
    for c in caminhos:
        h.update(c.read_bytes())
    return h.hexdigest()


def carregar(conn: psycopg.Connection, responsavel: str, anexos: Path = ANEXOS, seeds: Path = SEEDS) -> dict[str, int]:
    arquivos = {
        "territorios": seeds / "territorios.csv",
        "indicadores": seeds / "indicadores.json",
        "alertas": seeds / "alertas.csv",
        "oficial": anexos / "iie_uf_oficial_2013_2019.csv",
        "componentes": anexos / "iie_uf_reproducao.csv",
        "matriz": anexos / "matriz_indicador_pratica.csv",
    }
    territorios = ler_territorios(arquivos["territorios"])
    id_por_sigla = {t[3]: t[0] for t in territorios}
    oficial = ler_oficial(arquivos["oficial"], id_por_sigla)
    componentes = ler_componentes(arquivos["componentes"], id_por_sigla)
    praticas, vinculos = ler_matriz(arquivos["matriz"])
    indicadores = ler_indicadores(arquivos["indicadores"])
    alertas = ler_alertas(arquivos["alertas"], id_por_sigla)

    with conn.transaction(), conn.cursor() as cur:
        cur.executemany(
            """insert into iie.territorio (id, tipo, codigo_ibge, sigla, nome, regiao, sinonimos)
               values (%s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set tipo = excluded.tipo, codigo_ibge = excluded.codigo_ibge,
                 sigla = excluded.sigla, nome = excluded.nome, regiao = excluded.regiao, sinonimos = excluded.sinonimos""",
            territorios)
        cur.executemany(
            """insert into iie.resultado_oficial (territorio_id, ano, etapa, valor, fonte) values (%s, %s, %s, %s, %s)
               on conflict (territorio_id, ano, etapa) do update set valor = excluded.valor, fonte = excluded.fonte""",
            oficial)
        cur.executemany(
            """insert into iie.componente (territorio_id, ano, metodo, oficial, iie_reproduzido, pct_adiantado,
                 pct_em_linha, pct_atrasado1, pct_atrasado2, pct_fora_escola, pct_concluiu_ate18,
                 pct_basico_entre_concluintes, p_basico_adiantado, p_basico_em_linha, p_basico_atrasado1,
                 coorte_ajustada, fonte)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               on conflict (territorio_id, ano, metodo) do update set oficial = excluded.oficial,
                 iie_reproduzido = excluded.iie_reproduzido, pct_adiantado = excluded.pct_adiantado,
                 pct_em_linha = excluded.pct_em_linha, pct_atrasado1 = excluded.pct_atrasado1,
                 pct_atrasado2 = excluded.pct_atrasado2, pct_fora_escola = excluded.pct_fora_escola,
                 pct_concluiu_ate18 = excluded.pct_concluiu_ate18,
                 pct_basico_entre_concluintes = excluded.pct_basico_entre_concluintes,
                 p_basico_adiantado = excluded.p_basico_adiantado, p_basico_em_linha = excluded.p_basico_em_linha,
                 p_basico_atrasado1 = excluded.p_basico_atrasado1, coorte_ajustada = excluded.coorte_ajustada,
                 fonte = excluded.fonte""",
            componentes)
        cur.execute("delete from iie.indicador_pratica")
        cur.execute("delete from iie.alerta_dado")
        cur.executemany(
            """insert into iie.indicador (id, nome, grupo, pergunta, metrica, sentido, gatilho_atencao, gatilho_critico,
                 significado, diagnostico, monitorar, horizonte)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set nome = excluded.nome, grupo = excluded.grupo, pergunta = excluded.pergunta,
                 metrica = excluded.metrica, sentido = excluded.sentido, gatilho_atencao = excluded.gatilho_atencao,
                 gatilho_critico = excluded.gatilho_critico, significado = excluded.significado,
                 diagnostico = excluded.diagnostico, monitorar = excluded.monitorar, horizonte = excluded.horizonte""",
            indicadores)
        cur.executemany(
            """insert into iie.pratica (id, fonte, documento, linhas) values (%s, %s, %s, %s)
               on conflict (id) do update set fonte = excluded.fonte, documento = excluded.documento, linhas = excluded.linhas""",
            praticas)
        cur.executemany(
            """insert into iie.indicador_pratica (indicador_id, pratica_id, nivel, papel, nome, o_que_fazer, ordem)
               values (%s, %s, %s, %s, %s, %s, %s)""",
            vinculos)
        cur.executemany(
            """insert into iie.alerta_dado (territorio_id, ano, indicador_id, natureza, severidade, texto)
               values (%s, %s, %s, %s, %s, %s)""",
            alertas)
        contagem = {"territorios": len(territorios), "resultados_oficiais": len(oficial),
                    "componentes": len(componentes), "indicadores": len(indicadores), "praticas": len(praticas),
                    "vinculos": len(vinculos), "alertas": len(alertas)}
        cur.execute("insert into iie.carga (hash, linhas, responsavel) values (%s, %s, %s)",
                    (_hash_arquivos(list(arquivos.values())), json.dumps(contagem), responsavel))
    return contagem


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--responsavel", required=True)
    args = parser.parse_args(argv)
    with psycopg.connect(args.database_url) as conn:
        print(json.dumps(carregar(conn, args.responsavel), ensure_ascii=False))


if __name__ == "__main__":
    main()
```

- [ ] **Passo 5: Rodar e ver passar**

Rode `pytest tests/dados -v`. Esperado: 6 testes passam.

- [ ] **Passo 6: Commit**

```bash
git add agente/pyproject.toml agente/.gitignore agente/dados agente/tests
git commit -m "feat(dados): leitura dos arquivos do IIE, sementes e script de carga"
```

---

### Tarefa 2: Esquemas, tabelas e carga no banco de teste

**Arquivos:**
- Criar: `agente/supabase/migrations/0001_esquemas.sql`
- Teste: `agente/tests/sql/__init__.py`, `agente/tests/sql/conftest.py`, `agente/tests/sql/test_carga.py`

**Interfaces:**
- Consome `carregar` (Tarefa 1).
- Produz:
  - as tabelas `iie.territorio`, `iie.resultado_oficial`, `iie.componente`, `iie.indicador`, `iie.pratica`, `iie.indicador_pratica`, `iie.alerta_dado`, `iie.carga`;
  - as tabelas `app.usuario`, `app.solicitacao_acesso`, `app.conversa`, `app.mensagem`, `app.feedback`, `app.kb_versao`;
  - as *fixtures* pytest `banco` (conexão *autocommit* com o banco carregado) e `sql(consulta, *params)` (devolve a primeira coluna da primeira linha).

- [ ] **Passo 1: Subir o Postgres descartável**

```bash
docker run -d --name iie-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=iie -p 55432:5432 postgres:17-alpine
export DATABASE_URL_TEST=postgresql://postgres:teste@localhost:55432/iie
```

- [ ] **Passo 2: Escrever o teste que falha**

`agente/tests/sql/__init__.py`: arquivo vazio.

`agente/tests/sql/conftest.py`:

```python
"""Banco de teste: recria os esquemas, aplica as migrações e carrega os dados.

Requer DATABASE_URL_TEST apontando para um Postgres descartável (nunca produção).
"""
import os
from pathlib import Path

import psycopg
import pytest

from dados.carregar_iie import carregar

MIGRACOES = sorted((Path(__file__).resolve().parents[2] / "supabase" / "migrations").glob("*.sql"))


@pytest.fixture(scope="session")
def banco():
    url = os.environ.get("DATABASE_URL_TEST")
    if not url:
        pytest.skip("DATABASE_URL_TEST não definido")
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("drop schema if exists iie cascade; drop schema if exists app cascade")
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
```

`agente/tests/sql/test_carga.py`:

```python
def test_carga_completa(sql):
    contagens = {
        "iie.territorio": 28, "iie.resultado_oficial": 336, "iie.componente": 112, "iie.indicador": 11,
        "iie.pratica": 106, "iie.indicador_pratica": 133, "iie.alerta_dado": 10,
    }
    for tabela, esperado in contagens.items():
        assert sql(f"select count(*) from {tabela}") == esperado, tabela
    assert sql("select linhas ->> 'vinculos' from iie.carga order by id desc limit 1") == "133"


def test_sinonimos_sem_acento(sql):
    assert sql("select sinonimos from iie.territorio where sigla = 'CE'") == ["ceara", "cearense"]
```

- [ ] **Passo 3: Rodar e ver falhar**

Rode `pytest tests/sql -v`.
Esperado: ERRO na *fixture* `banco`, com `psycopg.errors.UndefinedTable: relation "iie.territorio" does not exist`.

- [ ] **Passo 4: Implementar** — `agente/supabase/migrations/0001_esquemas.sql`

```sql
-- IIE Conselheiro — 0001: extensões, esquemas e tabelas
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists iie;
create schema if not exists app;

-- ---------------------------------------------------------------- iie
create table iie.territorio (
  id          text primary key,                       -- 'BR', 'UF-23'
  tipo        text not null check (tipo in ('BR', 'UF', 'CAPITAL', 'MUNICIPIO')),
  codigo_ibge text not null,
  sigla       text not null unique,
  nome        text not null,
  regiao      text not null,
  uf_pai      text references iie.territorio (id),
  sinonimos   text[] not null default '{}'             -- minúsculas, sem acento
);

create table iie.resultado_oficial (
  territorio_id text not null references iie.territorio (id),
  ano           int  not null,
  etapa         text not null check (etapa in ('AI', 'AF', 'EM')),
  valor         numeric(6, 2) not null,
  fonte         text not null,
  primary key (territorio_id, ano, etapa)
);

create table iie.componente (
  territorio_id                text not null references iie.territorio (id),
  ano                          int  not null,
  metodo                       text not null,
  oficial                      boolean not null default false,
  iie_reproduzido              numeric(8, 3) not null,
  pct_adiantado                numeric(8, 3) not null,
  pct_em_linha                 numeric(8, 3) not null,
  pct_atrasado1                numeric(8, 3) not null,
  pct_atrasado2                numeric(8, 3) not null,
  pct_fora_escola              numeric(8, 3) not null,
  pct_concluiu_ate18           numeric(8, 3) not null,
  pct_basico_entre_concluintes numeric(8, 3) not null,
  p_basico_adiantado           numeric(8, 3) not null,
  p_basico_em_linha            numeric(8, 3) not null,
  p_basico_atrasado1           numeric(8, 3) not null,
  coorte_ajustada              numeric(14, 3) not null,
  fonte                        text not null,
  primary key (territorio_id, ano, metodo)
);

create table iie.indicador (
  id              text primary key,                   -- P1, F2, F1, A1, A2, A3, E1, E2, E3, Q1, D1
  nome            text not null,
  grupo           text not null,
  pergunta        text not null,
  metrica         text not null,
  sentido         text not null check (sentido in ('baixo_ruim', 'alto_ruim', 'nenhum')),
  gatilho_atencao text not null,
  gatilho_critico text not null,
  significado     text not null,
  diagnostico     text[] not null,
  monitorar       text[] not null,
  horizonte       text not null
);

create table iie.pratica (
  id        text primary key,                         -- GE-73, GE-SEC-68, SM-79, PE-11
  fonte     text not null check (fonte in ('MEC', 'Itaú Social', 'TPE')),
  documento text not null,
  linhas    text not null
);

create table iie.indicador_pratica (
  indicador_id text not null references iie.indicador (id),
  pratica_id   text not null references iie.pratica (id),
  nivel        text not null check (nivel in ('Escola', 'Secretaria', 'Estratégico')),
  papel        text not null check (papel in ('núcleo', 'complementar')),
  nome         text not null,
  o_que_fazer  text not null,
  ordem        int  not null,
  primary key (indicador_id, pratica_id)
);

create table iie.alerta_dado (
  id            serial primary key,
  territorio_id text references iie.territorio (id),  -- null = todos
  ano           int,                                  -- null = todos
  indicador_id  text references iie.indicador (id),
  natureza      text not null check (natureza in ('oficial', 'reproducao', 'ambos')),
  severidade    text not null check (severidade in ('info', 'media', 'alta')),
  texto         text not null
);

create table iie.carga (
  id           bigserial primary key,
  hash         text not null,
  linhas       jsonb not null,
  carregado_em timestamptz not null default now(),
  responsavel  text not null
);

-- ---------------------------------------------------------------- app
create table app.usuario (
  id              uuid primary key default gen_random_uuid(),
  telefone_e164   text unique check (telefone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  nome            text not null,
  perfil          text not null check (perfil in ('escola', 'secretaria_municipal', 'secretaria_estadual', 'equipe_interna')),
  instituicao     text,
  uf_padrao       text references iie.territorio (sigla),
  status          text not null default 'pendente' check (status in ('pendente', 'ativo', 'bloqueado', 'removido')),
  aceite_termo_em timestamptz,
  criado_em       timestamptz not null default now()
);

create table app.solicitacao_acesso (
  id            bigserial primary key,
  telefone_e164 text not null,
  mensagem      text,
  status        text not null default 'aberta' check (status in ('aberta', 'aprovada', 'recusada')),
  criado_em     timestamptz not null default now()
);

create table app.conversa (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null references app.usuario (id) on delete cascade,
  iniciada_em        timestamptz not null default now(),
  ultima_mensagem_em timestamptz not null default now()
);

create table app.mensagem (
  id                 uuid primary key default gen_random_uuid(),
  conversa_id        uuid not null references app.conversa (id) on delete cascade,
  wamid              text unique,
  papel              text not null check (papel in ('usuario', 'agente')),
  texto              text not null,
  ferramentas        jsonb,
  uso                jsonb,
  numeros_sem_origem jsonb,
  latencia_ms        int,
  modelo             text,
  kb_versao          text,
  erro               text,
  criado_em          timestamptz not null default now()
);
create index mensagem_conversa_criado on app.mensagem (conversa_id, criado_em);

create table app.feedback (
  id          bigserial primary key,
  mensagem_id uuid not null references app.mensagem (id) on delete cascade,
  nota        smallint not null check (nota in (-1, 1)),
  motivo      text,
  criado_em   timestamptz not null default now()
);

create table app.kb_versao (
  versao    text primary key,
  hash      text not null,
  tokens    int  not null,
  conteudo  text not null,
  ativa     boolean not null default false,
  avaliacao jsonb,
  criado_em timestamptz not null default now()
);
create unique index kb_versao_uma_ativa on app.kb_versao (ativa) where ativa;
```

- [ ] **Passo 5: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 8 testes passam (6 + 2).

- [ ] **Passo 6: Commit**

```bash
git add agente/supabase/migrations/0001_esquemas.sql agente/tests/sql
git commit -m "feat(dados): esquemas iie e app e carga validada em banco de teste"
```

---

### Tarefa 3: Visões e funções de consulta

**Arquivos:**
- Criar: `agente/supabase/migrations/0002_funcoes_iie.sql`
- Teste: `agente/tests/sql/test_funcoes_iie.py`

**Interfaces:**
- Consome as tabelas da Tarefa 2.
- Produz as funções usadas pelo serviço do agente (P2):
  - `iie.fn_resolver_territorio(text) -> iie.territorio`;
  - `iie.fn_alertas(text, int, text) -> jsonb`;
  - `iie.fn_consultar_iie(p_territorio text, p_etapa text default 'EM') -> jsonb`;
  - `iie.fn_decompor(p_territorio text, p_ano int) -> jsonb`;
  - `iie.fn_comparar(p_territorios text[], p_indicador text, p_ano int) -> jsonb`;
  - `iie.fn_ranking(p_indicador text, p_ano int, p_regiao text default null, p_limite int default 27) -> jsonb`;
  - `iie.fn_praticas(p_indicador text, p_nivel text default null, p_papel text default null) -> jsonb`.
- Produz também as visões `iie.vw_componente_vigente`, `iie.vw_indicador_valor`, `iie.vw_semaforo`, `iie.vw_ganho` e `app.vw_uso_diario`.
- Erros: território inexistente e ano sem dado devolvem `SQLSTATE P0002` (`NoDataFound`) com `hint`. Parâmetro inválido devolve `22023`.

- [ ] **Passo 1: Escrever o teste que falha** — `agente/tests/sql/test_funcoes_iie.py`

```python
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
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode `pytest tests/sql/test_funcoes_iie.py -v`.
Esperado: FALHA com `psycopg.errors.UndefinedFunction: function iie.fn_resolver_territorio(...) does not exist`.

- [ ] **Passo 3: Implementar** — `agente/supabase/migrations/0002_funcoes_iie.sql`

```sql
-- IIE Conselheiro — 0002: visões e funções de consulta (somente leitura)

create or replace function iie.norm(p text) returns text
language sql stable as $$ select lower(extensions.unaccent(trim(p))) $$;

-- Componentes vigentes: 2019 usa o procedimento publicado de imputação; demais anos, a fórmula regular.
create or replace view iie.vw_componente_vigente with (security_invoker = true) as
select *
from iie.componente
where metodo = case when ano = 2019 then '2019_B_procedimento_publicado' else 'regular' end;

-- Todos os indicadores numéricos em formato longo.
create or replace view iie.vw_indicador_valor with (security_invoker = true) as
with ofi as (
  select territorio_id, ano,
         max(valor) filter (where etapa = 'EM') as em,
         max(valor) filter (where etapa = 'AF') as af,
         max(valor) filter (where etapa = 'AI') as ai
  from iie.resultado_oficial
  group by territorio_id, ano
)
select territorio_id, ano, 'IIE'::text as indicador_id, em::numeric as valor, 'oficial'::text as natureza from ofi where em is not null
union all select territorio_id, ano, 'E1', ai, 'oficial' from ofi where ai is not null
union all select territorio_id, ano, 'E2', af, 'oficial' from ofi where af is not null
union all select territorio_id, ano, 'E2R', af / ai, 'oficial' from ofi where af is not null and ai > 0
union all select territorio_id, ano, 'E3', em / af, 'oficial' from ofi where em is not null and af > 0
union all select territorio_id, ano, 'P1', pct_fora_escola, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'F1', pct_concluiu_ate18, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'F2', pct_atrasado2, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'A1', pct_basico_entre_concluintes, 'reproducao' from iie.vw_componente_vigente
union all select territorio_id, ano, 'A2', p_basico_atrasado1, 'reproducao' from iie.vw_componente_vigente;

-- Semáforo: atenção = pior que o Brasil; crítico = quartil das piores UFs no ano.
create or replace view iie.vw_semaforo with (security_invoker = true) as
with base as (
  select v.*, t.tipo,
         case when v.indicador_id in ('P1', 'F2') then 'alto_ruim' else 'baixo_ruim' end as sentido
  from iie.vw_indicador_valor v
  join iie.territorio t on t.id = v.territorio_id
), ref as (
  select ano, indicador_id,
         max(valor) filter (where tipo = 'BR') as valor_br,
         percentile_cont(0.25) within group (order by valor) filter (where tipo = 'UF') as p25,
         percentile_cont(0.75) within group (order by valor) filter (where tipo = 'UF') as p75
  from base
  group by ano, indicador_id
)
select b.territorio_id, b.ano, b.indicador_id, b.valor, b.natureza, b.sentido,
       r.valor_br, r.p25, r.p75,
       case
         when b.tipo = 'BR' then 'referencia'
         when b.sentido = 'baixo_ruim' then
           case when b.valor < r.p25 then 'critico' when b.valor < r.valor_br then 'atencao' else 'ok' end
         else
           case when b.valor > r.p75 then 'critico' when b.valor > r.valor_br then 'atencao' else 'ok' end
       end as status
from base b
join ref r using (ano, indicador_id);

-- Ganho potencial: pontos de IIE se o componente chegasse ao nível do Brasil (IIE = (100 − F2 − P1) × A1 / 100).
create or replace view iie.vw_ganho with (security_invoker = true) as
with c as (
  select territorio_id, ano, pct_fora_escola as p1, pct_atrasado2 as f2, pct_basico_entre_concluintes as a1
  from iie.vw_componente_vigente
), br as (
  select ano, p1, f2, a1 from c where territorio_id = 'BR'
)
select c.territorio_id, c.ano,
       round((100 - c.f2 - c.p1) * greatest(br.a1 - c.a1, 0) / 100, 2) as ganho_a1,
       round(greatest(c.f2 - br.f2, 0) * c.a1 / 100, 2)               as ganho_f2,
       round(greatest(c.p1 - br.p1, 0) * c.a1 / 100, 2)               as ganho_p1
from c
join br using (ano)
where c.territorio_id <> 'BR';

create or replace function iie.fn_resolver_territorio(p_texto text)
returns iie.territorio language plpgsql stable as $$
declare
  v_norm text := iie.norm(p_texto);
  v_row  iie.territorio;
  v_sug  text;
begin
  select * into v_row
  from iie.territorio t
  where lower(t.sigla) = v_norm or iie.norm(t.nome) = v_norm or v_norm = any (t.sinonimos)
  limit 1;
  if found then
    return v_row;
  end if;
  select string_agg(q.nome, ', ' order by q.s desc) into v_sug
  from (
    select t.nome,
           greatest(extensions.similarity(iie.norm(t.nome), v_norm),
                    coalesce((select max(extensions.similarity(x, v_norm)) from unnest(t.sinonimos) x), 0)) as s
    from iie.territorio t
    order by 2 desc
    limit 3
  ) q;
  raise exception using errcode = 'P0002',
    message = format('territorio_nao_encontrado: %s', p_texto),
    hint = format('Talvez: %s', v_sug);
end $$;

create or replace function iie.fn_alertas(p_territorio_id text, p_ano int, p_natureza text)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('severidade', a.severidade, 'indicador', a.indicador_id,
                                               'ano', a.ano, 'texto', a.texto)
                            order by case a.severidade when 'alta' then 0 when 'media' then 1 else 2 end, a.id),
                  '[]'::jsonb)
  from iie.alerta_dado a
  where (a.territorio_id = p_territorio_id or a.territorio_id is null)
    and (p_ano is null or a.ano = p_ano or a.ano is null)
    and a.natureza in (p_natureza, 'ambos')
$$;

create or replace function iie.fn_consultar_iie(p_territorio text, p_etapa text default 'EM')
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  v_etapa text := upper(coalesce(p_etapa, 'EM'));
  v_ind   text := case upper(coalesce(p_etapa, 'EM')) when 'EM' then 'IIE' when 'AF' then 'E2' when 'AI' then 'E1' end;
  v_ult   int;
begin
  if v_ind is null then
    raise exception using errcode = '22023', message = format('etapa_invalida: %s (use EM, AF ou AI)', p_etapa);
  end if;
  select max(ano) into v_ult from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa;
  return jsonb_build_object(
    'territorio', jsonb_build_object('sigla', t.sigla, 'nome', t.nome, 'regiao', t.regiao),
    'etapa', v_etapa,
    'serie', (select jsonb_agg(jsonb_build_object('ano', ano, 'valor', valor) order by ano)
              from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa),
    'brasil', (select jsonb_agg(jsonb_build_object('ano', ano, 'valor', valor) order by ano)
               from iie.resultado_oficial where territorio_id = 'BR' and etapa = v_etapa),
    'posicao', case when t.tipo = 'UF' then (
                 select jsonb_build_object('ano', v_ult, 'posicao', r.pos, 'de', r.n)
                 from (select ro.territorio_id, rank() over (order by ro.valor desc) as pos, count(*) over () as n
                       from iie.resultado_oficial ro join iie.territorio tt on tt.id = ro.territorio_id
                       where ro.etapa = v_etapa and ro.ano = v_ult and tt.tipo = 'UF') r
                 where r.territorio_id = t.id) end,
    'status_ultimo_ano', (select status from iie.vw_semaforo
                          where territorio_id = t.id and ano = v_ult and indicador_id = v_ind),
    'natureza', 'oficial',
    'fonte', (select fonte from iie.resultado_oficial where territorio_id = t.id and etapa = v_etapa limit 1),
    'alertas', iie.fn_alertas(t.id, null, 'oficial')
  );
end $$;

create or replace function iie.fn_decompor(p_territorio text, p_ano int)
returns jsonb language plpgsql stable as $$
declare
  t       iie.territorio := iie.fn_resolver_territorio(p_territorio);
  c       iie.vw_componente_vigente;
  g       iie.vw_ganho;
  v_prior jsonb;
begin
  select * into c from iie.vw_componente_vigente where territorio_id = t.id and ano = p_ano;
  if not found then
    raise exception using errcode = 'P0002',
      message = format('sem_componentes: %s em %s (anos disponíveis: 2015, 2017, 2019)', t.nome, p_ano);
  end if;
  select * into g from iie.vw_ganho where territorio_id = t.id and ano = p_ano;
  select coalesce(jsonb_agg(x.k order by x.v desc), '[]'::jsonb) into v_prior
  from (values ('A1', g.ganho_a1), ('F2', g.ganho_f2), ('P1', g.ganho_p1)) as x (k, v)
  where x.v >= 0.05;
  return jsonb_build_object(
    'territorio', jsonb_build_object('sigla', t.sigla, 'nome', t.nome, 'regiao', t.regiao),
    'ano', p_ano,
    'iie_oficial', (select valor from iie.resultado_oficial where territorio_id = t.id and ano = p_ano and etapa = 'EM'),
    'iie_reproduzido', round(c.iie_reproduzido, 1),
    'componentes', jsonb_build_object(
      'F1_conclui_ate_18', round(c.pct_concluiu_ate18, 1),
      'F2_atraso_2_ou_mais', round(c.pct_atrasado2, 1),
      'P1_fora_da_escola_sem_em', round(c.pct_fora_escola, 1),
      'A1_basico_entre_concluintes', round(c.pct_basico_entre_concluintes, 1),
      'A2_basico_atrasados_1_ano', round(c.p_basico_atrasado1, 1),
      'distancia_em_linha_menos_atrasados_pp', round(c.p_basico_em_linha - c.p_basico_atrasado1, 1)),
    'trajetoria', jsonb_build_object(
      'adiantados', round(c.pct_adiantado, 1), 'em_linha', round(c.pct_em_linha, 1),
      'atraso_1_ano', round(c.pct_atrasado1, 1), 'atraso_2_ou_mais', round(c.pct_atrasado2, 1),
      'fora_da_escola', round(c.pct_fora_escola, 1)),
    'basico_por_trajetoria', jsonb_build_object(
      'adiantados', round(c.p_basico_adiantado, 1), 'em_linha', round(c.p_basico_em_linha, 1),
      'atraso_1_ano', round(c.p_basico_atrasado1, 1)),
    'semaforo', (select jsonb_object_agg(indicador_id, status) from iie.vw_semaforo
                 where territorio_id = t.id and ano = p_ano),
    'brasil', (select jsonb_object_agg(indicador_id, round(valor, 1)) from iie.vw_indicador_valor
               where territorio_id = 'BR' and ano = p_ano and indicador_id in ('P1', 'F1', 'F2', 'A1', 'A2')),
    'ganho_potencial', case when t.tipo = 'BR' then null
                            else jsonb_build_object('A1', g.ganho_a1, 'F2', g.ganho_f2, 'P1', g.ganho_p1) end,
    'prioridade', case when t.tipo = 'BR' then '[]'::jsonb else v_prior end,
    'identidade', 'IIE = (100 - F2 - P1) x A1 / 100',
    'natureza', 'reproducao',
    'metodo', c.metodo,
    'fonte', c.fonte,
    'alertas', iie.fn_alertas(t.id, p_ano, 'reproducao')
  );
end $$;

create or replace function iie.fn_comparar(p_territorios text[], p_indicador text, p_ano int)
returns jsonb language plpgsql stable as $$
declare
  v_ids text[] := '{}';
  v_ind text := upper(p_indicador);
  v_res jsonb;
  x     text;
begin
  if coalesce(array_length(p_territorios, 1), 0) not between 2 and 6 then
    raise exception using errcode = '22023', message = 'informe de 2 a 6 territórios';
  end if;
  foreach x in array p_territorios loop
    v_ids := v_ids || (iie.fn_resolver_territorio(x)).id;
  end loop;
  select jsonb_agg(jsonb_build_object('sigla', t.sigla, 'nome', t.nome,
                                      'valor', round(s.valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end),
                                      'status', s.status)
                   order by array_position(v_ids, t.id))
    into v_res
  from iie.vw_semaforo s join iie.territorio t on t.id = s.territorio_id
  where s.territorio_id = any (v_ids) and s.indicador_id = v_ind and s.ano = p_ano;
  if v_res is null then
    raise exception using errcode = 'P0002', message = format('sem_dados: %s em %s', v_ind, p_ano);
  end if;
  return jsonb_build_object(
    'indicador', v_ind, 'ano', p_ano, 'valores', v_res,
    'brasil', (select round(valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end)
               from iie.vw_indicador_valor where territorio_id = 'BR' and indicador_id = v_ind and ano = p_ano),
    'natureza', case when v_ind in ('IIE', 'E1', 'E2', 'E2R', 'E3') then 'oficial' else 'reproducao' end);
end $$;

create or replace function iie.fn_ranking(p_indicador text, p_ano int, p_regiao text default null, p_limite int default 27)
returns jsonb language plpgsql stable as $$
declare
  v_ind text := upper(p_indicador);
  v_res jsonb;
begin
  select jsonb_agg(jsonb_build_object('posicao', r.pos, 'sigla', r.sigla, 'nome', r.nome, 'regiao', r.regiao,
                                      'valor', round(r.valor, case when v_ind in ('E2R', 'E3') then 2 else 1 end),
                                      'status', r.status) order by r.pos, r.sigla)
    into v_res
  from (
    select t.sigla, t.nome, t.regiao, s.valor, s.status,
           rank() over (order by case when s.sentido = 'alto_ruim' then s.valor else -s.valor end) as pos
    from iie.vw_semaforo s join iie.territorio t on t.id = s.territorio_id
    where s.indicador_id = v_ind and s.ano = p_ano and t.tipo = 'UF'
      and (p_regiao is null or iie.norm(t.regiao) = iie.norm(p_regiao))
  ) r
  where r.pos <= p_limite;
  if v_res is null then
    raise exception using errcode = 'P0002', message = format('sem_dados: %s em %s', v_ind, p_ano);
  end if;
  return jsonb_build_object('indicador', v_ind, 'ano', p_ano, 'ordem', 'melhor_primeiro', 'regiao', p_regiao,
                            'ranking', v_res,
                            'natureza', case when v_ind in ('IIE', 'E1', 'E2', 'E2R', 'E3') then 'oficial' else 'reproducao' end);
end $$;

create or replace function iie.fn_praticas(p_indicador text, p_nivel text default null, p_papel text default null)
returns jsonb language plpgsql stable as $$
declare
  i iie.indicador;
begin
  select * into i from iie.indicador where id = upper(p_indicador);
  if not found then
    raise exception using errcode = 'P0002', message = format('indicador_desconhecido: %s', p_indicador);
  end if;
  return jsonb_build_object(
    'indicador', to_jsonb(i),
    'praticas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nivel', ip.nivel, 'papel', ip.papel, 'nome', ip.nome,
                                          'o_que_fazer', ip.o_que_fazer, 'fonte', p.fonte,
                                          'documento', p.documento, 'linhas', p.linhas)
                       order by case ip.papel when 'núcleo' then 0 else 1 end, ip.ordem)
      from iie.indicador_pratica ip join iie.pratica p on p.id = ip.pratica_id
      where ip.indicador_id = i.id
        and (p_nivel is null or iie.norm(ip.nivel) = iie.norm(p_nivel))
        and (p_papel is null or iie.norm(ip.papel) = iie.norm(p_papel))), '[]'::jsonb));
end $$;

-- Painel de uso (preços de claude-opus-5 por milhão de tokens: entrada 5; leitura de cache 0,5; escrita 1 h 10; saída 25).
create or replace view app.vw_uso_diario with (security_invoker = true) as
with uso as (
  select m.criado_em::date as dia,
         count(*) filter (where m.papel = 'agente') as respostas,
         sum((m.uso ->> 'input')::bigint) as tokens_entrada,
         sum((m.uso ->> 'cache_read')::bigint) as tokens_cache_leitura,
         sum((m.uso ->> 'cache_write')::bigint) as tokens_cache_escrita,
         sum((m.uso ->> 'output')::bigint) as tokens_saida,
         round(sum(coalesce((m.uso ->> 'input')::numeric, 0) * 5 + coalesce((m.uso ->> 'cache_read')::numeric, 0) * 0.5
                 + coalesce((m.uso ->> 'cache_write')::numeric, 0) * 10 + coalesce((m.uso ->> 'output')::numeric, 0) * 25) / 1e6, 4) as custo_usd,
         percentile_cont(0.5) within group (order by m.latencia_ms) filter (where m.papel = 'agente') as latencia_p50_ms,
         percentile_cont(0.95) within group (order by m.latencia_ms) filter (where m.papel = 'agente') as latencia_p95_ms
  from app.mensagem m
  group by m.criado_em::date
), avaliacao as (
  select f.criado_em::date as dia, count(*) filter (where f.nota = -1)::numeric / count(*) as taxa_negativa
  from app.feedback f
  group by f.criado_em::date
)
select uso.*, avaliacao.taxa_negativa
from uso
left join avaliacao using (dia);
```

- [ ] **Passo 4: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 21 testes passam.

- [ ] **Passo 5: Commit**

```bash
git add agente/supabase/migrations/0002_funcoes_iie.sql agente/tests/sql/test_funcoes_iie.py
git commit -m "feat(dados): funções iie.fn_* com semáforo, ganho potencial, ranking e práticas"
```

---

### Tarefa 4: Papéis, permissões e RLS

**Arquivos:**
- Criar: `agente/supabase/migrations/0003_papeis_rls.sql`
- Teste: `agente/tests/sql/test_permissoes.py`

**Interfaces:**
- Produz os papéis `agente_leitura` e `n8n_operacao` (NOLOGIN).
- Com esses papéis:
  - o agente lê `iie.*`, `app.mensagem` e `app.kb_versao` e não escreve nada;
  - o n8n opera `app.*`.

- [ ] **Passo 1: Escrever o teste que falha** — `agente/tests/sql/test_permissoes.py`

```python
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
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode `pytest tests/sql/test_permissoes.py -v`.
Esperado: FALHA com `psycopg.errors.InvalidParameterValue: role "agente_leitura" does not exist`.

- [ ] **Passo 3: Implementar** — `agente/supabase/migrations/0003_papeis_rls.sql`

```sql
-- IIE Conselheiro — 0003: papéis, permissões e RLS
-- Os papéis são NOLOGIN. Os usuários de conexão são criados fora do git (ver P1, Tarefa 6).
do $$
begin
  if not exists (select from pg_roles where rolname = 'agente_leitura') then
    create role agente_leitura nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'n8n_operacao') then
    create role n8n_operacao nologin;
  end if;
end $$;

grant usage on schema iie, app, extensions to agente_leitura, n8n_operacao;

grant select on all tables in schema iie to agente_leitura, n8n_operacao;
grant execute on all functions in schema iie to agente_leitura, n8n_operacao;

grant select on app.mensagem, app.kb_versao to agente_leitura;
grant select, insert, update, delete on all tables in schema app to n8n_operacao;
grant usage, select on all sequences in schema app to n8n_operacao;

do $$
declare
  r record;
begin
  for r in select schemaname, tablename from pg_tables where schemaname in ('iie', 'app') loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
  end loop;

  for r in select tablename from pg_tables where schemaname = 'iie' loop
    execute format('drop policy if exists leitura on iie.%I', r.tablename);
    execute format('create policy leitura on iie.%I for select to agente_leitura, n8n_operacao using (true)', r.tablename);
  end loop;

  for r in select tablename from pg_tables where schemaname = 'app' loop
    execute format('drop policy if exists operacao on app.%I', r.tablename);
    execute format('create policy operacao on app.%I for all to n8n_operacao using (true) with check (true)', r.tablename);
  end loop;

  drop policy if exists agente_le on app.mensagem;
  create policy agente_le on app.mensagem for select to agente_leitura using (true);
  drop policy if exists agente_le on app.kb_versao;
  create policy agente_le on app.kb_versao for select to agente_leitura using (true);
end $$;
```

- [ ] **Passo 4: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 22 testes passam.

Rode a migração 0003 e a carga uma segunda vez para provar que são idempotentes. Esperado: nenhum erro e o mesmo JSON de contagens.

```bash
psql "$DATABASE_URL_TEST" -v ON_ERROR_STOP=1 -f supabase/migrations/0003_papeis_rls.sql
python -m dados.carregar_iie --database-url "$DATABASE_URL_TEST" --responsavel teste
```

Esperado na carga: `{"territorios": 28, "resultados_oficiais": 336, "componentes": 112, "indicadores": 11, "praticas": 106, "vinculos": 133, "alertas": 10}`.

- [ ] **Passo 5: Commit**

```bash
git add agente/supabase/migrations/0003_papeis_rls.sql agente/tests/sql/test_permissoes.py
git commit -m "feat(dados): papéis agente_leitura e n8n_operacao com RLS"
```

---

### Tarefa 5: Aplicar no Supabase (desenvolvimento e depois produção)

Esta tarefa é operacional e não tem código novo. Faça primeiro no projeto (ou *branch*) de desenvolvimento e repita em produção só depois de a P2 estar aprovada.

**Interfaces:**
- Produz os usuários de login `agente_app` (membro de `agente_leitura`) e `n8n_app` (membro de `n8n_operacao`).
- As *strings* de conexão desses usuários vão para o cofre de segredos. O serviço do agente (P2) e o n8n (P4) as consomem.

- [ ] **Passo 1: Aplicar as migrações**

Use a *connection string* de sessão (porta 5432) do painel do Supabase, com o usuário `postgres`.

```bash
export SUPABASE_DB_URL='postgresql://postgres:<senha do painel>@<host do painel>:5432/postgres'
for f in agente/supabase/migrations/000*.sql; do psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f" || break; done
```

Esperado: nenhum `ERROR`.

- [ ] **Passo 2: Criar os usuários de login**

```bash
SENHA_AGENTE=$(openssl rand -base64 24); SENHA_N8N=$(openssl rand -base64 24)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v s1="$SENHA_AGENTE" -v s2="$SENHA_N8N" <<'SQL'
create role agente_app login password :'s1' in role agente_leitura;
create role n8n_app login password :'s2' in role n8n_operacao;
SQL
echo "Guardar no cofre -> agente_app: $SENHA_AGENTE | n8n_app: $SENHA_N8N"
```

No *pooler* do Supabase, o usuário da *string* de conexão é `agente_app.<project-ref>`.

- [ ] **Passo 3: Carregar os dados**

```bash
cd agente && . .venv/bin/activate
python -m dados.carregar_iie --database-url "$SUPABASE_DB_URL" --responsavel "<seu nome>"
```

Esperado: o mesmo JSON de contagens da Tarefa 4.

- [ ] **Passo 4: Conferir com o usuário do agente**

```bash
psql "postgresql://agente_app.<project-ref>:$SENHA_AGENTE@<host do pooler>:5432/postgres" -c "select iie.fn_consultar_iie('CE') -> 'serie'"
psql "postgresql://agente_app.<project-ref>:$SENHA_AGENTE@<host do pooler>:5432/postgres" -c "insert into iie.alerta_dado (natureza, severidade, texto) values ('ambos','info','x')"
```

Esperado:
- a primeira consulta devolve `[{"ano": 2013, "valor": 10.70}, …, {"ano": 2019, "valor": 21.20}]`;
- a segunda falha com `permission denied`.

- [ ] **Passo 5: Conferir os avisos de segurança**

No painel do Supabase, abra Advisors → Security. Esperado: nenhum aviso de "RLS disabled" nas tabelas de `iie` e `app`. Registre o resultado na descrição do PR.
