# 07 — Lacunas, riscos e próximos passos

Inventário feito em 2026-09-10 (commit `60e7bfb`). Neste levantamento o R não estava instalado. Os pontos sobre execução foram deduzidos da leitura do código, e os números foram conferidos em Python sobre as `.rds`.

## 1. Bloqueios de reprodução (o script 04 não roda de ponta a ponta)

| # | Problema | Onde | Impacto | Correção sugerida |
|---|---|---|---|---|
| B1 | `calc_iie_2019_geral()` é chamada, mas não está definida em nenhum arquivo | [04_calculo_iie.Rmd:118](../codigos_iie/04_calculo_iie.Rmd#L118) | o knit falha no chunk `calculo_2019` | implementar o procedimento publicado (ver [02_metodologia.md](02_metodologia.md#7-tratamento-especial-de-2019)); há uma versão de referência em [anexos/reproducao_iie.py](anexos/reproducao_iie.py) (`p_basico_2019`, hipótese B) |
| B2 | A base do Censo não tem a coorte 2004 (ano 2021): só 2015, 2017 e 2019 | `dados/censo_escolar_iie_geral.rds`; comentário em [04_calculo_iie.Rmd:39](../codigos_iie/04_calculo_iie.Rmd#L39) | o IIE 2021 não é produzido; a planilha teria só 2015, 2017 e 2019. O README promete 2015–2021 | versionar a base agregada da coorte 2004 (extraída da Sala Segura) ou ajustar o README |
| B3 | A pasta de saída `../Resultados/` não existe | [04_calculo_iie.Rmd:143](../codigos_iie/04_calculo_iie.Rmd#L143) | `write_xlsx` falha | `dir.create("../Resultados", showWarnings = FALSE)` antes de exportar |

## 2. Defeitos de código

| # | Problema | Onde | Detalhe |
|---|---|---|---|
| D1 | O helper `if_error()` não funciona como pretendido | [03_pre_processamento_pnadc.Rmd:127-129](../codigos_iie/03_pre_processamento_pnadc.Rmd#L127-L129), definição na [linha 141](../codigos_iie/03_pre_processamento_pnadc.Rmd#L141) | `exists(substitute(x))` recebe um símbolo e procura no ambiente da função, não nas colunas do data frame. O resultado é erro ("invalid first argument") ou `FALSE`. No segundo caso, as três colunas viram 0 e **o ajuste de evasão é zerado em silêncio**. As `.rds` versionadas têm valores não nulos, então foram geradas por outra versão do código. Correção: `for (v in c("Fora_com_EM","Fora_sem_EM","outros")) if (!v %in% names(df)) df[[v]] <- 0`, ou transformar `var_fora_limpo` em fator e usar `pivot_wider(..., names_expand = TRUE)` |
| D2 | Filtro de proficiência inconsistente entre edições | [02:98](../codigos_iie/02_pre_processamento_saeb.Rmd#L98) × [02:144](../codigos_iie/02_pre_processamento_saeb.Rmd#L144) | 2015–2019 exigem LP e MT não nulos; 2021 exige só LP. Em 2021, alunos sem MT e com LP < 300 contam como "abaixo", e os com LP ≥ 300 são descartados. Isso gera um viés pequeno para baixo |
| D3 | Maiúsculas nos caminhos | 01–03 gravam em `../Dados/`; o 04 lê de `../dados/` ([04:35](../codigos_iie/04_calculo_iie.Rmd#L35)) | só funciona em sistemas de arquivos que não diferenciam maiúsculas (macOS). Padronizar com `here::here("dados")` |
| D4 | Código e dados fora de sincronia | `saeb_iie_geral.rds` contém 2023; o script 02 só gera 2015–2021 | a versão que gerou as `.rds` não está no repositório |
| D5 | Nomes de arquivos no README não batem com os reais | [README.md:71](../README.md#L71) e [README.md:86](../README.md#L86) | `01_preprocessamento_censo.Rmd` → `01_pre_processamento_censo_escolar.Rmd`; `04_calculo_iie_geral.Rmd` → `04_calculo_iie.Rmd` |
| D6 | Comentário impreciso sobre etapas excluídas | [01:48](../codigos_iie/01_pre_processamento_censo_escolar.Rmd#L48) | 29/34 são EM e integrado **não seriados**; 39/40 são técnico **concomitante/subsequente** (não EJA) |
| D7 | Ambiente sem controle de versões | — | sem `renv.lock`, testes ou CI. Recomendado: `renv::init()` e um teste de regressão que compare a saída com [anexos/iie_uf_oficial_2013_2019.csv](anexos/iie_uf_oficial_2013_2019.csv) |

## 3. Riscos de dados e de metodologia

| # | Risco | Evidência | Mitigação |
|---|---|---|---|
| R1 | **BA, coorte de 2019**: queda artificial de conclusões em 2020 | aprovados no 3º EM em t+1: −77% (43.774 → 9.882); "conclui até 18" cai para 28,9% | sinalizar no painel; investigar os registros de rendimento de 2020 da rede estadual; considerar imputação |
| R2 | **SC**: quebra estrutural a partir da coorte de 2017 | "em linha" cai à metade e "atrasado 1" dobra | verificar a data de corte e o registro de matrícula |
| R3 | Volatilidade da PNADc em UFs pequenas | `perc_fora` do TO: 8,5% → 3,1% → 7,1% | suavizar (média de trimestres ou de 2 anos) ou publicar intervalos de confiança |
| R4 | Proficiência vinda de coortes vizinhas | adiantados e atrasados usam o SAEB de t (outra geração) | premissa documentada; testar sensibilidade |
| R5 | Possível dupla contagem em cursos de 4 anos | etapas 28, 33 e 38 incluídas junto com 27, 32 e 37, sem deduplicar alunos entre anos | confirmar como a extração da Sala Segura trata o caso |
| R6 | Dupla contagem entre evadidos (PNADc) e atrasados 2+ (Censo) | quem estava fora aos 17 e voltou em t+1 entra nos dois grupos | efeito pequeno; documentar |
| R7 | Salto de 2019 | alta do SAEB 2019 com possível "inflação de notas"; imputação por trajetória | comunicar com ressalva; comparar com Pré-Inclusão e Sucesso |
| R8 | Vale de 2015 | queda em todas as UFs exceto AM; possível falha na amostra da rede privada do SAEB 2015 | idem |
| R9 | Rótulo enganoso `Fora_com_EM` | inclui quem está estudando no ensino superior | renomear para `com_EM` |
| R10 | Categoria "Adequado" sem corte no código | as figuras mostram Abaixo/Básico/Adequado; os estudos usam 375 | implementar o corte 375 para gerar o Sucesso Educacional |
| R11 | "IIE Legado" sem definição | citado só no README (painel Looker) | documentar (hipótese: série original da Metas Sociais, 2007–2019) |

## 4. Próximos passos sugeridos (por prioridade)

1. **Tornar o script 04 executável:** implementar `calc_iie_2019_geral()`, criar `Resultados/` e padronizar caminhos (B1, B3, D3).
2. **Fechar 2021:** versionar a base do Censo da coorte 2004 e rodar a série 2015–2021 (B2).
3. **Corrigir `if_error()`** e o filtro de 2021 do SAEB, e sincronizar os scripts com a versão que gerou as `.rds`, incluindo o SAEB 2023 (D1, D2, D4).
4. **Teste de regressão** contra a Tabela 7 oficial: tolerância de 0,3 ponto para 2015/2017 e de 1,0 para 2019 (D7).
5. **Tratar anomalias territoriais** (BA 2019, SC) antes de publicar comparações entre UFs (R1, R2).
6. **Integrar 2023** quando o Censo 2024 estiver completo (coorte 2006).
7. **Expandir a família IIE no código:** Pré-Inclusão (250), Sucesso/Adequado (375), recortes por LP e MT, sexo e raça/cor, e capitais, alinhando o repositório ao painel Looker.
8. **Atualizar o README:** nomes de arquivos, anos realmente disponíveis e referência a esta pasta `contexto/`.
