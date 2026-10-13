# 04 — Dicionário de dados

## 1. Microdados de entrada (fora do repositório)

Todos os arquivos são CSV com separador `;`. Os nomes de coluna são convertidos para minúsculas nos scripts.

### 1.1 Censo Escolar — Situação do Aluno (restrito, Sala Segura INEP)

**Arquivo:** `../../Dados/SITUACAO_ALUNO_{ano}_COORTE{coorte}.csv`. São três anos por coorte (t−1, t, t+1), cada um já filtrado pela coorte de nascimento na extração.

| Variável | Uso | Valores relevantes |
|---|---|---|
| `co_uf` | UF da matrícula | código IBGE (11–53) |
| `tp_etapa_ensino` | etapa da matrícula | terminais do EM: `27, 28, 32, 33, 37, 38`; excluídas: `29, 34, 39, 40` e `≥ 65` (EJA/FIC) |
| `tp_situacao` | rendimento ao fim do ano | `5` = aprovado |

### 1.2 SAEB — 3ª série do EM (público, INEP)

**Arquivo:** `../../Dados/TS_ALUNO_3EM_{ano}.csv`

| Variável | Anos | Uso |
|---|---|---|
| `uf` ou `id_uf` | todos | UF da escola |
| `proficiencia_lp_saeb` | todos | proficiência em LP (escala SAEB); corte 300 |
| `proficiencia_mt_saeb` | todos | proficiência em MT (escala SAEB); corte 300 |
| `peso_aluno_lp` | todos | peso amostral, usado também para a classificação conjunta LP+MT |
| `tx_resp_q004` | 2015, 2017 | idade declarada: A/B → adiantado; C → em linha; D → atrasado; E–H → atrasado 2+ |
| `tx_resp_q02` | 2021 | idade declarada, 1º caractere: A → adiantado; B → em linha; C → atrasado; D–F → atrasado 2+ |
| — | 2019 | **sem variável de idade** nos microdados públicos |

As idades de cada letra foram inferidas do mapeamento feito no código. Confirme no questionário do aluno de cada edição.

### 1.3 PNAD Contínua — 2º trimestre (público, IBGE)

**Arquivo:** `../../Dados/PNADC_02{ano}.csv`

| Variável | Significado | Uso |
|---|---|---|
| `uf` | UF do domicílio | agregação |
| `v20082` | ano de nascimento | recorte da coorte: `= ano − 17` |
| `v3002` | frequenta escola? (1 sim, 2 não) | classificação |
| `v3003` / `v3003a` | curso que frequenta (codificação antiga / nova) | classificação (≥ 7 / ≥ 8 = superior) |
| `v3009` / `v3009a` | curso mais elevado que frequentou (antiga / nova) | classificação (ver [02_metodologia.md](02_metodologia.md#5-pnadc-quem-está-fora-da-escola-sem-em)) |
| `v3013` | último ano/série concluído com aprovação | ≥ 3 conta como EM concluído |
| `v1028` | peso amostral com calibração | expansão populacional |

## 2. Bases intermediárias versionadas (`dados/`)

Cada base traz 27 UFs + Brasil (`uf = 0`). O Brasil é a soma das UFs, com diferença ≤ 11 no SAEB por causa do arredondamento. Não há valores ausentes.

### 2.1 `censo_escolar_iie_geral.rds` — 336 linhas × 6 colunas

| Coluna | Tipo | Descrição |
|---|---|---|
| `ano` | double | ano de referência do IIE (coorte + 17) |
| `coorte` | int | ano de nascimento |
| `uf` | double | código IBGE; `0` = Brasil |
| `regiao` | chr | Norte, Nordeste, Sudeste, Sul, Centro-Oeste, Brasil |
| `grupo` | chr | `coorte_adiantado_Censo`, `coorte_emlinha_Censo`, `coorte_atrasado_Censo`, `coorte_atrasado2_Censo` |
| `n` | int | número de matrículas |

**Cobertura real:** 2015, 2017 e 2019 (coortes 1998, 2000 e 2002). **Falta 2021 (coorte 2004)**, embora o script 01 a preveja.

Totais Brasil: 2.439.858 (2015), 2.520.856 (2017) e 2.403.049 (2019).

### 2.2 `saeb_iie_geral.rds` — 952 linhas × 6 colunas

| Coluna | Tipo | Descrição |
|---|---|---|
| `ano` | double | edição do SAEB |
| `regiao` | chr | grande região ou Brasil |
| `uf` | double | código IBGE; `0` = Brasil |
| `grupo` | chr | `adiantado`, `linha`, `atrasado1ano`, `atrasado2anos`; em 2019 só `total` |
| `metric` | chr | `abaixo` (LP < 300 ou MT < 300) ou `basico` (LP ≥ 300 e MT ≥ 300) |
| `valor` | double | soma dos pesos amostrais, arredondada |

**Cobertura real:** 2015, 2017, 2019, 2021 e **2023**. A edição de 2023 não é gerada pela versão atual do script 02, o que indica que a `.rds` veio de uma versão mais nova do código.

Soma dos pesos (Brasil): 2,01 mi (2015), 2,02 mi (2017), 2,12 mi (2019), 2,25 mi (2021) e 2,01 mi (2023).

### 2.3 `pnadc_iie_geral.rds` — 112 linhas × 5 colunas

| Coluna | Tipo | Descrição |
|---|---|---|
| `ano` | double | ano da PNADc (2º trimestre) |
| `uf` | int | código IBGE; `0` = Brasil |
| `coorte_PNAD` | double | jovens da coorte (17 anos no ano), expandidos por `V1028` |
| `coorte_fora_sem_EM_PNAD` | double | desses, os que estão fora da escola sem EM |
| `regiao` | chr | grande região ou Brasil |

**Cobertura:** 2015, 2017, 2019 e 2021.

| Ano | `coorte_PNAD` (BR) | `coorte_fora_sem_EM_PNAD` (BR) | `perc_fora` |
|---|---:|---:|---:|
| 2015 | 3.198.586 | 311.327 | 9,7% |
| 2017 | 3.161.650 | 263.497 | 8,3% |
| 2019 | 2.879.237 | 183.237 | 6,4% |
| 2021 | 2.579.627 | 97.276 | 3,8% |

## 3. Saída final

**Arquivo:** `Resultados/iie_geral_2015_2021.xlsx`. É gerado pelo script 04 e não está versionado.

| Coluna | Descrição |
|---|---|
| `ano` | ano de referência do IIE |
| `uf` | código IBGE (`0` = Brasil) |
| `uf_sigla` | sigla (`BR` para o Brasil) |
| `IIE_Geral` | índice de 0 a 100, com 1 casa decimal |

## 4. Tabela de UFs

| Código | Sigla | Região | Código | Sigla | Região |
|---|---|---|---|---|---|
| 0 | BR | Brasil | 28 | SE | Nordeste |
| 11 | RO | Norte | 29 | BA | Nordeste |
| 12 | AC | Norte | 31 | MG | Sudeste |
| 13 | AM | Norte | 32 | ES | Sudeste |
| 14 | RR | Norte | 33 | RJ | Sudeste |
| 15 | PA | Norte | 35 | SP | Sudeste |
| 16 | AP | Norte | 41 | PR | Sul |
| 17 | TO | Norte | 42 | SC | Sul |
| 21 | MA | Nordeste | 43 | RS | Sul |
| 22 | PI | Nordeste | 50 | MS | Centro-Oeste |
| 23 | CE | Nordeste | 51 | MT | Centro-Oeste |
| 24 | RN | Nordeste | 52 | GO | Centro-Oeste |
| 25 | PB | Nordeste | 53 | DF | Centro-Oeste |
| 26 | PE | Nordeste | | | |

## 5. Arquivos derivados desta documentação (`contexto/anexos/`)

| Arquivo | Conteúdo |
|---|---|
| `reproducao_iie.py` | transcrição do cálculo do script 04 em Python (pandas + pyreadr), com duas reconstruções para 2019 (`2019_A_alternativa` e `2019_B_procedimento_publicado`) |
| `iie_uf_reproducao.csv` | 112 linhas (28 territórios × 4 conjuntos: 2015, 2017, 2019-A, 2019-B), com IIE, % por trajetória, % fora da escola, % concluiu até 18, % básico entre concluintes, p(básico) por trajetória e coorte ajustada |
| `iie_uf_oficial_2013_2019.csv` | série **oficial** por UF, transcrita da Tabela 7 de Fernandes, Felicio e Saad (2024, p. 30): IIE para Anos Iniciais (AI), Anos Finais (AF) e EM, de 2013 a 2019 |
