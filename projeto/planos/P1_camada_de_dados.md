# P1 — Camada de dados no Supabase: plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.
>
> **Versão 2, 2026-10-13.** Revisada para o site ([proposta 03](../03_proposta_sistema_web.md)) e para a base de práticas completa. As Tarefas 1 a 7 foram **executadas e validadas** em 2026-10-13, na *branch* `feat/p1-camada-de-dados`: 68 testes passando num Postgres 17 descartável. O código abaixo é o que está no repositório. A Tarefa 8 foi aplicada no Supabase auto-hospedado de desenvolvimento em 2026-10-13, com Postgres 15.8. Ficaram pendentes 3 passos que dependem do responsável: expor o esquema `app`, criar o primeiro administrador e trocar as chaves de demonstração.

**Objetivo:** criar no Supabase os esquemas `iie` e `app` com:
- os dados do IIE;
- a base completa de práticas: catálogo de 541 práticas e toda a relação do doc 09;
- as regras do site: cadastro, administração e RLS;
- as funções SQL somente leitura que o agente no n8n usa como ferramentas.

**Arquitetura:**
- Migrações SQL versionadas em `agente/supabase/migrations/` (0001 a 0005).
- Um script de carga idempotente (`agente/dados/carregar_iie.py`), que lê os CSVs de `contexto/anexos/` e as sementes.
- Um conferidor do catálogo (`agente/dados/conferir_catalogo.py`).
- Tudo é testado com pytest num Postgres 17 descartável. O que o Supabase já traz (esquema `auth`, `auth.uid()`, papéis `anon` e `authenticated`) é simulado nos testes.

**Stack:** PostgreSQL 17 (Supabase), extensões `unaccent` e `pg_trgm`, Python 3.12 ou mais novo, psycopg 3, pytest.

**Especificação:**
- [`03_proposta_sistema_web.md`](../03_proposta_sistema_web.md): seções 5.4 (ferramentas), 6 (dados) e 8 (qualidade);
- [`01_proposta_arquitetura.md`](../01_proposta_arquitetura.md): seção 6.3 (as 5 ferramentas originais);
- [`02_plano_desenvolvimento.md`](../02_plano_desenvolvimento.md): seção 5.

## Restrições globais

- PostgreSQL 15 ou mais novo. O Supabase de desenvolvimento roda a 15.8, e a suíte foi validada na 15 e na 17. Extensões no esquema `extensions` (padrão do Supabase).
- `iie` (analítico) **não** é exposto na API do Supabase. `app` (operação) **é** exposto, sempre com RLS.
- **Funções `iie.fn_*`:** `STABLE`, somente leitura, devolvem `jsonb`.
  - As de dados trazem `natureza` (`oficial` ou `reproducao`), `fonte` e `alertas`.
  - As de práticas trazem `fonte` e `linhas`.
- **Fontes únicas:**
  - `contexto/anexos/iie_uf_oficial_2013_2019.csv`;
  - `contexto/anexos/iie_uf_reproducao.csv`;
  - `contexto/anexos/matriz_indicador_pratica.csv`;
  - `contexto/anexos/catalogo_praticas.csv`;
  - as sementes em `agente/dados/seeds/`.
- **Componentes vigentes:** 2015 e 2017 com `metodo = 'regular'`; 2019 com `metodo = '2019_B_procedimento_publicado'`.
- **Semáforo:**
  - atenção = pior que o Brasil;
  - crítico = quartil das piores UFs no mesmo ano (P25 quando baixo é ruim; P75 quando alto é ruim);
  - em P1 e F2, alto é ruim.
- **IDs de prática:** GE-01 a GE-279, GE-SEC-01 a GE-SEC-93, SM-01 a SM-117, PE-01 a PE-52 (no mínimo 2 dígitos). Os 147 IDs usados na matriz e no doc 09 (as **âncoras**) não mudam de linha.
- **Papéis:**
  - `agente_leitura`: ferramentas do agente; só lê `iie`;
  - `n8n_operacao`: grava só `app.mensagem` e `app.agente_memoria`;
  - `authenticated`: usuário do site, sob RLS.
- Datas de cota e de painel no fuso `America/Sao_Paulo`.
- Testes só rodam contra o Postgres descartável apontado por `DATABASE_URL_TEST`, **nunca contra o Supabase**.

## Pontos de atenção na revisão

1. **Apagar conversas para zerar o limite diário:** a cota fica em `app.cota_diaria`, que o usuário não apaga. Teste na Tarefa 5: `test_limite_diario_conta_perguntas_e_nao_zera_ao_apagar_conversa`.
2. **Cadastro com município de outra UF, UF `BR` ou sem aceite do termo:** recusado pelo gatilho. Teste na Tarefa 5: `test_cadastro_invalido_e_recusado`.
3. **Usuário pendente ou comum tentando criar conversa para outro, aprovar a si mesmo ou virar administrador:** negado pela RLS. Testes na Tarefa 5: `test_so_ativo_cria_conversa_e_so_para_si` e `test_so_admin_muda_status_e_fica_registrado`.
4. **Exclusão de conta deixando a memória do agente para trás** (texto das conversas, dado pessoal): o gatilho de conversa apaga a memória. Teste na Tarefa 5: `test_excluir_conta_apaga_tudo`.
5. **Busca de práticas com ou sem acento, ou com uma palavra que não existe:** mesmo resultado, ou nova tentativa com qualquer uma das palavras. Teste na Tarefa 7: `test_buscar_sem_acento_e_com_qualquer_palavra`.

## Arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `agente/pyproject.toml`, `agente/.gitignore` | dependências e configuração do pytest | 1 |
| `agente/dados/seeds/territorios.csv`, `indicadores.json`, `alertas.csv` | Brasil e 27 UFs; os 11 indicadores; alertas de dado | 1 |
| `agente/dados/carregar_iie.py` | leitura dos arquivos e carga idempotente no esquema `iie` | 1 e 7 |
| `agente/supabase/migrations/0001_esquemas.sql` | extensões, esquemas e tabelas (`iie` e `app` do site) | 2 |
| `agente/supabase/migrations/0002_funcoes_iie.sql` | visões (semáforo, ganho) e funções `iie.fn_*`; painel `app.vw_uso_diario` | 3 |
| `agente/supabase/migrations/0003_papeis_rls.sql` | papéis `agente_leitura` e `n8n_operacao`, permissões e RLS | 4 |
| `agente/supabase/migrations/0004_app_site.sql` | cadastro pelo Supabase Auth, administração, cota diária, RLS do usuário logado | 5 |
| `agente/dados/conferir_catalogo.py` | confere o catálogo contra as âncoras; lê citações do doc 09 | 6 |
| `contexto/anexos/catalogo_praticas.csv`, `catalogo_praticas_revisao.md` | as 541 práticas; método e revisão | 6 |
| `agente/supabase/migrations/0005_base_de_praticas.sql` | catálogo com busca, pré-condições, perfis, lacunas, `fn_buscar_praticas`, `fn_pacote` | 7 |
| `agente/dados/seeds/perfis.json`, `lacunas.json` | pacotes por perfil (doc 09 §7) e lacunas (doc 09 §8) | 7 |
| `agente/tests/sql/supabase_simulado.sql` | simula `auth.users`, `auth.uid()` e os papéis do Supabase nos testes | 2 |
| `agente/tests/…` | testes de cada tarefa | 1 a 7 |

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
- A Tarefa 7 amplia `carregar_iie.py` com a base de práticas.

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
*.egg-info/
kb/dist/
```

```bash
cd agente && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
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

Rode `pytest tests/dados/test_leitores.py -v`.
Esperado: ERRO de coleta com `ModuleNotFoundError: No module named 'dados.carregar_iie'`.

- [ ] **Passo 4: Implementar** — `agente/dados/carregar_iie.py` (versão desta tarefa; a Tarefa 7 a amplia)

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

Rode `pytest tests/dados/test_leitores.py -v`. Esperado: 6 testes passam.

- [ ] **Passo 6: Commit**

```bash
git add agente/pyproject.toml agente/.gitignore agente/dados agente/tests
git commit -m "feat(dados): leitura dos arquivos do IIE, sementes e script de carga"
```

---

### Tarefa 2: Esquemas, tabelas e carga no banco de teste

**Arquivos:**
- Criar: `agente/supabase/migrations/0001_esquemas.sql`
- Teste: `agente/tests/sql/__init__.py`, `agente/tests/sql/supabase_simulado.sql`, `agente/tests/sql/conftest.py`, `agente/tests/sql/test_carga.py`

**Interfaces:**
- Consome `carregar` (Tarefa 1).
- Produz:
  - as tabelas `iie.territorio`, `iie.resultado_oficial`, `iie.componente`, `iie.indicador`, `iie.pratica`, `iie.indicador_pratica`, `iie.alerta_dado`, `iie.carga`;
  - as tabelas do site `app.usuario` (ligada a `auth.users`), `app.conversa`, `app.mensagem`, `app.feedback`, `app.cota_diaria`, `app.kb_versao`, `app.agente_memoria`;
  - as *fixtures* pytest `banco` (conexão *autocommit* com o banco carregado) e `sql(consulta, *params)` (devolve a primeira coluna da primeira linha).

- [ ] **Passo 1: Subir o Postgres descartável**

```bash
docker run -d --name iie-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=iie -p 55432:5432 postgres:17-alpine
export DATABASE_URL_TEST=postgresql://postgres:teste@localhost:55432/iie
```

- [ ] **Passo 2: Escrever o teste que falha**

`agente/tests/sql/__init__.py`: arquivo vazio.

`agente/tests/sql/supabase_simulado.sql`. Este arquivo não é aplicado no Supabase, que já tem tudo isso:

```sql
-- Simula, no Postgres de teste, o que o Supabase já traz: o esquema auth, auth.users, auth.uid()
-- e os papéis anon, authenticated e service_role. Não é aplicado no Supabase.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
```

`agente/tests/sql/conftest.py`:

```python
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
```

`agente/tests/sql/test_carga.py` (versão desta tarefa; a Tarefa 7 atualiza as contagens de práticas):

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


def test_tabelas_do_app_para_o_site(sql):
    tabelas = sql("""select array_agg(table_name::text order by table_name) from information_schema.tables
                     where table_schema = 'app' and table_type = 'BASE TABLE'""")
    assert tabelas == ["agente_memoria", "conversa", "cota_diaria", "feedback", "kb_versao", "mensagem", "usuario"]
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
-- Usuários do site: um por conta do Supabase Auth (auth.users), criado pelo gatilho da migração 0004.
create table app.usuario (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  nome            text not null check (length(trim(nome)) between 2 and 120),
  perfil          text not null check (perfil in ('escola', 'secretaria_municipal', 'secretaria_estadual',
                                                  'equipe_interna', 'outro')),
  instituicao     text not null check (length(trim(instituicao)) between 2 and 200),
  uf              text not null references iie.territorio (sigla),
  municipio_ibge  text not null check (municipio_ibge ~ '^[0-9]{7}$'),
  municipio_nome  text not null,
  status          text not null default 'pendente' check (status in ('pendente', 'ativo', 'recusado', 'bloqueado')),
  papel           text not null default 'usuario' check (papel in ('usuario', 'admin')),
  aceite_termo_em timestamptz not null,
  decidido_por    uuid references app.usuario (id) on delete set null,
  decidido_em     timestamptz,
  telefone_e164   text unique check (telefone_e164 ~ '^\+[1-9][0-9]{7,14}$'),  -- fase WhatsApp
  criado_em       timestamptz not null default now()
);

create table app.conversa (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references app.usuario (id) on delete cascade,
  titulo        text not null check (length(trim(titulo)) between 1 and 120),
  canal         text not null default 'web' check (canal in ('web', 'whatsapp')),
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index conversa_usuario_atualizada on app.conversa (usuario_id, atualizada_em desc);

-- Escrita só pelo n8n (papel n8n_operacao).
create table app.mensagem (
  id                  uuid primary key default gen_random_uuid(),
  conversa_id         uuid not null references app.conversa (id) on delete cascade,
  papel               text not null check (papel in ('usuario', 'agente')),
  texto               text not null,
  ferramentas         jsonb,
  numeros_sem_origem  jsonb,
  praticas_sem_origem jsonb,
  latencia_ms         int,
  modelo              text,
  kb_versao           text,
  erro                text,
  wamid               text unique,                     -- fase WhatsApp
  criado_em           timestamptz not null default now()
);
create index mensagem_conversa_criado on app.mensagem (conversa_id, criado_em);

create table app.feedback (
  mensagem_id uuid not null references app.mensagem (id) on delete cascade,
  usuario_id  uuid not null references app.usuario (id) on delete cascade,
  nota        smallint not null check (nota in (-1, 1)),
  motivo      text check (length(motivo) <= 500),
  criado_em   timestamptz not null default now(),
  primary key (mensagem_id, usuario_id)
);

-- Perguntas por usuário e dia (fuso de Brasília). Separada de app.mensagem para que apagar uma
-- conversa não zere o limite diário.
create table app.cota_diaria (
  usuario_id uuid not null references app.usuario (id) on delete cascade,
  dia        date not null,
  perguntas  int  not null default 0,
  primary key (usuario_id, dia)
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

-- Memória do agente no n8n (nó Postgres Chat Memory; formato do LangChain). session_id = id da conversa.
create table app.agente_memoria (
  id         serial primary key,
  session_id varchar(255) not null,
  message    jsonb not null
);
create index agente_memoria_sessao on app.agente_memoria (session_id, id);
```

- [ ] **Passo 5: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 9 testes passam (6 + 3).

- [ ] **Passo 6: Commit**

```bash
git add agente/supabase/migrations/0001_esquemas.sql agente/tests/sql
git commit -m "feat(dados): esquemas iie e app (site) e carga validada em banco de teste"
```

---

### Tarefa 3: Visões e funções de consulta

**Arquivos:**
- Criar: `agente/supabase/migrations/0002_funcoes_iie.sql`
- Teste: `agente/tests/sql/test_funcoes_iie.py`

**Interfaces:**
- Consome as tabelas da Tarefa 2.
- Produz as funções usadas pelas ferramentas do agente (P2):
  - `iie.fn_resolver_territorio(text) -> iie.territorio`;
  - `iie.fn_alertas(text, int, text) -> jsonb`;
  - `iie.fn_consultar_iie(p_territorio text, p_etapa text default 'EM') -> jsonb`;
  - `iie.fn_decompor(p_territorio text, p_ano int) -> jsonb`;
  - `iie.fn_comparar(p_territorios text[], p_indicador text, p_ano int) -> jsonb`;
  - `iie.fn_ranking(p_indicador text, p_ano int, p_regiao text default null, p_limite int default 27) -> jsonb`;
  - `iie.fn_praticas(p_indicador text, p_nivel text default null, p_papel text default null) -> jsonb` (a Tarefa 7 acrescenta as lacunas).
- Produz também as visões `iie.vw_componente_vigente`, `iie.vw_indicador_valor`, `iie.vw_semaforo`, `iie.vw_ganho` e `app.vw_uso_diario`.
- **Erros:**
  - território inexistente e ano sem dado devolvem `SQLSTATE P0002` (`NoDataFound`) com `hint`;
  - parâmetro inválido devolve `22023`.

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

-- Painel de uso por dia (fuso de Brasília). O custo vem do relatório de uso da Anthropic: o nó do n8n não separa
-- os tokens de cache (proposta 03, seção 5.5).
create or replace view app.vw_uso_diario with (security_invoker = true) as
with msg as (
  select (m.criado_em at time zone 'America/Sao_Paulo')::date as dia,
         count(*) filter (where m.papel = 'usuario') as perguntas,
         count(*) filter (where m.papel = 'agente' and m.erro is null) as respostas,
         count(*) filter (where m.erro is not null) as erros,
         count(*) filter (where jsonb_array_length(coalesce(m.numeros_sem_origem, '[]')) > 0) as com_numero_sem_origem,
         count(*) filter (where jsonb_array_length(coalesce(m.praticas_sem_origem, '[]')) > 0) as com_pratica_sem_origem,
         count(distinct c.usuario_id) as usuarios,
         percentile_cont(0.5) within group (order by m.latencia_ms) filter (where m.papel = 'agente') as latencia_p50_ms,
         percentile_cont(0.95) within group (order by m.latencia_ms) filter (where m.papel = 'agente') as latencia_p95_ms
  from app.mensagem m
  join app.conversa c on c.id = m.conversa_id
  group by 1
), avaliacao as (
  select (f.criado_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as avaliacoes,
         round(count(*) filter (where f.nota = -1)::numeric / count(*), 3) as taxa_negativa
  from app.feedback f
  group by 1
)
select msg.*, avaliacao.avaliacoes, avaliacao.taxa_negativa,
       (select count(*) from app.usuario u where u.status = 'pendente') as cadastros_pendentes
from msg
left join avaliacao using (dia);
```

- [ ] **Passo 4: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 22 testes passam.

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
  - o agente (credencial `iie-leitura` no n8n) lê `iie.*` e executa `iie.fn_*`, e não acessa `app`;
  - o n8n (credencial `iie-operacao`) lê `app` e grava só `app.mensagem` e `app.agente_memoria`.

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
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode `pytest tests/sql/test_permissoes.py -v`.
Esperado: FALHA com `psycopg.errors.InvalidParameterValue: role "agente_leitura" does not exist`.

- [ ] **Passo 3: Implementar** — `agente/supabase/migrations/0003_papeis_rls.sql`

```sql
-- IIE Conselheiro — 0003: papéis, permissões e RLS
-- Os papéis são NOLOGIN. Os usuários de conexão são criados fora do git (ver P1, Tarefa 8).
do $$
begin
  if not exists (select from pg_roles where rolname = 'agente_leitura') then
    create role agente_leitura nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'n8n_operacao') then
    create role n8n_operacao nologin;
  end if;
end $$;

-- agente_leitura: credencial das ferramentas do agente no n8n. Só lê o esquema iie.
grant usage on schema iie, extensions to agente_leitura;
grant select on all tables in schema iie to agente_leitura;
grant execute on all functions in schema iie to agente_leitura;

-- n8n_operacao: grava mensagens e memória do agente; lê o resto de app (base ativa, monitoramento).
grant usage on schema iie, app, extensions to n8n_operacao;
grant select on all tables in schema iie to n8n_operacao;
grant execute on all functions in schema iie to n8n_operacao;
grant select on all tables in schema app to n8n_operacao;
grant insert, update, delete on app.mensagem, app.agente_memoria to n8n_operacao;
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

end $$;
```

- [ ] **Passo 4: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 25 testes passam.

Rode a migração 0003 e a carga uma segunda vez para provar que são idempotentes. Esperado: nenhum erro.

```bash
psql "$DATABASE_URL_TEST" -v ON_ERROR_STOP=1 -f supabase/migrations/0003_papeis_rls.sql
python -m dados.carregar_iie --database-url "$DATABASE_URL_TEST" --responsavel teste
```

- [ ] **Passo 5: Commit**

```bash
git add agente/supabase/migrations/0003_papeis_rls.sql agente/tests/sql/test_permissoes.py
git commit -m "feat(dados): papéis agente_leitura e n8n_operacao com RLS"
```

---

### Tarefa 5: Regras do site (cadastro, administração e RLS do usuário logado)

**Arquivos:**
- Criar: `agente/supabase/migrations/0004_app_site.sql`
- Teste: `agente/tests/sql/test_site.py`

**Interfaces:**
- **Gatilho `app.ao_criar_usuario`** em `auth.users`:
  - o `signUp` do site (P3) manda nos metadados `nome`, `perfil`, `instituicao`, `uf`, `municipio_ibge`, `municipio_nome` e `aceite_termo` (booleano);
  - o gatilho cria `app.usuario` com status `pendente`;
  - erro `22023` com `cadastro_invalido: …` quando a UF não existe, o município não pertence à UF ou falta o aceite.
- **`app.eh_admin() -> boolean`** e **`app.fn_perguntas_hoje() -> int`**: o site chama esta última antes de repassar a pergunta ao n8n.
- **Gatilhos:**
  - quem decidiu o status e quando (`decidido_por`, `decidido_em`);
  - mensagem nova atualiza a conversa e soma na cota;
  - conversa apagada apaga a memória do agente.
- **Permissões e RLS do papel `authenticated`:** conforme a [03 §6.3](../03_proposta_sistema_web.md#63-acesso).

- [ ] **Passo 1: Escrever o teste que falha** — `agente/tests/sql/test_site.py`

```python
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


def test_cadastro_cria_usuario_pendente(banco):
    uid = cadastrar(banco)
    u = banco.execute("""select status, papel, uf, municipio_nome, email, aceite_termo_em is not null
                         from app.usuario where id = %s""", (uid,)).fetchone()
    assert u == ("pendente", "usuario", "CE", "Sobral", f"{uid}@teste.gov.br", True)


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
        banco.execute("update app.usuario set status = 'ativo' where id = %s", (novo,))
        banco.execute("update app.usuario set papel = 'admin' where id = %s", (comum,))
    assert sql("select status from app.usuario where id = %s", novo) == "pendente"
    assert sql("select papel from app.usuario where id = %s", comum) == "usuario"
    with como(banco, admin):
        assert banco.execute("select count(*) from app.usuario where status = 'pendente'").fetchone()[0] >= 1
        banco.execute("update app.usuario set status = 'ativo' where id = %s", (novo,))
    assert banco.execute("select status, decidido_por, decidido_em is not null from app.usuario where id = %s",
                         (novo,)).fetchone() == ("ativo", admin, True)


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
        banco.execute("insert into app.agente_memoria (session_id, message) values (%s, '{}')", (str(conversa),))
    with como(banco, uid):
        banco.execute("delete from app.conversa where id = %s", (conversa,))
    assert sql("select count(*) from app.mensagem where conversa_id = %s", conversa) == 0
    assert sql("select count(*) from app.agente_memoria where session_id = %s", str(conversa)) == 0


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
        banco.execute("insert into app.agente_memoria (session_id, message) values (%s, '{}')", (str(conversa),))
    with como(banco, uid):
        banco.execute("insert into app.feedback (mensagem_id, usuario_id, nota) values (%s, %s, 1)", (resposta, uid))
    banco.execute("delete from auth.users where id = %s", (uid,))  # o que auth.admin.deleteUser faz
    for consulta, param in [("select count(*) from app.usuario where id = %s", uid),
                            ("select count(*) from app.conversa where usuario_id = %s", uid),
                            ("select count(*) from app.mensagem where conversa_id = %s", conversa),
                            ("select count(*) from app.feedback where usuario_id = %s", uid),
                            ("select count(*) from app.cota_diaria where usuario_id = %s", uid),
                            ("select count(*) from app.agente_memoria where session_id = %s", str(conversa))]:
        assert sql(consulta, param) == 0, consulta


def test_anonimo_nao_acessa_app(banco):
    with pytest.raises(NEGADO):
        with banco.transaction():
            banco.execute("set local role anon")
            banco.execute("select count(*) from app.usuario")


@pytest.mark.parametrize("tabela", ["app.kb_versao", "app.agente_memoria", "app.cota_diaria", "iie.pratica"])
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
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode `pytest tests/sql/test_site.py -v`.
Esperado: falhas como `relation "app.usuario" ... violates` ou `permission denied`: ainda não há gatilho de cadastro nem políticas.

- [ ] **Passo 3: Implementar** — `agente/supabase/migrations/0004_app_site.sql`

```sql
-- IIE Conselheiro — 0004: regras do site (cadastro pelo Supabase Auth, administração e RLS do usuário logado)
-- Proposta 03, seções 6.2 e 6.3. O esquema app é exposto na API do Supabase; o iie não.

-- ------------------------------------------------------------ funções auxiliares
-- Administrador ativo? security definer para não depender da RLS de app.usuario.
create or replace function app.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.usuario u
                 where u.id = (select auth.uid()) and u.papel = 'admin' and u.status = 'ativo')
$$;

-- Perguntas feitas hoje (fuso de Brasília) pelo usuário logado. Lê app.cota_diaria, que o usuário não apaga.
create or replace function app.fn_perguntas_hoje() returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.perguntas from app.cota_diaria c
                   where c.usuario_id = (select auth.uid())
                     and c.dia = (now() at time zone 'America/Sao_Paulo')::date), 0)
$$;

-- ------------------------------------------------------------ gatilhos
-- Cadastro: o signUp do site manda nome, perfil, instituição, UF, município e aceite do termo nos metadados.
create or replace function app.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_uf     text  := upper(trim(m ->> 'uf'));
  v_mun    text  := trim(m ->> 'municipio_ibge');
  v_codigo text;
begin
  select t.codigo_ibge into v_codigo from iie.territorio t where t.sigla = v_uf and t.tipo = 'UF';
  if v_codigo is null then
    raise exception using errcode = '22023', message = format('cadastro_invalido: UF %s', coalesce(v_uf, '(vazia)'));
  end if;
  -- Os 2 primeiros dígitos do código IBGE do município são o código da UF.
  if v_mun is null or v_mun !~ '^[0-9]{7}$' or left(v_mun, 2) <> v_codigo then
    raise exception using errcode = '22023',
      message = format('cadastro_invalido: município %s não pertence à UF %s', coalesce(v_mun, '(vazio)'), v_uf);
  end if;
  if coalesce(m ->> 'aceite_termo', 'false') <> 'true' then
    raise exception using errcode = '22023', message = 'cadastro_invalido: o aceite do termo de uso é obrigatório';
  end if;
  insert into app.usuario (id, email, nome, perfil, instituicao, uf, municipio_ibge, municipio_nome, aceite_termo_em)
  values (new.id, new.email, trim(m ->> 'nome'), m ->> 'perfil', trim(m ->> 'instituicao'), v_uf, v_mun,
          trim(m ->> 'municipio_nome'), now());
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function app.ao_criar_usuario();

-- Quem aprovou, recusou ou bloqueou, e quando.
create or replace function app.ao_decidir_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.decidido_por := (select auth.uid());
    new.decidido_em := now();
  end if;
  return new;
end $$;

drop trigger if exists ao_decidir_status on app.usuario;
create trigger ao_decidir_status before update on app.usuario
  for each row execute function app.ao_decidir_status();

-- Mensagem nova (gravada pelo n8n): atualiza a conversa e, se for pergunta, soma na cota do dia.
create or replace function app.ao_inserir_mensagem() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid;
begin
  update app.conversa set atualizada_em = now() where id = new.conversa_id returning usuario_id into v_usuario;
  if new.papel = 'usuario' then
    insert into app.cota_diaria (usuario_id, dia, perguntas)
    values (v_usuario, (now() at time zone 'America/Sao_Paulo')::date, 1)
    on conflict (usuario_id, dia) do update set perguntas = app.cota_diaria.perguntas + 1;
  end if;
  return new;
end $$;

drop trigger if exists ao_inserir_mensagem on app.mensagem;
create trigger ao_inserir_mensagem after insert on app.mensagem
  for each row execute function app.ao_inserir_mensagem();

-- Conversa apagada (pelo usuário ou pela exclusão da conta): apaga também a memória do agente.
create or replace function app.ao_apagar_conversa() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from app.agente_memoria where session_id = old.id::text;
  return old;
end $$;

drop trigger if exists ao_apagar_conversa on app.conversa;
create trigger ao_apagar_conversa after delete on app.conversa
  for each row execute function app.ao_apagar_conversa();

-- ------------------------------------------------------------ permissões do usuário logado
revoke execute on all functions in schema app from public;
grant usage on schema app to authenticated;
grant execute on function app.eh_admin(), app.fn_perguntas_hoje() to authenticated;

grant select on app.usuario, app.conversa, app.mensagem, app.feedback to authenticated;
grant update (nome, perfil, instituicao, uf, municipio_ibge, municipio_nome, status, papel) on app.usuario to authenticated;
grant insert (usuario_id, titulo), update (titulo), delete on app.conversa to authenticated;
grant insert (mensagem_id, usuario_id, nota, motivo), update (nota, motivo) on app.feedback to authenticated;

drop policy if exists usuario_le on app.usuario;
create policy usuario_le on app.usuario for select to authenticated
  using (id = (select auth.uid()) or app.eh_admin());
drop policy if exists usuario_admin_muda on app.usuario;
create policy usuario_admin_muda on app.usuario for update to authenticated
  using (app.eh_admin()) with check (app.eh_admin());

drop policy if exists conversa_le on app.conversa;
create policy conversa_le on app.conversa for select to authenticated
  using (usuario_id = (select auth.uid()));
drop policy if exists conversa_cria on app.conversa;
create policy conversa_cria on app.conversa for insert to authenticated
  with check (usuario_id = (select auth.uid())
              and exists (select 1 from app.usuario u where u.id = (select auth.uid()) and u.status = 'ativo'));
drop policy if exists conversa_muda on app.conversa;
create policy conversa_muda on app.conversa for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists conversa_apaga on app.conversa;
create policy conversa_apaga on app.conversa for delete to authenticated
  using (usuario_id = (select auth.uid()));

drop policy if exists mensagem_le on app.mensagem;
create policy mensagem_le on app.mensagem for select to authenticated
  using (exists (select 1 from app.conversa c where c.id = conversa_id and c.usuario_id = (select auth.uid())));

drop policy if exists feedback_le on app.feedback;
create policy feedback_le on app.feedback for select to authenticated
  using (usuario_id = (select auth.uid()));
drop policy if exists feedback_cria on app.feedback;
create policy feedback_cria on app.feedback for insert to authenticated
  with check (usuario_id = (select auth.uid())
              and exists (select 1 from app.mensagem m join app.conversa c on c.id = m.conversa_id
                          where m.id = mensagem_id and m.papel = 'agente' and c.usuario_id = (select auth.uid())));
drop policy if exists feedback_muda on app.feedback;
create policy feedback_muda on app.feedback for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
```

- [ ] **Passo 4: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: 47 testes passam.

Rode as migrações 0002 a 0004 de novo. Esperado: nenhum erro.

- [ ] **Passo 5: Commit**

```bash
git add agente/supabase/migrations/0004_app_site.sql agente/tests/sql/test_site.py
git commit -m "feat(dados): regras do site no banco (cadastro, administração, RLS, cota diária)"
```

---

### Tarefa 6: Catálogo das 541 práticas

O inventário de 2026-09-11 numerou as práticas dos três referenciais na ordem de aparição, mas não foi salvo. Esta tarefa reconstrói o catálogo. Os 147 IDs já usados na matriz e no doc 09 precisam continuar apontando para as mesmas linhas.

**Arquivos:**
- Criar: `agente/dados/conferir_catalogo.py`, `contexto/anexos/catalogo_praticas.csv`, `contexto/anexos/catalogo_praticas_revisao.md`
- Modificar: `contexto/README.md` (lista de anexos) e `contexto/09_indicadores_iie_e_praticas_de_gestao.md` (aponta o catálogo)
- Teste: `agente/tests/dados/test_conferir_catalogo.py`

**Interfaces:**
- Produz:
  - `citacoes(texto) -> list[tuple[str, tuple[int, int]]]`: lê "SM-05 (Itaú L380–412)", "SM-35 a 49 (Itaú L790–1133)" e "GE-SEC-04/07 (MEC L2187–2216, L2274–2316)". É usada também pela carga (Tarefa 7);
  - `ler_ancoras() -> dict[str, tuple[int, int]]`;
  - `ler_catalogo(caminhos) -> list[dict]`;
  - `conferir(catalogo, ancoras, series=None) -> tuple[list[str], list[str]]` (erros, avisos);
  - as constantes `COLUNAS`, `SERIES` e `CATALOGO`.
- **Formato do CSV:** `id,fonte,documento,nivel,secao,nome,descricao,linhas,alavancas`. `linhas` é `L123` ou `L123–130`, com travessão; `alavancas` são valores separados por `|`.

- [ ] **Passo 1: Escrever o teste que falha** — `agente/tests/dados/test_conferir_catalogo.py`

```python
from dados.conferir_catalogo import conferir, ler_ancoras

DOC = "boas-praticas/planejamento-estrategico-de-uma-secretaria-de-educacao.md"


def _pe(n, linhas, **extra):
    return {"id": f"PE-{n:02d}", "fonte": "TPE", "documento": DOC, "nivel": "Estratégico",
            "secao": "1. Diagnóstico", "nome": f"Prática {n}", "descricao": "Descrição.", "linhas": linhas,
            "alavancas": "dados"} | extra


def test_catalogo_valido_so_avisa_do_total():
    erros, avisos = conferir([_pe(1, "L10"), _pe(2, "L29–52")], {"PE-02": (29, 52)}, ["PE"])
    assert erros == []
    assert avisos == ["PE: 2 práticas; o inventário de 2026-09-11 tinha 52"]


def test_ancora_fora_do_lugar_e_erro():
    erros, _ = conferir([_pe(1, "L10"), _pe(2, "L60")], {"PE-02": (29, 52)}, ["PE"])
    assert erros == ["âncora PE-02: catálogo em L60–60, mas a matriz/doc 09 usa L29–52"]


def test_ancora_ausente_e_erro():
    erros, _ = conferir([_pe(1, "L10")], {"PE-02": (29, 52)}, ["PE"])
    assert erros == ["âncora PE-02 (L29–52) ausente do catálogo"]


def test_ordem_de_aparicao_numeracao_e_formato():
    erros, avisos = conferir([_pe(1, "L50"), _pe(3, "L40")], {}, ["PE"])
    assert any("numeração não é contínua" in e for e in erros)
    assert any("ordem de aparição" in a for a in avisos)
    erros, _ = conferir([_pe(1, "L10", id="PE-1")], {}, ["PE"])
    assert any("id inválido: PE-1" in e for e in erros)


def test_campos_e_alavancas():
    erros, _ = conferir([_pe(1, "L10", nome="", alavancas="dados|magia", nivel="Escola")], {}, ["PE"])
    assert "PE-01: nome vazio" in erros
    assert any("alavancas" in e for e in erros)
    assert any("fonte/documento/nível" in e for e in erros)
    erros, _ = conferir([_pe(1, "L10-12")], {}, ["PE"])
    assert any("travessão" in e for e in erros)


def test_ancoras_reais():
    ancoras = ler_ancoras()
    assert len(ancoras) == 147
    assert ancoras["SM-79"][0] > 0 and ancoras["PE-02"] == (29, 52)


def test_ancoras_de_intervalos_e_pares_do_doc09():
    ancoras = ler_ancoras()
    assert ancoras["SM-40"] == (790, 1133)                       # "SM-35 a 49 (Itaú L790–1133)"
    assert ancoras["GE-SEC-04"] == (2187, 2216) and ancoras["GE-SEC-07"] == (2274, 2316)
    assert ancoras["SM-115"] == ancoras["SM-116"] == (2560, 2590)
```

- [ ] **Passo 2: Rodar e ver falhar**

Rode `pytest tests/dados/test_conferir_catalogo.py -v`.
Esperado: ERRO de coleta com `ModuleNotFoundError: No module named 'dados.conferir_catalogo'`.

- [ ] **Passo 3: Implementar** — `agente/dados/conferir_catalogo.py`

```python
"""Confere o catálogo de práticas (contexto/anexos/catalogo_praticas.csv) contra as âncoras da matriz e do doc 09.

Uso (a partir de agente/):
    python -m dados.conferir_catalogo [CATALOGO.csv ...] [--serie PE]

Sai com código 1 se houver erro. Totais diferentes dos esperados são só avisos (decisão do especialista).
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CATALOGO = RAIZ / "contexto" / "anexos" / "catalogo_praticas.csv"
MATRIZ = RAIZ / "contexto" / "anexos" / "matriz_indicador_pratica.csv"
DOC09 = RAIZ / "contexto" / "09_indicadores_iie_e_praticas_de_gestao.md"

COLUNAS = ["id", "fonte", "documento", "nivel", "secao", "nome", "descricao", "linhas", "alavancas"]
ALAVANCAS = {"acesso", "fluxo", "aprendizagem", "equidade", "dados", "estruturantes"}
SERIES = {  # série: (fonte, documento, nível, total esperado)
    "GE": ("MEC", "boas-praticas/referencial-gestao-escolar-mec.md", "Escola", 279),
    "GE-SEC": ("MEC", "boas-praticas/referencial-gestao-escolar-mec.md", "Secretaria", 93),
    "SM": ("Itaú Social", "boas-praticas/031_Secretaria Municipal de Educação_Práticas para uma boa gestão.md",
           "Secretaria", 117),
    "PE": ("TPE", "boas-praticas/planejamento-estrategico-de-uma-secretaria-de-educacao.md", "Estratégico", 52),
}
RE_ID = re.compile(r"^(GE-SEC|GE|SM|PE)-(\d{2,3})$")
RE_LINHAS = re.compile(r"^L(\d+)(?:–(\d+))?$")
# Citações do doc 09: "SM-05 (Itaú L380–412)", "SM-35 a 49 (Itaú L790–1133)", "GE-SEC-04/07 (MEC L2187–2216, L2274–2316)".
RE_ANCORA_DOC09 = re.compile(r"\b(GE-SEC|GE|SM|PE)-(\d+)(?: a (\d+)|((?:/\d+)+))? \((?:MEC|Itaú|TPE) "
                             r"(L\d+(?:–\d+)?(?:, L\d+(?:–\d+)?)*)\)")


def serie(pratica_id: str) -> str:
    m = RE_ID.match(pratica_id)
    if not m:
        raise ValueError(f"id inválido: {pratica_id}")
    return m.group(1)


def intervalo(linhas: str) -> tuple[int, int]:
    m = RE_LINHAS.match(linhas)
    if not m:
        raise ValueError(f"linhas inválidas: {linhas!r} (use L123 ou L123–130, com travessão –)")
    ini = int(m.group(1))
    fim = int(m.group(2) or ini)
    if fim < ini:
        raise ValueError(f"linhas invertidas: {linhas}")
    return ini, fim


def citacoes(texto: str) -> list[tuple[str, tuple[int, int]]]:
    """IDs citados com linhas, na ordem do texto. Expande "SM-35 a 49" e "GE-SEC-04/07"."""
    achados: list[tuple[str, tuple[int, int]]] = []
    for m in RE_ANCORA_DOC09.finditer(texto):
        s, primeiro, ate, barras, trechos = m.groups()
        intervalos = [intervalo(x) for x in trechos.split(", ")]
        envelope = (min(i for i, _ in intervalos), max(f for _, f in intervalos))
        if ate:  # "SM-35 a 49": todas dentro do mesmo trecho
            pares = [(n, envelope) for n in range(int(primeiro), int(ate) + 1)]
        elif barras:  # "GE-SEC-04/07": um trecho para cada, ou o mesmo trecho para todas
            numeros = [int(primeiro)] + [int(x) for x in barras.split("/")[1:]]
            pares = list(zip(numeros, intervalos)) if len(intervalos) == len(numeros) else [(n, envelope) for n in numeros]
        else:
            pares = [(int(primeiro), envelope)]
        achados.extend((f"{s}-{n:02d}", faixa) for n, faixa in pares)
    return achados


def ler_ancoras(matriz: Path = MATRIZ, doc09: Path = DOC09) -> dict[str, tuple[int, int]]:
    """IDs já usados na matriz e no doc 09, com o intervalo de linhas em que precisam cair."""
    ancoras: dict[str, tuple[int, int]] = {}
    with open(matriz, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["pratica_id"] != "—":
                ancoras[r["pratica_id"]] = intervalo(r["linhas"])
    for pid, faixa in citacoes(doc09.read_text(encoding="utf-8")):
        ancoras.setdefault(pid, faixa)
    return ancoras


def ler_catalogo(caminhos: list[Path]) -> list[dict[str, str]]:
    linhas: list[dict[str, str]] = []
    for caminho in caminhos:
        with open(caminho, newline="", encoding="utf-8") as f:
            leitor = csv.DictReader(f)
            if leitor.fieldnames != COLUNAS:
                raise ValueError(f"{caminho}: colunas {leitor.fieldnames}, esperado {COLUNAS}")
            linhas.extend(leitor)
    return linhas


def conferir(catalogo: list[dict[str, str]], ancoras: dict[str, tuple[int, int]],
             series: list[str] | None = None) -> tuple[list[str], list[str]]:
    """Devolve (erros, avisos). `series` limita a conferência (útil para conferir uma série por vez)."""
    series = series or list(SERIES)
    erros: list[str] = []
    avisos: list[str] = []
    por_serie: dict[str, list[tuple[int, dict[str, str]]]] = {s: [] for s in series}
    vistos: set[str] = set()

    for r in catalogo:
        pid = r["id"]
        try:
            s = serie(pid)
            ini, fim = intervalo(r["linhas"])
        except ValueError as e:
            erros.append(str(e))
            continue
        if s not in por_serie:
            continue
        if pid in vistos:
            erros.append(f"{pid}: id repetido")
        vistos.add(pid)
        numero = int(RE_ID.match(pid).group(2))
        if pid != f"{s}-{numero:02d}":
            erros.append(f"{pid}: use 2 dígitos no mínimo, sem zeros a mais ({s}-{numero:02d})")
        fonte, documento, nivel, _ = SERIES[s]
        if (r["fonte"], r["documento"], r["nivel"]) != (fonte, documento, nivel):
            erros.append(f"{pid}: fonte/documento/nível devem ser {fonte} / {documento} / {nivel}")
        for campo, limite in (("secao", 200), ("nome", 120), ("descricao", 500)):
            if not r[campo].strip():
                erros.append(f"{pid}: {campo} vazio")
            elif len(r[campo]) > limite:
                erros.append(f"{pid}: {campo} com mais de {limite} caracteres")
        alavancas = set(r["alavancas"].split("|")) if r["alavancas"] else set()
        if not alavancas or not alavancas <= ALAVANCAS:
            erros.append(f"{pid}: alavancas {r['alavancas']!r} fora de {sorted(ALAVANCAS)}")
        por_serie[s].append((numero, r | {"_ini": ini, "_fim": fim}))

    for s, itens in por_serie.items():
        itens.sort(key=lambda x: x[0])
        numeros = [n for n, _ in itens]
        if numeros != list(range(1, len(numeros) + 1)):
            faltando = sorted(set(range(1, max(numeros, default=0) + 1)) - set(numeros))
            erros.append(f"{s}: numeração não é contínua a partir de 1 (faltam {faltando[:10]})")
        for (n_a, a), (n_b, b) in zip(itens, itens[1:]):
            if b["_ini"] < a["_ini"]:  # aviso: o próprio inventário original tem GE-SEC-49 depois de GE-SEC-50
                avisos.append(f"{s}-{n_b:02d} começa na L{b['_ini']}, antes de {s}-{n_a:02d} (L{a['_ini']}): "
                             "a numeração deveria seguir a ordem de aparição")
        esperado = SERIES[s][3]
        if len(itens) != esperado:
            avisos.append(f"{s}: {len(itens)} práticas; o inventário de 2026-09-11 tinha {esperado}")

    indice = {r["id"]: (r["_ini"], r["_fim"]) for itens in por_serie.values() for _, r in itens}
    for pid, (a_ini, a_fim) in sorted(ancoras.items()):
        if serie(pid) not in por_serie:
            continue
        if pid not in indice:
            erros.append(f"âncora {pid} (L{a_ini}–{a_fim}) ausente do catálogo")
            continue
        ini, fim = indice[pid]
        if fim < a_ini or ini > a_fim:
            erros.append(f"âncora {pid}: catálogo em L{ini}–{fim}, mas a matriz/doc 09 usa L{a_ini}–{a_fim}")
    return erros, avisos


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalogos", nargs="*", type=Path, default=[CATALOGO])
    parser.add_argument("--serie", action="append", choices=list(SERIES))
    args = parser.parse_args(argv)
    erros, avisos = conferir(ler_catalogo(args.catalogos), ler_ancoras(), args.serie)
    for a in avisos:
        print(f"AVISO: {a}")
    for e in erros:
        print(f"ERRO: {e}")
    print(f"{len(erros)} erro(s), {len(avisos)} aviso(s)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Passo 4: Rodar e ver passar**

Rode `pytest tests/dados -v`. Esperado: 13 testes passam (6 + 7).

- [ ] **Passo 5: Separar as âncoras por série**

Grave em `<scratchpad>/catalogo/ancoras_<SERIE>.json` (`<SERIE>` ∈ GE, GE-SEC, SM, PE) a lista `[{id, nomes, linhas}]` de cada série. Os `nomes` saem da coluna `pratica` da matriz; as linhas, de `ler_ancoras()`.

- [ ] **Passo 6: Reconstruir cada série com um agente**

Dispare 4 agentes em paralelo, um por série, com o roteiro abaixo. Troque os valores entre `<>`:

| Série | Documento | Ator | Total | Nível |
|---|---|---|---:|---|
| GE | `boas-praticas/referencial-gestao-escolar-mec.md` | equipe gestora da escola | 279 | Escola |
| GE-SEC | `boas-praticas/referencial-gestao-escolar-mec.md` | Secretaria e rede, no apoio às escolas e aos diretores | 93 | Secretaria |
| SM | `boas-praticas/031_Secretaria Municipal de Educação_Práticas para uma boa gestão.md` | secretaria municipal | 117 | Secretaria |
| PE | `boas-praticas/planejamento-estrategico-de-uma-secretaria-de-educacao.md` | planejamento estratégico da secretaria | 52 | Estratégico |

> Reconstrua a série `<SERIE>` do documento `<DOCUMENTO>`.
>
> **Contexto.** O inventário original numerou as práticas na ordem de aparição e foi perdido. Restam as âncoras em `<scratchpad>/catalogo/ancoras_<SERIE>.json`.
>
> **Como trabalhar:**
> 1. Leia o documento inteiro com o Read. O número de linha mostrado é o das âncoras.
> 2. Uma prática é uma ação, recomendação ou orientação distinta dirigida a `<ATOR>`.
> 3. Calibre a granularidade pelas âncoras. Entre duas âncoras consecutivas `X-a` e `X-b`, deve haver exatamente `b − a − 1` práticas. O total esperado é `<TOTAL>`.
> 4. Para cada prática, preencha as colunas:
>    - `id` (no mínimo 2 dígitos);
>    - `fonte`, `documento` e `nivel` = `<NIVEL>`;
>    - `secao`: caminho de títulos, até 200 caracteres;
>    - `nome`: até 80 caracteres. Para âncoras, prefira um dos nomes do arquivo de âncoras;
>    - `descricao`: paráfrase fiel, até 400 caracteres e nunca mais de 15 palavras seguidas do original;
>    - `linhas`;
>    - `alavancas`: 1 a 3 entre acesso, fluxo, aprendizagem, equidade, dados e estruturantes.
> 5. Grave com o módulo `csv` em `<scratchpad>/catalogo/catalogo_<SERIE>.csv`.
> 6. Confira com `cd agente && .venv/bin/python -m dados.conferir_catalogo <csv> --serie <SERIE>` até zerar os erros.
> 7. Não altere o repositório.
>
> **Relatório:** total, avisos restantes, como calibrou a granularidade e os trechos de dúvida, com as linhas.

- [ ] **Passo 7: Juntar as séries e conferir**

```bash
cd agente && .venv/bin/python - <scratchpad>/catalogo <<'EOF'
import csv, sys, pathlib
from dados.conferir_catalogo import CATALOGO, COLUNAS, RE_ID
pasta, linhas = pathlib.Path(sys.argv[1]), []
for serie in ["GE", "GE-SEC", "SM", "PE"]:
    with open(pasta / f"catalogo_{serie}.csv", newline="", encoding="utf-8") as f:
        linhas += sorted(csv.DictReader(f), key=lambda r: int(RE_ID.match(r["id"]).group(2)))
with open(CATALOGO, "w", newline="", encoding="utf-8") as f:
    escritor = csv.DictWriter(f, fieldnames=COLUNAS)
    escritor.writeheader()
    escritor.writerows(linhas)
EOF
.venv/bin/python -m dados.conferir_catalogo
```

Esperado: `0 erro(s)`. Os únicos avisos aceitos são de ordem na série GE-SEC (17/18, 49/50 e 88/89): o PDF tem quadros em duas colunas, e o par 49/50 já vinha invertido nas âncoras originais.

Resultado obtido em 2026-10-13: 541 práticas (279, 93, 117, 52), 0 erros, 3 avisos.

- [ ] **Passo 8: Registrar o método e a revisão**

Escreva `contexto/anexos/catalogo_praticas_revisao.md` com:
- o método e a regra de cada série;
- os trechos de dúvida relatados pelos agentes;
- uma amostra de 10% para o especialista em IIE: 54 IDs, sorteio estratificado por série (28, 9, 12, 5), semente 2026.

Atualize a lista de anexos em `contexto/README.md` e cite o catálogo no doc 09.

- [ ] **Passo 9: Commit**

```bash
git add contexto agente/dados/conferir_catalogo.py agente/tests/dados/test_conferir_catalogo.py
git commit -m "feat(dados): catálogo completo das 541 práticas dos três referenciais"
```

---

### Tarefa 7: Relação completa indicadores × práticas no banco

**Arquivos:**
- Criar: `agente/supabase/migrations/0005_base_de_praticas.sql`, `agente/dados/seeds/perfis.json`, `agente/dados/seeds/lacunas.json`
- Modificar: `agente/dados/carregar_iie.py` (leitores novos e carga), `agente/tests/dados/test_leitores.py` (testes no fim do arquivo), `agente/tests/sql/test_carga.py` (contagens)
- Teste: `agente/tests/sql/test_praticas.py`

**Interfaces:**
- Consome `citacoes` (Tarefa 6) e o catálogo.
- **Leitores novos em `carregar_iie.py`:**
  - `ler_catalogo(caminho)`;
  - `ler_precondicoes(caminho_matriz)`: as 6 linhas `BASE` da matriz, no formato "o que garantir — práticas citadas com linhas";
  - `ler_perfis(caminho, indicadores)`;
  - `ler_lacunas(caminho, indicadores)`.
- **`carregar`:** passa a carregar `iie.pratica` a partir do catálogo, com 541 linhas.
- **Funções novas** (a P2 as usa nas ferramentas `buscar_praticas` e `pacote_por_perfil`):
  - `iie.fn_buscar_praticas(p_termo text, p_fonte text default null, p_nivel text default null, p_limite int default 10) -> jsonb`: até 20 resultados;
  - `iie.fn_pacote(p_perfil text) -> jsonb`.
- **Mudança em `iie.fn_praticas`:** passa a devolver `lacunas`.
- **Erros:** `termo_vazio` (`22023`); `perfil_desconhecido` (`P0002`, com a lista de perfis no `hint`).

- [ ] **Passo 1: Criar as sementes do doc 09 §7 e §8**

`agente/dados/seeds/perfis.json`:

```json
[
  {"id": "fluxo", "nome": "Gargalo de fluxo",
   "criterio": "Fluxo pior que o do Brasil (retenção prolongada ou evasão), com a aprendizagem dos concluintes igual ou próxima à do Brasil",
   "sequencia": ["F2", "A2", "P1"],
   "descricao": "Recuperação contínua, revisão dos critérios de promoção, trajetórias monitoradas e painel de fluxo por escola.",
   "praticas": ["SM-89", "SM-92", "SM-57", "GE-73", "GE-77", "GE-91", "GE-SEC-68"]},
  {"id": "aprendizagem", "nome": "Gargalo de aprendizagem",
   "criterio": "Fluxo igual ou melhor que o do Brasil, com a aprendizagem dos concluintes abaixo da do Brasil",
   "sequencia": ["A1", "A3", "E2"],
   "descricao": "Mapas de Foco em Língua Portuguesa e Matemática, avaliação e replanejamento, observação de aula com devolutiva e núcleo de apoio às escolas.",
   "praticas": ["SM-84", "SM-87", "GE-64", "GE-68", "GE-SEC-12", "GE-SEC-51"]},
  {"id": "duplo", "nome": "Gargalo duplo",
   "criterio": "Fluxo e aprendizagem dos concluintes piores que os do Brasil",
   "sequencia": ["base", "A1", "F2", "E1", "E2"],
   "descricao": "Começar pelas pré-condições (liderança e núcleo de apoio às escolas). Depois, combinar os pacotes de aprendizagem e de fluxo: a aprendizagem dá o maior ganho no curto prazo, e os Anos Iniciais e Finais sustentam o longo prazo.",
   "praticas": []},
  {"id": "evasao", "nome": "Evasão alta",
   "criterio": "Evasão aos 17 anos (P1) no nível crítico: quartil das piores UFs",
   "sequencia": ["P1", "E3"],
   "descricao": "Busca Ativa Escolar, alerta precoce de desengajamento, apoio intersetorial às famílias e acompanhamento da frequência na escola.",
   "praticas": ["SM-79", "SM-76", "SM-73", "GE-201", "GE-84"]},
  {"id": "perda_em", "nome": "Perda no Ensino Médio",
   "criterio": "Passagem para o Ensino Médio (E3) no nível crítico: quartil das piores UFs",
   "sequencia": ["E3", "P1", "A1"],
   "descricao": "Transições estruturadas entre etapas, colaboração entre as redes municipal e estadual e comparação com a rede estadual.",
   "praticas": ["GE-38", "GE-81", "SM-24", "PE-12"]},
  {"id": "dado", "nome": "Dado inconsistente",
   "criterio": "Alerta de qualidade de dado (D1) para o território: quebra brusca entre coortes que pode inverter a leitura",
   "sequencia": ["D1"],
   "descricao": "Conferir o dado antes de agir: registro qualificado da vida escolar, cadastros oficiais atualizados, interoperabilidade e conferência de matrículas.",
   "praticas": ["GE-196", "GE-219", "GE-SEC-86", "SM-56"]}
]
```

`agente/dados/seeds/lacunas.json`:

```json
[
  {"id": "ensino_medio", "tema": "Ensino Médio e conclusão até os 18 anos",
   "cobertura": "Nenhum dos três referenciais trata do Ensino Médio. O MEC cita programas de EM só nas referências; os documentos do Itaú Social e do TPE são para redes municipais.",
   "complemento": "Políticas de permanência no EM da rede estadual, por exemplo o incentivo financeiro-educacional Pé-de-Meia (Lei 14.818/2024). Validar antes de recomendar.",
   "indicadores": ["F1", "F2", "P1", "A1", "E3"]},
  {"id": "correcao_fluxo", "tema": "Atraso de 2 anos ou mais já instalado",
   "cobertura": "Os referenciais tratam só de prevenção (recuperação e continuum curricular). Nenhum trata de correção de fluxo.",
   "complemento": "Programas de correção de fluxo ou aceleração para quem tem 2 ou mais anos de distorção idade-série; EJA ou EPT integrada para quem passou dos 18 anos. Validar antes de recomendar.",
   "indicadores": ["F2", "F1"]},
  {"id": "transicao_ef_em", "tema": "Transição do Ensino Fundamental para o Ensino Médio",
   "cobertura": "Aparece só de forma genérica: transições entre etapas (GE-38, GE-75, GE-81) e colaboração entre redes (SM-24).",
   "complemento": "Regime de colaboração entre estado e municípios, com transferência de informação sobre os estudantes do 9º ano e acolhimento na 1ª série. Validar antes de recomendar.",
   "indicadores": ["E3"]},
  {"id": "proficiencia", "tema": "Proficiência em Língua Portuguesa e Matemática (300 pontos ou mais)",
   "cobertura": "Nenhum referencial cita o SAEB, proficiência ou metas de LP e MT. O Itaú Social cita LP e MT só nos Mapas de Foco.",
   "complemento": "Metas de percentual de estudantes com 300 pontos ou mais por componente, pactuadas no plano estratégico e na escola. Validar antes de recomendar.",
   "indicadores": ["A1", "A2", "A3"]},
  {"id": "evasao_juventude", "tema": "Evasão aos 17 anos",
   "cobertura": "Bem coberta no Itaú Social (SM-73 a SM-79) e no MEC (GE-73, GE-78, GE-84, GE-201), mas pensada para crianças do Ensino Fundamental.",
   "complemento": "Considerar fatores próprios da juventude: trabalho, gravidez e sentido do Ensino Médio. Validar antes de recomendar.",
   "indicadores": ["P1"]},
  {"id": "registro_censo", "tema": "Qualidade do registro no Censo Escolar",
   "cobertura": "Implícita: registro qualificado (GE-196), cadastros oficiais (GE-219) e interoperabilidade (GE-SEC-86). Nenhum cita o Educacenso ou a Situação do Aluno.",
   "complemento": "Rotina de conferência do rendimento informado no Educacenso antes do fechamento. Validar antes de recomendar.",
   "indicadores": ["D1"]},
  {"id": "diagnostico_tpe", "tema": "Diagnóstico de acesso e trajetória",
   "cobertura": "O TPE propõe perguntas por dimensão na Tabela 1, mas o conteúdo se perdeu na conversão do PDF.",
   "complemento": "Recuperar a Tabela 1 no PDF original do Todos Pela Educação.",
   "indicadores": ["P1", "F1", "F2"]},
  {"id": "contexto_2021", "tema": "Práticas ancoradas na pandemia",
   "cobertura": "O documento do Itaú Social é de 2021, e várias práticas estão ancoradas na pandemia (protocolos sanitários, continuum curricular 2020–2021).",
   "complemento": "Ler as práticas SM-54 a SM-71 e a SM-57 como princípios (acolhimento, promoção com recomposição), não como regras.",
   "indicadores": ["P1", "F2"]}
]
```

- [ ] **Passo 2: Escrever os testes que falham**

Acrescente ao fim de `agente/tests/dados/test_leitores.py`:

```python
INDICADORES = {"P1", "F2", "F1", "A1", "A2", "A3", "E1", "E2", "E3", "Q1", "D1"}


def test_catalogo_tem_541_praticas_e_confere_com_as_ancoras():
    from dados.carregar_iie import ler_catalogo
    from dados.conferir_catalogo import conferir, ler_ancoras
    from dados.conferir_catalogo import ler_catalogo as ler_para_conferir
    catalogo = ler_catalogo(ANEXOS / "catalogo_praticas.csv")
    assert len(catalogo) == len({p[0] for p in catalogo}) == 541
    erros, _ = conferir(ler_para_conferir([ANEXOS / "catalogo_praticas.csv"]), ler_ancoras())
    assert erros == []


def test_precondicoes_vem_das_linhas_base_da_matriz():
    from dados.carregar_iie import ler_precondicoes
    precondicoes, vinculos = ler_precondicoes(ANEXOS / "matriz_indicador_pratica.csv")
    assert [p[0] for p in precondicoes] == ["lideranca", "acompanhamento", "planejamento", "monitoramento",
                                            "recursos", "coerencia"]
    recursos = [v[1] for v in vinculos if v[0] == "recursos"]
    assert recursos[:3] == ["SM-17", "SM-33", "SM-34"] and "SM-49" in recursos and recursos[-1] == "GE-208"
    assert len(vinculos) == 50


def test_perfis_e_lacunas():
    from dados.carregar_iie import ler_lacunas, ler_perfis
    perfis, vinculos = ler_perfis(SEEDS / "perfis.json", INDICADORES)
    assert [p[0] for p in perfis] == ["fluxo", "aprendizagem", "duplo", "evasao", "perda_em", "dado"]
    assert len(vinculos) == 26
    assert len(ler_lacunas(SEEDS / "lacunas.json", INDICADORES)) == 8


def test_perfil_com_indicador_desconhecido_e_recusado(tmp_path):
    import pytest
    from dados.carregar_iie import ler_perfis
    arquivo = tmp_path / "perfis.json"
    arquivo.write_text('[{"id": "x", "nome": "X", "criterio": "c", "sequencia": ["Z9"], "descricao": "d", "praticas": []}]')
    with pytest.raises(ValueError, match="Z9"):
        ler_perfis(arquivo, INDICADORES)
```

Substitua `agente/tests/sql/test_carga.py` por:

```python
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
    assert tabelas == ["agente_memoria", "conversa", "cota_diaria", "feedback", "kb_versao", "mensagem", "usuario"]
```

Crie `agente/tests/sql/test_praticas.py`:

```python
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
```

- [ ] **Passo 3: Rodar e ver falhar**

Rode `pytest tests -v`.
Esperado: `ImportError: cannot import name 'ler_precondicoes'`, e falhas de `relation "iie.precondicao" does not exist`.

- [ ] **Passo 4: Implementar a migração** — `agente/supabase/migrations/0005_base_de_praticas.sql`

```sql
-- IIE Conselheiro — 0005: base de práticas completa (proposta 03, seção 6.1)
-- Catálogo das 541 práticas dos três referenciais, pré-condições, pacotes por perfil de território, lacunas,
-- busca textual e as funções iie.fn_buscar_praticas e iie.fn_pacote. A iie.fn_praticas passa a trazer as lacunas.

-- ------------------------------------------------------------ catálogo
-- Sem acento e imutável, para poder entrar na coluna de busca gerada.
create or replace function iie.sem_acento(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))
$$;

alter table iie.pratica
  add column if not exists nivel     text check (nivel in ('Escola', 'Secretaria', 'Estratégico')),
  add column if not exists secao     text,
  add column if not exists nome      text,
  add column if not exists descricao text,
  add column if not exists alavancas text[] not null default '{}'
    check (alavancas <@ array['acesso', 'fluxo', 'aprendizagem', 'equidade', 'dados', 'estruturantes']);

alter table iie.pratica add column if not exists busca tsvector generated always as (
  setweight(to_tsvector('portuguese', iie.sem_acento(nome)), 'A') ||
  setweight(to_tsvector('portuguese', iie.sem_acento(descricao)), 'B') ||
  setweight(to_tsvector('portuguese', iie.sem_acento(secao)), 'C')
) stored;
create index if not exists pratica_busca on iie.pratica using gin (busca);

-- ------------------------------------------------------------ relação completa do doc 09
create table if not exists iie.precondicao (
  id             text primary key,                    -- lideranca, acompanhamento, planejamento, ...
  nome           text not null,
  o_que_garantir text not null,
  ordem          int  not null
);

create table if not exists iie.precondicao_pratica (
  precondicao_id text not null references iie.precondicao (id) on delete cascade,
  pratica_id     text not null references iie.pratica (id),
  ordem          int  not null,
  primary key (precondicao_id, pratica_id)
);

create table if not exists iie.perfil_territorio (
  id        text primary key,                         -- fluxo, aprendizagem, duplo, evasao, perda_em, dado
  nome      text not null,
  criterio  text not null,
  sequencia text[] not null,                          -- IDs de indicador, ou 'base' (pré-condições)
  descricao text not null,
  ordem     int  not null
);

create table if not exists iie.perfil_pratica (
  perfil_id  text not null references iie.perfil_territorio (id) on delete cascade,
  pratica_id text not null references iie.pratica (id),
  ordem      int  not null,
  primary key (perfil_id, pratica_id)
);

create table if not exists iie.lacuna (
  id          text primary key,
  tema        text not null,
  cobertura   text not null,
  complemento text not null,
  indicadores text[] not null,
  ordem       int  not null
);

-- ------------------------------------------------------------ funções
create or replace function iie.fn_lacunas(p_indicadores text[])
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('tema', l.tema, 'cobertura', l.cobertura, 'complemento', l.complemento,
                                               'indicadores', to_jsonb(l.indicadores)) order by l.ordem), '[]'::jsonb)
  from iie.lacuna l
  where l.indicadores && p_indicadores
$$;

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
        and (p_papel is null or iie.norm(ip.papel) = iie.norm(p_papel))), '[]'::jsonb),
    'lacunas', iie.fn_lacunas(array[i.id]));
end $$;

create or replace function iie.fn_buscar_praticas(p_termo text, p_fonte text default null, p_nivel text default null,
                                                  p_limite int default 10)
returns jsonb language plpgsql stable as $$
declare
  v_lim int := least(greatest(coalesce(p_limite, 10), 1), 20);
  v_q   tsquery;
  v_res jsonb;
begin
  if coalesce(trim(p_termo), '') = '' then
    raise exception using errcode = '22023', message = 'termo_vazio: informe o que procurar';
  end if;
  v_q := websearch_to_tsquery('portuguese', iie.sem_acento(p_termo));
  for tentativa in 1..2 loop
    select jsonb_agg(x.pratica order by x.relevancia desc, x.id) into v_res
    from (
      select p.id, ts_rank(p.busca, v_q) as relevancia,
             jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'fonte', p.fonte,
                                'nivel', p.nivel, 'secao', p.secao, 'documento', p.documento, 'linhas', p.linhas,
                                'indicadores', coalesce((select jsonb_agg(distinct ip.indicador_id)
                                                         from iie.indicador_pratica ip
                                                         where ip.pratica_id = p.id), '[]'::jsonb)) as pratica
      from iie.pratica p
      where p.busca @@ v_q
        and (p_fonte is null or iie.norm(p.fonte) = iie.norm(p_fonte))
        and (p_nivel is null or iie.norm(p.nivel) = iie.norm(p_nivel))
      order by relevancia desc, p.id
      limit v_lim
    ) x;
    exit when v_res is not null or tentativa = 2;
    -- Nada com todas as palavras: tenta com qualquer uma delas.
    v_q := replace(v_q::text, ' & ', ' | ')::tsquery;
  end loop;
  return jsonb_build_object('termo', p_termo, 'fonte', p_fonte, 'nivel', p_nivel,
                            'praticas', coalesce(v_res, '[]'::jsonb),
                            'total', jsonb_array_length(coalesce(v_res, '[]'::jsonb)));
end $$;

create or replace function iie.fn_pacote(p_perfil text)
returns jsonb language plpgsql stable as $$
declare
  pf iie.perfil_territorio;
begin
  select * into pf from iie.perfil_territorio
  where id = iie.norm(p_perfil) or iie.norm(nome) = iie.norm(p_perfil);
  if not found then
    raise exception using errcode = 'P0002', message = format('perfil_desconhecido: %s', p_perfil),
      hint = (select 'Perfis: ' || string_agg(id, ', ' order by ordem) from iie.perfil_territorio);
  end if;
  return jsonb_build_object(
    'perfil', jsonb_build_object('id', pf.id, 'nome', pf.nome, 'criterio', pf.criterio,
                                 'sequencia', to_jsonb(pf.sequencia), 'descricao', pf.descricao),
    'praticas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'fonte', p.fonte,
                                          'nivel', p.nivel, 'documento', p.documento, 'linhas', p.linhas)
                       order by pp.ordem)
      from iie.perfil_pratica pp join iie.pratica p on p.id = pp.pratica_id
      where pp.perfil_id = pf.id), '[]'::jsonb),
    'precondicoes', (
      select jsonb_agg(jsonb_build_object(
               'id', pc.id, 'nome', pc.nome, 'o_que_garantir', pc.o_que_garantir,
               'praticas', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'fonte', p.fonte,
                                                                         'linhas', p.linhas) order by cp.ordem)
                                     from iie.precondicao_pratica cp join iie.pratica p on p.id = cp.pratica_id
                                     where cp.precondicao_id = pc.id), '[]'::jsonb))
             order by pc.ordem)
      from iie.precondicao pc),
    'lacunas', iie.fn_lacunas(pf.sequencia));
end $$;

-- ------------------------------------------------------------ permissões (as tabelas novas seguem a 0003)
grant select on all tables in schema iie to agente_leitura, n8n_operacao;
grant execute on all functions in schema iie to agente_leitura, n8n_operacao;

do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'iie' loop
    execute format('alter table iie.%I enable row level security', r.tablename);
    execute format('drop policy if exists leitura on iie.%I', r.tablename);
    execute format('create policy leitura on iie.%I for select to agente_leitura, n8n_operacao using (true)', r.tablename);
  end loop;
end $$;
```

- [ ] **Passo 5: Implementar a carga** — substitua `agente/dados/carregar_iie.py` por:

```python
"""Carrega os dados do IIE, os indicadores, a base de práticas e os alertas no esquema `iie` do Supabase.

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

from dados.conferir_catalogo import citacoes

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


def ler_catalogo(caminho: Path) -> list[tuple]:
    """Catálogo completo de práticas (contexto/anexos/catalogo_praticas.csv)."""
    return [(r["id"], r["fonte"], r["documento"], r["linhas"], r["nivel"], r["secao"], r["nome"], r["descricao"],
             [a for a in r["alavancas"].split("|") if a]) for r in _ler_csv(caminho)]


def ler_precondicoes(caminho_matriz: Path) -> tuple[list[tuple], list[tuple]]:
    """Pré-condições: linhas BASE da matriz, no formato "o que garantir — práticas citadas com linhas"."""
    precondicoes, vinculos = [], []
    for r in _ler_csv(caminho_matriz):
        if r["indicador_id"] != "BASE":
            continue
        precondicao_id = normalizar(r["pratica"]).split()[0]  # "Liderança escolar" -> "lideranca"
        texto, _, referencias = r["o_que_fazer"].partition(" — ")
        precondicoes.append((precondicao_id, r["pratica"], texto.strip(), len(precondicoes) + 1))
        citadas = list(dict.fromkeys(pid for pid, _ in citacoes(referencias)))
        vinculos.extend((precondicao_id, pid, ordem) for ordem, pid in enumerate(citadas, start=1))
    return precondicoes, vinculos


def ler_perfis(caminho: Path, indicadores: set[str]) -> tuple[list[tuple], list[tuple]]:
    """Pacotes por perfil de território (doc 09 §7). A sequência usa IDs de indicador ou "base" (pré-condições)."""
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    for d in dados:
        invalidos = set(d["sequencia"]) - indicadores - {"base"}
        if invalidos:
            raise ValueError(f"perfil {d['id']}: sequência com indicadores desconhecidos {sorted(invalidos)}")
    perfis = [(d["id"], d["nome"], d["criterio"], d["sequencia"], d["descricao"], ordem)
              for ordem, d in enumerate(dados, start=1)]
    vinculos = [(d["id"], pid, ordem) for d in dados for ordem, pid in enumerate(d["praticas"], start=1)]
    return perfis, vinculos


def ler_lacunas(caminho: Path, indicadores: set[str]) -> list[tuple]:
    """Lacunas dos referenciais em relação ao IIE (doc 09 §8)."""
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    for d in dados:
        if not d["indicadores"] or not set(d["indicadores"]) <= indicadores:
            raise ValueError(f"lacuna {d['id']}: indicadores inválidos {d['indicadores']}")
    return [(d["id"], d["tema"], d["cobertura"], d["complemento"], d["indicadores"], ordem)
            for ordem, d in enumerate(dados, start=1)]


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
        "catalogo": anexos / "catalogo_praticas.csv",
        "perfis": seeds / "perfis.json",
        "lacunas": seeds / "lacunas.json",
    }
    territorios = ler_territorios(arquivos["territorios"])
    id_por_sigla = {t[3]: t[0] for t in territorios}
    oficial = ler_oficial(arquivos["oficial"], id_por_sigla)
    componentes = ler_componentes(arquivos["componentes"], id_por_sigla)
    _, vinculos = ler_matriz(arquivos["matriz"])
    praticas = ler_catalogo(arquivos["catalogo"])
    indicadores = ler_indicadores(arquivos["indicadores"])
    ids_indicador = {i[0] for i in indicadores}
    precondicoes, vinculos_precondicao = ler_precondicoes(arquivos["matriz"])
    perfis, vinculos_perfil = ler_perfis(arquivos["perfis"], ids_indicador)
    lacunas = ler_lacunas(arquivos["lacunas"], ids_indicador)
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
        for tabela in ("indicador_pratica", "precondicao_pratica", "perfil_pratica", "alerta_dado",
                       "precondicao", "perfil_territorio", "lacuna"):
            cur.execute(f"delete from iie.{tabela}")
        cur.execute("delete from iie.pratica where id <> all(%s)", ([p[0] for p in praticas],))
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
            """insert into iie.pratica (id, fonte, documento, linhas, nivel, secao, nome, descricao, alavancas)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               on conflict (id) do update set fonte = excluded.fonte, documento = excluded.documento,
                 linhas = excluded.linhas, nivel = excluded.nivel, secao = excluded.secao, nome = excluded.nome,
                 descricao = excluded.descricao, alavancas = excluded.alavancas""",
            praticas)
        cur.executemany("insert into iie.precondicao (id, nome, o_que_garantir, ordem) values (%s, %s, %s, %s)",
                        precondicoes)
        cur.executemany("insert into iie.precondicao_pratica (precondicao_id, pratica_id, ordem) values (%s, %s, %s)",
                        vinculos_precondicao)
        cur.executemany("""insert into iie.perfil_territorio (id, nome, criterio, sequencia, descricao, ordem)
                           values (%s, %s, %s, %s, %s, %s)""", perfis)
        cur.executemany("insert into iie.perfil_pratica (perfil_id, pratica_id, ordem) values (%s, %s, %s)",
                        vinculos_perfil)
        cur.executemany("""insert into iie.lacuna (id, tema, cobertura, complemento, indicadores, ordem)
                           values (%s, %s, %s, %s, %s, %s)""", lacunas)
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
                    "vinculos": len(vinculos), "alertas": len(alertas), "precondicoes": len(precondicoes),
                    "vinculos_precondicao": len(vinculos_precondicao), "perfis": len(perfis),
                    "vinculos_perfil": len(vinculos_perfil), "lacunas": len(lacunas)}
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

- [ ] **Passo 6: Rodar e ver passar**

Rode `pytest tests -v`. Esperado: **68 testes passam**.

Rode as migrações 0002 a 0005 e a carga uma segunda vez. Esperado: nenhum erro e o mesmo JSON de contagens:

```bash
for f in supabase/migrations/000[2345]*.sql; do psql "$DATABASE_URL_TEST" -v ON_ERROR_STOP=1 -f "$f" || break; done
python -m dados.carregar_iie --database-url "$DATABASE_URL_TEST" --responsavel teste
```

`{"territorios": 28, "resultados_oficiais": 336, "componentes": 112, "indicadores": 11, "praticas": 541, "vinculos": 133, "alertas": 10, "precondicoes": 6, "vinculos_precondicao": 50, "perfis": 6, "vinculos_perfil": 26, "lacunas": 8}`

**Limite conhecido:** a busca é textual, em português e sem acento, mas sem sinônimos. Por exemplo, "professores" não encontra "docentes". Avaliar na P4 se é preciso um dicionário de sinônimos.

- [ ] **Passo 7: Commit**

```bash
git add agente
git commit -m "feat(dados): relação completa indicadores × práticas no banco e funções de busca"
```

---

### Tarefa 8: Aplicar no Supabase (desenvolvimento e depois produção)

Esta tarefa é operacional e não tem código novo. **Antes de começar, confirme com o responsável pelo projeto qual projeto (ou *branch*) de desenvolvimento usar.** Repita em produção só depois de a P2 estar aprovada.

> **Como foi feita em 2026-10-13.** O ambiente é um Supabase auto-hospedado no Easypanel (`supabase-iie.9cyl9k.easypanel.host`), com Postgres 15.8, sem acesso direto à porta do Postgres. Os passos 2 a 5 foram feitos pelo *postgres-meta* da própria instância.
>
> | O que foi feito | Como |
> |---|---|
> | Migrações (passo 2) | `POST <url>/pg/query`, com a chave `service_role` e o corpo `{"query": "<conteúdo do arquivo>"}`. Um envio por arquivo, e cada envio roda numa transação só. Tudo foi ensaiado antes num banco limpo |
> | Usuários de login (passo 3) | A senha vai em hash SCRAM gerado localmente (`password 'SCRAM-SHA-256$…'`), para não trafegar nem ficar registrada em texto. As senhas ficam em `agente/.env.dev`, fora do git |
> | Carga (passo 4) | Feita a partir do banco de teste validado: `pg_dump --data-only --column-inserts --schema=iie` gerado por um pg_dump 15, mantendo só as linhas `INSERT` e `setval`, enviado num único envio |
> | Conferência (passo 5) | Feita com `has_table_privilege` e `has_function_privilege`, sem trocar de papel na conexão compartilhada. Resultado: o agente executa as funções e não grava; o n8n grava mensagens e não altera usuários; `anon` e `authenticated` não acessam `iie`; as 20 tabelas estão com RLS |
>
> **No auto-hospedado, o passo 1 é diferente:** acrescente `app` à variável `PGRST_DB_SCHEMAS` do serviço `rest` no Easypanel e reinicie o serviço.
>
> **Pendente:**
> - passo 1 (expor `app`);
> - passo 6 (primeiro administrador);
> - a troca das chaves de demonstração, que é obrigatória (ver o plano 02, seção 4.4).

**Interfaces:**
- Produz os usuários de login `agente_app` (membro de `agente_leitura`) e `n8n_app` (membro de `n8n_operacao`). As *strings* de conexão desses usuários vão para o cofre de segredos: o n8n as consome nas credenciais `iie-leitura` e `iie-operacao` (P2).
- Produz o primeiro administrador do site.

- [ ] **Passo 1: Expor o esquema `app`**

No painel do Supabase, em *Settings → API → Exposed schemas*, acrescente `app`. **Não** acrescente `iie`.

- [ ] **Passo 2: Aplicar as migrações**

Use a *connection string* de sessão (porta 5432) do painel, com o usuário `postgres`. **Não** aplique `tests/sql/supabase_simulado.sql`: o Supabase já tem `auth` e os papéis.

```bash
export SUPABASE_DB_URL='postgresql://postgres:<senha do painel>@<host do painel>:5432/postgres'
for f in agente/supabase/migrations/000*.sql; do psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f" || break; done
```

Esperado: nenhum `ERROR`.

- [ ] **Passo 3: Criar os usuários de login**

```bash
SENHA_AGENTE=$(openssl rand -base64 24); SENHA_N8N=$(openssl rand -base64 24)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v s1="$SENHA_AGENTE" -v s2="$SENHA_N8N" <<'SQL'
create role agente_app login password :'s1' in role agente_leitura;
create role n8n_app login password :'s2' in role n8n_operacao;
SQL
echo "Guardar no cofre -> agente_app: $SENHA_AGENTE | n8n_app: $SENHA_N8N"
```

No *pooler* do Supabase, o usuário da *string* de conexão é `agente_app.<project-ref>`.

- [ ] **Passo 4: Carregar os dados**

```bash
cd agente && . .venv/bin/activate
python -m dados.carregar_iie --database-url "$SUPABASE_DB_URL" --responsavel "<seu nome>"
```

Esperado: o mesmo JSON de contagens da Tarefa 7.

- [ ] **Passo 5: Conferir com o usuário do agente**

```bash
AGENTE="postgresql://agente_app.<project-ref>:$SENHA_AGENTE@<host do pooler>:5432/postgres"
psql "$AGENTE" -c "select iie.fn_consultar_iie('CE') -> 'serie'"
psql "$AGENTE" -c "select iie.fn_pacote('evasao') -> 'praticas' -> 0 ->> 'id'"
psql "$AGENTE" -c "insert into iie.alerta_dado (natureza, severidade, texto) values ('ambos','info','x')"
```

Esperado:
- a 1ª consulta devolve `[{"ano": 2013, "valor": 10.70}, …, {"ano": 2019, "valor": 21.20}]`;
- a 2ª devolve `SM-79`;
- a 3ª falha com `permission denied`.

- [ ] **Passo 6: Criar o primeiro administrador**

O gatilho de cadastro exige os metadados do formulário do site. Por isso, uma conta criada em *Authentication → Add user* no painel, que vai sem metadados, **é recusada**. Até o site existir (P3), crie a conta pela API de administração do Auth, com a chave de serviço, e promova-a por SQL:

```bash
curl -s -X POST "https://<project-ref>.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "<e-mail da equipe>", "password": "<senha forte>", "email_confirm": true,
       "user_metadata": {"nome": "<nome>", "perfil": "equipe_interna", "instituicao": "Lupa Social",
                         "uf": "<UF>", "municipio_ibge": "<código IBGE de 7 dígitos>",
                         "municipio_nome": "<município>", "aceite_termo": true}}'
psql "$SUPABASE_DB_URL" -c "update app.usuario set status = 'ativo', papel = 'admin' where email = '<e-mail da equipe>'"
```

- [ ] **Passo 7: Conferir os avisos de segurança**

No painel, abra *Advisors → Security*. Esperado: nenhum aviso de "RLS disabled" nas tabelas de `iie` e `app`. Avisos de *search_path* em funções do esquema `iie`, que não é exposto, são aceitos. Registre o resultado na descrição do PR.
