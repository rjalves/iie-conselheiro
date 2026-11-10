# 02 — Metodologia do IIE: o que é medido e como

## 1. Definição

> **IIE = percentual dos nascidos em um ano (coorte) que concluíram o Ensino Médio com até 18 anos (no máximo 1 ano de atraso) e com proficiência SAEB de nível Básico ou superior em Língua Portuguesa *e* Matemática.**

Definição formal (figura `imgs/calculo.png`):

$$
IIE_{ij} \;=\; \frac{\sum_{a=0}^{18} X^{\text{básico}}_{ija}}{X_{ij}} \in [0,1]
$$

- $X_{ij}$: número de indivíduos da coorte nascida no ano $j$ na localidade $i$.
- $X^{\text{básico}}_{ija}$: indivíduos dessa coorte que concluíram o EM com a idade $a$ e desempenho SAEB ≥ 300 pontos em Matemática **e** Língua Portuguesa.
- No código e nos estudos, o valor é multiplicado por 100 e lido como percentual (0–100).

**Interpretação oficial:** "Percentual da coorte que finalizou o Ensino Médio com até um ano de atraso e com proficiência nível básico."

Alinhamento temporal: o **ano de referência** do IIE é o ano de nascimento + 17, isto é, o ano em que a coorte deveria concluir o EM "em linha".

| Coorte (nascidos em) | Ano do IIE (t) | Censo lido (t−1, t, t+1) | SAEB | PNADc (2º tri) |
|---|---|---|---|---|
| 1998 | 2015 | 2014, 2015, 2016 | 2015 | 2015 |
| 2000 | 2017 | 2016, 2017, 2018 | 2017 | 2017 |
| 2002 | 2019 | 2018, 2019, 2020 | 2019 (sem idade) | 2019 |
| 2004 | 2021 | 2020, 2021, 2022 | 2021 | 2021 |
| 2006 | 2023 | 2022, 2023, **2024** | 2023 | 2023 |

A série é **bienal** porque o SAEB do 3º EM é bienal.

**Série publicada (painel do IIE, Lupa Social):** 2015, 2017, 2019, 2021 e 2023, por UF e Brasil. O painel avisa que o **IIE 2023 é preliminar**: pode mudar um pouco quando sair o Censo Escolar — Situação do Aluno de 2024. Brasil: 9,5 (2015), 13,5 (2017), 18,9 (2019), 17,0 (2021) e 15,5 (2023). Os números estão em [anexos/iie_uf_painel_2015_2023.csv](anexos/iie_uf_painel_2015_2023.csv).

A série oficial da Metas Sociais/Instituto Natura vai de **2007 a 2019** (coortes 1990 a 2002); no ensino médio, o painel a continua até 2023, com diferença de até 0,3 ponto em relação à Tabela 7 de Fernandes, Felicio e Saad (2024) nos anos em comum. As `.rds` deste repositório só permitem reproduzir **2015–2019**: falta a coorte do Censo de 2021 e de 2023. O relatório de junho de 2024 afirma que o IIE 2021 era inviável com dados públicos: a partir de 2021, o SAEB passou a ser divulgado com "máscaras" e o Censo Escolar agregado por escola. O pipeline deste repositório contorna isso com os microdados identificados da Sala Segura. Ver [06_estudos.md](06_estudos.md).

## 2. Por que o IIE é diferente dos indicadores tradicionais

Segundo o README, o índice inova em três pontos:

1. **Incorpora a evasão.** Quem saiu da escola continua no denominador. Taxas de aprovação e o SAEB ignoram quem não chegou ao 3º EM.
2. **É fácil de ler.** Trata-se de uma proporção de pessoas, ao contrário das escalas pouco intuitivas do IDEB e do SAEB.
3. **Olha o ciclo inteiro da educação básica.** Acesso, permanência, fluxo e aprendizagem cabem num único número.

O índice é deliberadamente **exigente**. Um jovem só "conta" se cumprir quatro condições ao mesmo tempo:

- concluiu o EM;
- concluiu no tempo, com até 1 ano de atraso;
- atingiu o básico em LP;
- atingiu o básico em MT.

## 3. As três fontes e o que cada uma responde

![Fluxo das bases](../imgs/fluxo_bases.png)

| Fonte | Pergunta respondida | Unidade | Acesso |
|---|---|---|---|
| **Censo Escolar – Situação do Aluno** (INEP) | Com que idade a coorte concluiu o EM? | matrícula | **restrito** — microdados identificados, só via Sala Segura (SEDAP/INEP), sob LGPD |
| **SAEB 3ª série do EM** (INEP) | Qual a chance de um concluinte de cada trajetória ter nível básico em LP e MT? | aluno avaliado, com peso amostral | público |
| **PNAD Contínua, 2º trimestre** (IBGE) | Que fração da coorte, aos 17 anos, está fora da escola sem ter concluído o EM? | pessoa, com peso amostral `V1028` | público |

## 4. Censo Escolar: trajetórias de conclusão

Com os arquivos de Situação do Aluno de três anos consecutivos, restritos às matrículas de uma coorte de nascimento, a coorte é dividida em quatro grupos por UF:

| Grupo | Critério | Idade ao concluir |
|---|---|---|
| Adiantados | aprovados no 3º/4º ano do EM em **t−1** | ≤ 16 |
| Em linha | aprovados no 3º/4º ano do EM em **t** | 17 |
| Atrasados | aprovados no 3º/4º ano do EM em **t+1** | 18 |
| Atrasados 2+ | ainda matriculados em **t+1** sem ter sido aprovados no ano terminal | ≥ 19 (se concluírem) |

Detalhes operacionais:
- Contam como "ano terminal" as etapas 27, 28, 32, 33, 37 e 38: 3ª e 4ª séries do EM regular, do técnico integrado e do normal/magistério.
- Ficam de fora a EJA, o EM não seriado e os técnicos concomitante e subsequente.
- "Concluir" é operacionalizado como `tp_situacao = 5` (aprovado).

## 5. PNADc: quem está fora da escola sem EM

**Recorte:** pessoas nascidas no ano da coorte (`V20082 = t − 17`), no 2º trimestre do ano t.

**Classificação:** a PNADc mudou a codificação de escolaridade entre 2015 e 2016. As variáveis com sufixo `A` (`V3003A`, `V3009A`) são as novas.

| Situação | Questionário novo (2017, 2019, 2021) | Questionário antigo (2015) | Classe |
|---|---|---|---|
| Frequenta escola (`V3002 = 1`) e cursa superior ou mais | `V3003A ≥ 8` | `V3003 ≥ 7` | `Fora_com_EM`* |
| Não frequenta (`V3002 = 2`) e já cursou superior | `V3009A ≥ 12` | `V3009 ≥ 10` | `Fora_com_EM` |
| Não frequenta, cursou EM e concluiu a 3ª série (`V3013 ≥ 3`) | `V3009A ∈ 9–11` | `V3009 ∈ 7–9` | `Fora_com_EM` |
| Não frequenta, cursou EM e parou antes da 3ª série (`V3013 ≤ 2`) | `V3009A ∈ 9–11` | `V3009 ∈ 7–9` | **`Fora_sem_EM`** |
| Não frequenta e só cursou até o fundamental | `V3009A ≤ 8` | `V3009 ≤ 6` | **`Fora_sem_EM`** |
| Qualquer outro caso, sobretudo quem frequenta a educação básica | — | — | `outros` |

\* O rótulo engana: a classe `Fora_com_EM` também inclui quem está **na escola**, cursando o superior. Na prática, significa "já tem EM".

Saídas por UF:
- `coorte_PNAD`: soma das três classes, ponderada por `V1028`.
- `coorte_fora_sem_EM_PNAD`.
- **`perc_fora` = `coorte_fora_sem_EM_PNAD / coorte_PNAD`.**

## 6. Fórmula implementada

Seja, para uma UF e um ano:
- $A, L, T, T_2$: contagens do Censo (adiantados, em linha, atrasados, atrasados 2+);
- $C = A + L + T + T_2$: coorte observada no Censo;
- $f$: `perc_fora` da PNADc;
- $p_g$: probabilidade de nível básico no SAEB para o grupo $g$, calculada como `basico / (basico + abaixo)` com peso amostral.

O script `04_calculo_iie.Rmd` calcula:

$$
\begin{aligned}
C^{aj} &= \frac{C}{1-f} &&\text{(coorte total ajustada)}\\[2pt]
F &= \max(C^{aj} - C,\; 0) &&\text{(jovens fora da escola, sem EM)}\\[2pt]
\text{num} &= A\,p_{adiantado} + L\,p_{emlinha} + T\,p_{atrasado} &&\text{(concluintes até 18 anos com básico)}\\[2pt]
\text{den} &= A + L + T + (T_2 + F) = C^{aj} &&\text{(coorte inteira)}\\[2pt]
IIE &= 100 \times \text{num}/\text{den}
\end{aligned}
$$

Leitura da fórmula:
- **Numerador:** só os três primeiros grupos, isto é, conclusão até 18 anos.
- **Denominador:** a coorte inteira, somando os atrasados 2+ e os que evadiram.
- A PNADc entra apenas como **fator de expansão proporcional** do total do Censo. O tamanho absoluto da coorte na PNADc (`coorte_PNAD`) não é usado no cálculo.

### Tabela de distribuição da coorte

![Distribuição da coorte](../imgs/tabela.png)

O IIE é a soma das células no quadro azul da figura: concluiu até 18 anos × proficiência Básico ou Adequado.

O código trabalha com duas categorias de proficiência: `abaixo` e `basico`, onde `basico` = Básico + Adequado. A categoria **Adequado** aparece nas figuras, mas não tem corte definido no repositório. As linhas "atrasados 2+" e "não completou o EM" ficam sempre fora do numerador.

### Exemplo numérico — Brasil, IIE 2017 (coorte 2000)

Valores reproduzidos a partir das bases `.rds` do repositório.

| Componente | Valor | % da coorte ajustada |
|---|---:|---:|
| Adiantados (A) | 67.860 | 2,5% |
| Em linha (L) | 904.195 | 32,9% |
| Atrasados (T) | 702.914 | 25,6% |
| Atrasados 2+ (T₂) | 845.887 | 30,8% |
| Coorte observada no Censo (C) | 2.520.856 | — |
| `perc_fora` PNADc (f) | 8,33% | — |
| Fora da escola sem EM (F) | 229.194 | 8,3% |
| **Coorte ajustada (den)** | **2.750.050** | 100% |
| p(básico) adiantados / em linha / atrasados | 30,0% / 26,4% / 15,8% | — |
| **Concluintes até 18 com básico (num)** | **370.055** | — |
| **IIE 2017 – Brasil** | **13,5** | — |

Na mesma coorte:
- **60,9%** concluíram o EM até os 18 anos;
- entre esses concluintes, só **22,1%** tinham o básico em LP e MT.

Pela mesma conta, o **IIE 2015 – Brasil** é **9,5**: 58,3% concluíram até 18 e 16,2% desses tinham o básico.

## 7. Tratamento especial de 2019

Os microdados públicos do SAEB 2019 **não trazem a idade do aluno**. Por isso:
- o script 02 grava para 2019 apenas o total da UF (`grupo = "total"`), sem separar por trajetória;
- o script 04 indica que o IIE 2019 aplica **"as proporções de desempenho por grupo de 2017 sobre o total observado em 2019"**, por meio de uma "função complexa de redistribuição de pesos" chamada `calc_iie_2019_geral()`;
- **essa função não está no repositório.**

O procedimento está descrito no estudo *A Evolução do Desempenho Educacional…* (Fernandes, Felicio e Saad, 2024, p. 22):

> "o procedimento adotado foi, em primeiro lugar, distribuir o total de cada coluna da Tabela 5, em 2019, de acordo com a distribuição obtida para 2017 (mantendo o total da coluna de 2019 que é observado). Em segundo lugar, cada linha da tabela deve somar 1, mas mantendo as proporções obtidas pela primeira transformação."

Em notação, com $j \in \{\text{abaixo}, \text{básico}\}$ e $g$ a trajetória:

$$
\tilde n_{gj} = N^{2019}_{j}\cdot\frac{n^{2017}_{gj}}{\sum_{g'} n^{2017}_{g'j}},\qquad
p^{2019}_{g} = \frac{\tilde n_{g,\text{básico}}}{\tilde n_{g,\text{básico}}+\tilde n_{g,\text{abaixo}}}
$$

O fluxo (Censo + PNADc) de 2019 não precisa de tratamento especial, pois não depende da idade no SAEB.

**Reprodução.** O procedimento foi reimplementado em [anexos/reproducao_iie.py](anexos/reproducao_iie.py) como `2019_B_procedimento_publicado`. Aplicado às `.rds` do repositório, dá **Brasil 2019 = 18,6** (oficial: 19,0), com erro médio de 0,3 ponto nas UFs. Uma alternativa testada, a razão relativa $p_{g,2019} = p_{total,2019}\cdot p_{g,2017}/p_{total,2017}$, dá 19,0 no Brasil, mas erra mais por UF (0,4).

**Valor adotado.** O painel do IIE publica 2019 com o procedimento da equipe (Brasil 18,9). Ele difere da reprodução B em até 1,5 ponto (GO), sempre na parte da aprendizagem: o fluxo (Censo e PNADc) coincide. A base do Conselheiro usa o valor publicado e deriva dele a aprendizagem entre os concluintes (A1); como o SAEB 2019 não traz a idade, o básico por trajetória (A2) de 2019 fica sem valor.

## 7a. 2021 e 2023: o que o painel publica

O painel publica, por UF e ano, o IIE e três componentes: alunos com 2 anos ou mais de atraso (entre os que estão na escola, Censo), alunos abaixo do básico (SAEB) e jovens fora da escola sem o EM (PNADc). Com a identidade $IIE = (100 - F2 - P1) \times A1 / 100$:

- **P1** é o fora da escola publicado;
- **F2** é o atraso publicado convertido para a geração toda: $F2 = \text{atraso} \times (100 - P1) / 100$;
- **F1** $= 100 - F2 - P1$ e **A1** $= 100 \times IIE / F1$.

Em 2015 e 2017, essas contas reproduzem a decomposição feita a partir das `.rds` (diferença ≤ 0,02 ponto). Em 2021 e 2023 não há a coorte do Censo, então a trajetória da geração (adiantados, em linha, 1 ano de atraso) não é conhecida. O básico por trajetória, e com ele o **A2**, vem do SAEB 2021 e 2023 por trajetória (regra regular), como reprodução. Em todas as UFs, o A1 derivado do painel fica dentro da faixa do básico por trajetória do SAEB.

**Validação geral.** Para 2015 e 2017, a fórmula do script 04 aplicada às `.rds` reproduz a série oficial por UF com **erro médio de 0,1 ponto** (máximo 0,31; correlação 0,9998). Detalhes em [05_resultados_por_territorio.md](05_resultados_por_territorio.md).

## 8. Premissas e limitações metodológicas

1. **Proficiência "emprestada" de coortes vizinhas.** O SAEB de t avalia quem está no 3º EM em t:
   - os alunos de 17 anos são majoritariamente da coorte;
   - os de 16 são da coorte seguinte;
   - os de 18, da anterior.

   Por isso, o `p_adiantado` usado para a coorte vem de alunos de outra geração. A premissa é que o desempenho por trajetória se mantém estável entre coortes adjacentes.
2. **Desempenho de quem estava no 3º EM aplicado a quem foi aprovado nele.** O $p_g$ vem dos alunos avaliados, aprovados ou não, e é aplicado às contagens de aprovados do Censo.
3. **Peso único.** A classificação conjunta LP + MT usa apenas `peso_aluno_lp`.
4. **Ajuste proporcional da evasão.** A premissa é que a parcela da coorte ausente do Censo equivale a `perc_fora` da PNADc aos 17 anos. Quem estava fora da escola aos 17 e voltou a se matricular em t+1 pode ser contado duas vezes: em T₂ e em F.
5. **Amostra pequena da PNADc por UF.** Uma única coorte de 17 anos por UF gera estimativas voláteis nas UFs pequenas. Por exemplo, `perc_fora` do TO oscila entre 8,5% (2015), 3,1% (2017) e 7,1% (2019).
6. **Cursos de 4 anos.** As etapas terminais incluem a 3ª e a 4ª séries. Um aluno de curso integrado de 4 anos, aprovado na 3ª série num ano e na 4ª no seguinte, pode aparecer em dois grupos. O código não deduplica por aluno entre anos. Vale confirmar se a extração da Sala Segura já trata isso.
7. **Coorte por ano de nascimento × data de corte escolar.** A idade de entrada no 1º ano depende da data de corte de cada rede. Mudanças nessa regra deslocam alunos entre "em linha" e "atrasado" sem refletir o desempenho real. Isso pode explicar a quebra observada em SC a partir de 2017; ver [05_resultados_por_territorio.md](05_resultados_por_territorio.md).
8. **Choques administrativos no Censo.** Alterações no registro de rendimento, como as de 2020 na pandemia, afetam diretamente a contagem de "aprovados". O caso da BA na coorte de 2019 é detalhado no documento 05.
