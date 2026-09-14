# 05 — O que o IIE mostra sobre cada território

## 1. O que o índice revela sobre um território

Para um estado ou município, o IIE responde: **de cada 100 jovens nascidos num ano, quantos chegaram ao fim da educação básica no tempo certo e aprendendo o mínimo?** A mesma estrutura de cálculo mostra também **onde a coorte se perde**.

| Camada | Pergunta | Fonte da informação |
|---|---|---|
| **Nível** | Qual o IIE e a posição relativa do território? | IIE (0–100) |
| **Evolução** | A geração mais nova está mais incluída que a anterior? | série bienal (2013–2019 oficial; 2015–2021 no repo) |
| **Fluxo** | Quantos concluem até 18? Quantos seguem atrasados 2+? Quantos evadiram? | Censo Escolar + PNADc |
| **Aprendizagem** | Entre os que concluem no tempo, quantos têm o básico em LP e MT? | SAEB |
| **Família de cortes** | O quadro muda com régua mais baixa (250, Pré-Inclusão) ou mais alta (375, Sucesso Educacional/Adequado)? | SAEB com outros cortes |
| **Etapas anteriores** | A exclusão já aparece nos Anos Iniciais e Finais do EF? | IIE-AI (corte 250) e IIE-AF (corte 275) |
| **Recortes** | Como variam sexo, raça/cor e disciplina (LP × MT)? | painel Looker (não reproduzido no repo) |
| **Consequências** | O que o IIE antecipa sobre a vida adulta da geração? | estudos de pobreza e de indicadores socioeconômicos ([06_estudos.md](06_estudos.md)) |

## 2. Granularidades disponíveis

| Nível | Onde está | Método | Situação |
|---|---|---|---|
| **Brasil** | repo (`uf = 0`), estudos, Looker | Censo + SAEB + PNADc | publicado |
| **UF (27)** | repo, estudos (Tabela 7), Looker | Censo + SAEB + PNADc | publicado 2013–2019; 2021 previsto no repo, sem dados do Censo |
| **Capitais** | Looker | não documentado no repo | "em estágio avançado de validação" (estudo de pobreza, nov/2025) |
| **Municípios** | estudo IIEM (Instituto Natura) | Censo + SAEB; evasão estimada pela razão de matrículas Censo 2017/2008 (a PNADc não é representativa por município) | só 2017 (coorte 2000); 4.775 municípios |
| Sexo, raça/cor, LP/MT | Looker | — | não reproduzido no repo |

## 3. Série oficial por UF — IIE do Ensino Médio

Fonte: Fernandes, Felicio e Saad (2024), Tabela 7, p. 30. A transcrição foi conferida contra a imagem da página. Arquivo: [anexos/iie_uf_oficial_2013_2019.csv](anexos/iie_uf_oficial_2013_2019.csv).

| UF | 2013 | 2015 | 2017 | 2019 | Δ 2013→19 | Posição 2019 |
|---|---:|---:|---:|---:|---:|---:|
| **Brasil** | **12,8** | **9,6** | **13,6** | **19,0** | **+6,2** | — |
| SP | 18,1 | 13,2 | 17,6 | 27,0 | +8,9 | 1 |
| DF | 18,7 | 15,2 | 19,3 | 26,0 | +7,3 | 2 |
| GO | 13,6 | 9,6 | 17,4 | 25,8 | +12,2 | 3 |
| PR | 13,7 | 12,2 | 16,5 | 24,7 | +11,0 | 4 |
| ES | 15,2 | 12,7 | 18,6 | 24,6 | +9,4 | 5 |
| MG | 15,9 | 10,7 | 16,2 | 22,0 | +6,1 | 6 |
| CE | 10,7 | 7,8 | 13,5 | 21,2 | +10,5 | 7 |
| PE | 11,1 | 9,8 | 13,2 | 19,3 | +8,2 | 8 |
| RJ | 14,6 | 10,8 | 15,3 | 18,1 | +3,5 | 9 |
| RS | 16,6 | 11,0 | 14,9 | 17,6 | +1,0 | 10 |
| SC | 17,5 | 14,1 | 15,9 | 17,4 | −0,1 | 11 |
| MS | 12,0 | 9,5 | 12,5 | 16,8 | +4,8 | 12 |
| PB | 10,1 | 6,3 | 9,7 | 15,9 | +5,8 | 13 |
| RN | 9,5 | 5,8 | 8,3 | 15,5 | +6,0 | 14 |
| PI | 9,6 | 6,2 | 10,7 | 15,2 | +5,6 | 15 |
| MT | 9,1 | 7,2 | 9,6 | 13,4 | +4,3 | 16 |
| SE | 6,8 | 6,4 | 11,0 | 13,1 | +6,3 | 17 |
| RO | 8,4 | 6,3 | 9,9 | 12,1 | +3,7 | 18 |
| AL | 5,1 | 3,4 | 7,0 | 11,9 | +6,8 | 19 |
| TO | 7,0 | 4,8 | 9,9 | 11,8 | +4,8 | 20 |
| AC | 7,2 | 4,4 | 7,5 | 9,2 | +2,0 | 21 |
| MA | 3,8 | 2,6 | 5,8 | 8,9 | +5,1 | 22 |
| PA | 4,9 | 4,6 | 5,9 | 8,4 | +3,5 | 23 |
| RR | 5,9 | 4,9 | 5,7 | 8,3 | +2,4 | 24 |
| BA | 5,9 | 4,8 | 7,0 | 7,9 | +2,0 | 25 |
| AM | 4,2 | 6,4 | 6,1 | 7,7 | +3,5 | 26 |
| AP | 5,6 | 2,8 | 5,0 | 6,5 | +0,9 | 27 |

**Leituras principais**
- **A exclusão é a regra.** No Brasil de 2019, só 19 de cada 100 jovens estavam "incluídos". Mesmo em SP, o melhor estado, 73 de cada 100 não estavam.
- **A desigualdade regional é grande.** Em 2019, o maior IIE (SP, 27,0) é **4,2 vezes** o menor (AP, 6,5). Centro-Sul e DF lideram; Norte e parte do Nordeste ficam no fim da lista.
- **CE e PE são exceções nordestinas.** São as únicas UFs do Nordeste acima da média nacional em 2019 (CE 21,2 e PE 19,3, contra 19,0 do Brasil). O CE teve o 3º maior avanço desde 2013 (+10,5).
- **Maiores avanços de 2013 a 2019:** GO (+12,2), PR (+11,0), CE (+10,5), ES (+9,4) e SP (+8,9). **Estagnação:** SC (−0,1), AP (+0,9), RS (+1,0), AC e BA (+2,0).
- **2015 é um vale.** Todas as UFs, exceto o AM, caem em relação a 2013. O estudo aponta possível efeito teto ou falha na amostra da rede privada do SAEB 2015.
- **2019 é um salto.** Reflete a alta do SAEB 2019, que o próprio estudo relaciona a uma possível "inflação de notas" após a universalização do SAEB no EM público em 2017. Além disso, o valor de 2019 depende da imputação por trajetória ([02_metodologia.md](02_metodologia.md#7-tratamento-especial-de-2019)).

## 4. Onde cada UF perde a coorte: decomposição fluxo × aprendizagem

O IIE pode ser escrito como:

> **IIE ≈ % da coorte que conclui até os 18 × % de básico entre esses concluintes**

A tabela abaixo usa a reprodução feita a partir das `.rds`: 2017 pela fórmula do script 04; 2019 pelo procedimento publicado de imputação. As colunas de perfil comparam cada UF com o Brasil.

### IIE 2019 (coorte 2002)

| UF | IIE oficial | Conclui até 18 | Atrasados 2+ | Fora da escola sem EM | Básico entre concluintes | Perfil (vs. Brasil) |
|---|---:|---:|---:|---:|---:|---|
| **BR** | 19,0 | 62,6% | 31,0% | 6,4% | 29,8% | referência |
| SP | 27,0 | **83,0%** | 14,2% | 2,8% | 32,1% | fluxo + / aprendizagem + |
| DF | 26,0 | 64,2% | 31,7% | 4,2% | 39,7% | fluxo + / aprendizagem + |
| GO | 25,8 | 67,8% | 27,1% | 5,1% | 35,7% | fluxo + / aprendizagem + |
| PR | 24,7 | 73,0% | 22,7% | 4,3% | 32,9% | fluxo + / aprendizagem + |
| ES | 24,6 | 59,1% | 31,9% | 9,0% | **41,0%** | fluxo − / aprendizagem + |
| MG | 22,0 | 63,3% | 29,6% | 7,2% | 34,6% | fluxo + / aprendizagem + |
| CE | 21,2 | 67,4% | 21,4% | 11,1% | 31,0% | fluxo + / aprendizagem + |
| PE | 19,3 | 63,9% | 27,3% | 8,8% | 29,4% | fluxo + / aprendizagem − |
| RJ | 18,1 | 53,3% | 42,1% | 4,6% | 34,0% | fluxo − / aprendizagem + |
| RS | 17,6 | 56,5% | 40,3% | 3,2% | 29,4% | fluxo − / aprendizagem − |
| SC | 17,4 | 63,4% | 30,9% | 5,7% | 26,9% | fluxo + / aprendizagem − |
| MS | 16,8 | 55,3% | 34,5% | 10,2% | 30,3% | fluxo − / aprendizagem + |
| PB | 15,9 | 55,5% | 35,0% | 9,5% | 28,6% | fluxo − / aprendizagem − |
| RN | 15,5 | 52,8% | 39,4% | 7,8% | 29,2% | fluxo − / aprendizagem − |
| PI | 15,2 | 57,6% | 36,5% | 6,0% | 26,9% | fluxo − / aprendizagem − |
| MT | 13,4 | 65,9% | 24,4% | 9,7% | 19,8% | fluxo + / aprendizagem − |
| SE | 13,1 | 47,9% | 42,0% | 10,2% | 27,7% | fluxo − / aprendizagem − |
| RO | 12,1 | 55,3% | 35,6% | 9,2% | 22,6% | fluxo − / aprendizagem − |
| AL | 11,9 | 53,6% | 35,6% | 10,9% | 22,1% | fluxo − / aprendizagem − |
| TO | 11,8 | 59,1% | 33,8% | 7,1% | 20,7% | fluxo − / aprendizagem − |
| AC | 9,2 | 50,8% | 39,2% | 9,9% | 18,4% | fluxo − / aprendizagem − |
| MA | 8,9 | 58,5% | 32,4% | 9,0% | 15,1% | fluxo − / aprendizagem − |
| PA | 8,4 | 47,8% | 42,5% | 9,7% | 17,6% | fluxo − / aprendizagem − |
| RR | 8,3 | 53,2% | 35,7% | 11,1% | 16,3% | fluxo − / aprendizagem − |
| BA ⚠️ | 7,9 | 28,9% | 63,8% | 7,4% | 27,3% | fluxo − / aprendizagem − (anomalia, ver seção 7) |
| AM | 7,7 | 57,8% | 34,9% | 7,4% | 13,2% | fluxo − / aprendizagem − |
| AP | 6,5 | 52,1% | 35,3% | 12,6% | 12,5% | fluxo − / aprendizagem − |

### Tipologia resultante

| Perfil (2019) | UFs | Leitura |
|---|---|---|
| Fluxo + / aprendizagem + | SP, DF, GO, PR, MG, CE | sistemas que levam mais jovens ao fim no tempo **e** com mais aprendizagem |
| Fluxo − / aprendizagem + | ES, RJ, MS | aprendem bem, mas retêm ou atrasam muitos (RJ: 42% de atrasados 2+) → **gargalo de fluxo** |
| Fluxo + / aprendizagem − | PE, SC, MT | concluem no tempo, mas com pouca aprendizagem (MT: 19,8%) → **gargalo de aprendizagem** |
| Fluxo − / aprendizagem − | RS e 14 UFs do Norte/Nordeste (PB, RN, PI, SE, RO, AL, TO, AC, MA, PA, RR, BA, AM, AP) | gargalos duplos |

Outros padrões:
- **Evasão (PNADc, jovens de 17 anos fora da escola sem EM).** Caiu de 9,7% (2015) para 8,3% (2017), 6,4% (2019) e 3,8% (2021) no Brasil. Os maiores valores em 2019 estão em AP (12,6%), CE, RR (11,1%) e AL (10,9%).
- **Atraso é mais comum que evasão.** O grupo "atrasados 2+" (30–40% da coorte na maioria das UFs) pesa bem mais que a evasão.
- **A perda por aprendizagem é maior que a por fluxo.** Mesmo nas UFs de melhor desempenho, entre 6 e 7 de cada 10 concluintes no tempo não atingem o básico em LP **e** MT.

A decomposição completa (adiantados, em linha, atrasados, p(básico) por trajetória), para 2015, 2017 e 2019, está em [anexos/iie_uf_reproducao.csv](anexos/iie_uf_reproducao.csv).

## 5. Etapas anteriores: IIE nos Anos Iniciais e Finais do EF (2019)

Fonte: Tabela 7 do mesmo estudo. Os cortes são 250 (AI), 275 (AF) e 300 (EM), sempre em LP e MT. As séries completas de 2013–2019 estão no CSV oficial.

| | AI | AF | EM |
|---|---:|---:|---:|
| **Brasil** | 52,4 | 24,7 | 19,0 |
| Melhores | SP 67,5 · PR 65,3 · SC 64,1 · DF 63,2 · MG 62,0 | SP 32,4 · SC 32,3 · CE 31,5 · PR 30,8 · DF 30,0 | SP 27,0 · DF 26,0 · GO 25,8 · PR 24,7 · ES 24,6 |
| Piores | AP 28,6 · PA 28,8 · MA 29,1 · SE 34,6 · BA 34,8 | AP 8,9 · PA 10,7 · MA 11,0 · RR 12,8 · BA 13,8 | AP 6,5 · AM 7,7 · BA 7,9 · RR 8,3 · PA 8,4 |

Leitura: a exclusão se acumula ao longo das etapas. No Brasil, o índice cai de 52 (AI) para 25 (AF) e 19 (EM). As UFs mais frágeis já começam muito abaixo nos Anos Iniciais.

## 6. Municípios: IIEM 2017

Fonte: *IIE Municipal e suas relações com indicadores socioeconômicos*, de Paciencia e Ismail, Instituto Natura. Detalhes em [06_estudos.md](06_estudos.md).

| Faixa do IIEM (coorte 2000) | Nº de municípios |
|---|---:|
| < 2,5 | 1.456 |
| 2,5 a 5 | 916 |
| 5 a 7,5 | 631 |
| 7,5 a 10 | 498 |
| 10 a 20 | 1.028 |
| 20 a 30 | 201 |
| 30 a 40 | 33 |
| 40 a 50 | 10 |
| > 50 | 2 |
| sem cálculo (menos de 10 matrículas da coorte em 2008; concentrados em SP) | 797 |

- 73% dos municípios com índice ficam **abaixo de 10**.
- Valores **< 2,5** se concentram no Norte e em parte do Nordeste; os mais altos, no Centro-Sul (RO/norte de MT, GO, MG, ES, PR, SC, RS), com manchas no Ceará.
- Apenas 2 municípios passam de 50. O estudo não os nomeia nem publica valores por município.
- **Diferenças para o IIE estadual:**
  - evasão estimada pela razão de matrículas Censo 2017/2008, com teto de 100%;
  - migração não corrigida (superestima municípios receptores);
  - SAEB privado amostral (tende a subestimar o índice);
  - um único ano (2017).
- **Associações** (MQO com controles e efeitos de UF): +10 pontos de IIEM se associam a mais ingresso no ensino superior e mais emprego formal, e a menos homicídios masculinos, gravidez na adolescência e óbitos fetais. Os efeitos variam por perfil de município (5 clusters: Jatobá-PE, Coronel Sapucaia-MS, Nova Monte Verde-MT, Jaguariaíva-PR, Campinas-SP).

## 7. Cuidados na leitura territorial

| Cuidado | Evidência | Efeito |
|---|---|---|
| **BA, coorte de 2019** | Na `.rds` do Censo, os aprovados da BA no 3º EM em 2020 caíram **77%** em relação à coorte anterior (43.774 → 9.882), e os "atrasados 2+" subiram de 89.778 para 122.985. É compatível com a interrupção do ano letivo de 2020 na rede estadual baiana | "conclui até 18" cai para 28,9%. O IIE oficial da BA em 2019 (7,9) herda o problema, e a UF parece estagnada (+0,9 contra +5,4 do Brasil de 2017 a 2019) |
| **SC, quebra a partir de 2017** | "Em linha" cai de 42.265 (2015) para 21.055 (2017); "atrasado 1 ano" sobe de 14.690 para 32.305 | Provável efeito de data de corte ou de registro; SC fica estagnada na série (−0,1 de 2013 a 2019) |
| **PNADc em UFs pequenas** | `perc_fora` do TO: 8,5% → 3,1% → 7,1% | Oscilações de ±1 ponto no IIE sem mudança real |
| **Salto de 2019** | SAEB 2019 mais alto e imputação por trajetória | Comparar 2017 → 2019 com cautela |
| **Vale de 2015** | Queda generalizada, inclusive em outros cortes | Possível problema no SAEB 2015 |
| **Diferenças de vintage** | Reprodução × oficial: erro médio de 0,1 ponto (2015/2017) e 0,3 (2019); maior diferença em GO 2019 (−1,6) | Bases do repo e da publicação de 2024 não são idênticas |
| **Municípios** | Migração, SAEB privado amostral, filtro de 10 matrículas | Não comparar IIEM diretamente com o IIE de UF |

## 8. Ficha-modelo de território — exemplo: Ceará

| Item | Valor |
|---|---|
| IIE-EM (oficial) | 10,7 (2013) → 7,8 (2015) → 13,5 (2017) → **21,2 (2019)**; 7º lugar e melhor UF do Nordeste |
| Avanço 2013–2019 | +10,5 pontos (3º maior do país) |
| Fluxo 2019 | 67,4% concluem até 18 (Brasil: 62,6%); 21,4% atrasados 2+; **11,1% fora da escola sem EM** (acima do Brasil: 6,4%) |
| Aprendizagem 2019 | 31,0% de básico entre concluintes (Brasil: 29,8%) |
| Perfil | fluxo + / aprendizagem +; o principal ponto de atenção é a evasão |
| Etapas anteriores 2019 | AI 58,2 · AF 31,5 (3º maior AF do país) |
| Pontos de atenção | a evasão aos 17 anos continua entre as maiores do país |

A mesma ficha pode ser gerada para qualquer UF a partir de [anexos/iie_uf_reproducao.csv](anexos/iie_uf_reproducao.csv) e [anexos/iie_uf_oficial_2013_2019.csv](anexos/iie_uf_oficial_2013_2019.csv).
