# 06 — Estudos produzidos com o IIE (pasta `estudos/`)

Resumo dos quatro PDFs, lidos na íntegra. As páginas citadas são as do PDF.

## Visão comparativa

| | Evolução do desempenho | Indicadores socioeconômicos | Pobreza | IIE Municipal (IIEM) |
|---|---|---|---|---|
| Arquivo | `IIE e a Evolucao do Desempenho da Educacao Basica.pdf` | `Relação entre IIE e Seleção de Indicadores Socioeconômicos.pdf` | `IIE_e_Pobreza.pdf` | `IIE Municipal.pdf` |
| Autoria | R. Fernandes, F. de Felicio, D. Saad | R. Fernandes, F. de Felicio, M. C. Galvão, P. F. Ravaioli | não nomeada (logo Lupa Social) | L. Paciencia, Z. Ismail |
| Instituição | Instituto Natura + Metas Sociais | Metas Sociais para o Instituto Natura | Lupa Social | Instituto Natura |
| Data | mar/2024 | 11/jun/2024 | ≥ nov/2025 | ≥ 2023 (sem data) |
| Papel do IIE | objeto: define o índice e o compara ao SAEB, IDEB e PISA | explicativo: antecedente de desfechos aos 18–29 anos | explicativo: pobreza aos 23 anos | objeto: versão municipal + correlações |
| Território | Brasil + 27 UFs | painel de 27 UFs | painel de 27 UFs | 4.775 municípios |
| Anos do IIE | 2003–2017 (IIE-MT adaptado); 2013–2019 (original) | 2007–2019 | 2007–2017 | 2017 |
| Método | descritivo + sensibilidade | painel EF/EA | painel EF de UF | MQO + clusters |

## 1. A Evolução do Desempenho Educacional dos Jovens Brasileiros ao Final da Educação Básica (2024)

É o **documento de referência metodológica** do IIE. Os outros estudos remetem a ele.

- **Pergunta.** A estagnação do SAEB e do IDEB no Ensino Médio (EM MT: +6 pontos de 2005 a 2019, contra +45,5 nos Anos Iniciais) indica retrocesso? Ou reflete **efeito de composição**, com mais jovens de trajetória irregular chegando ao 3º EM? No período, a taxa líquida de matrícula no EM foi de 45,3% para 71,4%, e os alunos da 3ª série com 19 anos ou mais passaram de 27% para 48%.
- **Tese.** Comparar a mesma série ao longo do tempo engana quando o fluxo muda. É preciso acompanhar **gerações**. O IIE faz isso.
- **Formalização (p. 20).**
  - Fórmula: $IIE = A_{12}+A_{22}+A_{32}$, com $A_{ij} = B_{ij}\times C_i$.
  - $B$: proficiência dentro de cada condição de atraso (SAEB).
  - $C$: distribuição da geração por atraso ao concluir (Censo + PNAD).
  - As linhas vão de "adiantados" a "atrasados 3+".
- **Proxy de gerações vizinhas.** Adiantados e atrasados usam o SAEB do ano t. Não houve correção para o fato de o SAEB ser aplicado antes da aprovação, nem para a ausência de cerca de 25% dos alunos escalados.
- **Tratamento de 2019.** Descrito na p. 22 e transcrito em [02_metodologia.md](02_metodologia.md#7-tratamento-especial-de-2019).
- **Variantes definidas.**

| Índice | Corte (LP e MT) | Série Brasil |
|---|---|---|
| Índice de Pré-Inclusão Educacional (IPIE) | 250 | 30,0 / 28,5 / 32,3 / 41,2 (2013/15/17/19) |
| **IIE** | **300** | **13,0 / 9,7 / 13,1 / 19,0** (Fig. 9); na Tab. 7: 12,8 / 9,6 / 13,6 / 19 |
| Índice de Sucesso Educacional (ISE) | 375 | 0,6 / 0,6 / 0,7 / 0,6 |
| IIE-MT adaptado (só MT, fluxo pela PNAD) | 300 | 15,1 (2003) → 18,4 (2017) |
| IIE Anos Iniciais / Anos Finais | 250 / 275 | Tabela 7 |

- **Sensibilidade.** Mudar a definição de geração (corte em março ou junho) desloca o nível em +1 a +2 pontos sem mudar a tendência. Mudar o corte de proficiência muda o nível e também a tendência: o avanço é maior no corte 250, ou seja, na parte de baixo da distribuição.
- **Conclusão.** Há melhora entre gerações sucessivas, concentrada na parte inferior da distribuição de desempenho, o que é compatível com redução de desigualdade. O SAEB e o IDEB não captam essa melhora.
- **PISA corrigido.** A parcela da geração de 15 anos fora do PISA caiu de 24,8% (2003) para 4,8% (2022). Corrigindo esse viés, o desempenho é pior que o divulgado, mas cresceu mais.
- **Tabela 7.** IIE por UF para AI, AF e EM, de 2013 a 2019. É a fonte oficial usada em [05_resultados_por_territorio.md](05_resultados_por_territorio.md); CSV em [anexos/iie_uf_oficial_2013_2019.csv](anexos/iie_uf_oficial_2013_2019.csv).
- **Inconsistências internas.**
  - O IIE do Brasil difere entre a Tabela 7 e as Figuras 9–11.
  - O texto diz que o IPIE subiu "20,1%", mas a variação é de cerca de 37%.
  - Algumas legendas trocadas.

## 2. Relação entre o IIE e alguns Indicadores Socioeconômicos selecionados (jun/2024)

- **Pergunta.** Variações do IIE de uma geração antecipam desfechos socioeconômicos da mesma geração entre 18 e 29 anos?
- **Desenho.**
  - Painel de 27 UFs × gerações de IIE 2007 a 2019, com até 189 observações.
  - Modelo $Y = S + G + \alpha\,IIE + \beta X + \varepsilon$, com efeitos de UF (S) e de geração (G), estimado por EF e por EA, com e sem controles.
  - O desfecho é sempre posterior ao IIE, o que afasta a causalidade reversa.
- **Desfechos analisados.**
  - Engajamento cívico (TSE).
  - Saúde (SINASC/SIM): pré-natal, peso ao nascer, gravidez de 15 a 17 anos, óbitos evitáveis.
  - Educação superior (PNAD): ingresso e conclusão.
  - Trabalho (PNAD): nem-nem, ocupação, renda relativa, qualidade da ocupação.
  - Segurança (SIM/SINAN): homicídios, violência contra a mulher, sexismo, homofobia, racismo.
- **Resultados robustos.** O IIE mais alto se associa a:
  - mais pré-natal e mais ingresso e conclusão do ensino superior;
  - menos gravidez de 15 a 17 anos (com o IIE do EF-II), menos óbitos evitáveis e menos nem-nem aos 21;
  - mais ocupação e mais qualidade da ocupação aos 27;
  - menos homicídios aos 18–21 e menos violência contra a mulher.
- **Resultados não robustos ou contraintuitivos.** Participação eleitoral, peso ao nascer, homofobia, racismo e renda antes dos 25 anos.
- **Simulação de +10 pontos no IIE (geração do IIE 2019, Brasil).**
  - Ensino superior: +127 mil ingressantes até os 21 anos e +122 mil concluintes até os 25.
  - Trabalho: −88 mil nem-nem aos 21 e +154 mil ocupados aos 27.
  - Saúde: −43 mil gestações de 15 a 17 anos e 4 mil óbitos evitáveis a menos.
  - Segurança: 473 homicídios a menos entre 18 e 21 anos.
- **IIE × IDEB × SAEB como preditores.** Nenhum domina; os desempenhos são "bastante similares".
- **Dado técnico relevante.** O relatório afirma que o **IIE 2021 é inviável** com dados públicos, porque o SAEB passou a ter máscaras e o Censo passou a ser divulgado por escola a partir de 2021 (nota 4).
- **Definição adicional.** IIE do EF-II: conclusão até os 15 anos com proficiência de pelo menos 275 em LP e MT.

## 3. Inclusão Educacional e Pobreza na Transição para a Vida Adulta (Lupa Social, ≥ nov/2025)

- **Pergunta.** Coortes com maior IIE têm menos pobreza (renda domiciliar per capita até ½ salário mínimo) e menos extrema pobreza (até ¼ SM) aos 23 anos? As linhas de pobreza seguem os critérios do CadÚnico.
- **Desenho.**
  - 27 UFs × 6 coortes (nascidas de 1990 a 2000; IIE de 2007 a 2017; PNADc de 2013 a 2023), N = 162.
  - Efeitos fixos de UF, escolhidos pelo teste de Hausman, com erros-padrão clusterizados por UF.
  - Covariáveis medidas no ano do IIE: população, % mulheres, % negra, urbanização, % com ensino superior, moradores por domicílio e informalidade (esta imputada antes de 2013).
- **Descritivas.** IIE médio de 9,1 (entre 1,3 e 19,2). As medianas por UF vão de cerca de 18 (DF) a cerca de 4 (MA).
- **Resultados.**
  - Correlação do IIE com a pobreza aos 23 anos: r = −0,68. Com a extrema pobreza: r = −0,62.
  - No modelo completo, **+1 ponto de IIE → −0,83 p.p. de pobreza e −0,44 p.p. de extrema pobreza.**
  - Com +10 pontos de IIE, seriam cerca de 255 mil jovens a menos em pobreza e 135 mil a menos em extrema pobreza, sobre 3,07 milhões de jovens de 23 anos em 2023.
  - O efeito só aparece com os controles. Sem eles, o coeficiente de efeitos fixos é nulo.
- **Mensagem.** A educação é "condição necessária, mas não suficiente". Romper a extrema pobreza depende também do mercado de trabalho e de redes de proteção.
- **Informação institucional.** "O IIE Capitais encontra-se em estágio avançado de validação". A expansão para capitais e municípios é feita pela Lupa Social em parceria com o Instituto Natura.
- **Inconsistências internas.** Os períodos citados divergem entre si (2007–2017, 2013–2023, 2007–2023), e há numeração de figuras repetida.

## 4. Índice de Inclusão Educacional Municipal e suas relações com indicadores socioeconômicos (Instituto Natura)

- **Objetivo.** Levar o IIE ao nível municipal. O IIEM combina a amplitude do IIE (atrasados, baixo desempenho, evadidos) com a granularidade do IJDS, índice municipal que conta só jovens com bom desempenho no ENEM.
- **Método (coorte 2000, IIEM 2017).**
  - Fluxo: Censo 2016, 2017 e 2018 (adiantados, em linha, atrasados 1 e atrasados 2+).
  - Proficiência: SAEB 2017, com proxies de coortes vizinhas. Cortes: **Básico ≥ 300 e Adequado ≥ 375, em LP e MT**.
  - Evasão: a PNADc não é representativa por município. No lugar dela, usa-se a razão entre as matrículas da coorte no Censo 2017 e as do Censo 2008, com teto de 100%. Os que estão fora da escola entram como "atrasados 2+ abaixo do básico".
  - Exclusão: municípios com menos de 10 matrículas da coorte em 2008.
- **Limitações declaradas.**
  - A migração não é corrigida: superestima municípios receptores e subestima emissores.
  - O SAEB privado é amostral e representativo só por UF, o que tende a subestimar o índice.
  - Há apenas um ano.
- **Resultados.**
  - 4.775 municípios com índice; 1.456 abaixo de 2,5; só 2 acima de 50; 797 sem cálculo, a maioria em SP.
  - Valores baixos concentrados no Norte e em parte do Nordeste.
  - Distribuição completa em [05_resultados_por_territorio.md](05_resultados_por_territorio.md#6-municípios-iiem-2017).
- **Associações (+10 pontos de IIEM).**
  - Mais ingresso no ensino superior, mais participação no ENEM e mais emprego formal.
  - Menos homicídios masculinos (de 50,9 para 43,9 por 100 mil), menos gravidez antes dos 18 anos e menos óbitos fetais.
  - Renda e saúde mental: resultados contraintuitivos ou não significativos.
  - Os efeitos variam entre 5 clusters de municípios.

## O que os estudos acrescentam ao repositório

1. **O método oficial de 2019**, cuja função está ausente do repo.
2. **A série oficial por UF (2013–2019)** e as variantes para o Ensino Fundamental.
3. **Os cortes da família IIE:** Pré-Inclusão (250), IIE (300) e Sucesso Educacional/Adequado (375).
4. **Validade preditiva:** o IIE antecipa pobreza, ensino superior, trabalho, saúde e violência na vida adulta da geração.
5. **O caminho municipal:** o IIEM, com outro ajuste de evasão e limitações específicas.
6. **Linha do tempo institucional:** Metas Sociais + Instituto Natura (criação do índice e série 2007–2019) → Lupa Social + Instituto Natura (este repositório, capitais, municípios, painel Looker).
