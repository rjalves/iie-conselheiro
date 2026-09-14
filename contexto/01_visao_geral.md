# 01 — Visão geral do IIE

## O que é

O **Índice de Inclusão Educacional (IIE)** é a **proporção dos nascidos em um ano que concluiu o Ensino Médio com até 18 anos e com proficiência mínima (nível Básico, 300 pontos no SAEB) em Língua Portuguesa e em Matemática**. Varia de 0 a 100.

Ele responde, para um país, estado ou município:

> *De cada 100 jovens desta geração, quantos terminaram a educação básica no tempo certo e aprendendo o essencial?*

## O que mede

O índice combina, num único número, quatro dimensões da trajetória escolar de uma geração:

| Dimensão | Como entra no IIE | Fonte |
|---|---|---|
| **Acesso e permanência** | quem evadiu continua no denominador | PNAD Contínua |
| **Fluxo** (regularidade idade-série) | só conta quem concluiu até os 18 anos: adiantados, em linha e 1 ano de atraso | Censo Escolar (Sala Segura INEP) |
| **Conclusão** | é preciso ter sido aprovado na série final do EM | Censo Escolar |
| **Aprendizagem** | é preciso ter ≥ 300 no SAEB em LP **e** em MT | SAEB, 3ª série do EM |

## Por que existe

- **Indicadores tradicionais olham para uma série escolar, não para uma geração.** SAEB, IDEB e taxas de aprovação acompanham a mesma série ao longo do tempo. Quando o fluxo muda (menos evasão, mais jovens atrasados chegando ao 3º EM), a média cai por **efeito de composição**, mesmo que a geração esteja mais bem educada.
- **O IIE acompanha gerações.** Ele capta essa melhora. O estudo de referência mostra que o SAEB do EM ficou praticamente estagnado entre 2005 e 2017, enquanto a inclusão da geração cresceu, sobretudo na parte de baixo da distribuição.
- **Três vantagens declaradas:**
  1. incorpora a evasão;
  2. é fácil de ler, porque é um percentual de pessoas;
  3. dá uma visão integrada do ciclo da educação básica.

## Como é avaliado (em uma linha)

$$IIE = 100 \times \frac{\text{concluintes até 18 anos com básico em LP e MT}}{\text{coorte total (inclui atrasados 2+ e evadidos)}}$$

- **Numerador:** contagens de concluintes do Censo multiplicadas pela probabilidade de ter o básico, estimada no SAEB para cada trajetória.
- **Denominador:** coorte observada no Censo, expandida pela parcela de jovens de 17 anos fora da escola sem EM, estimada pela PNADc.
- Detalhes em [02_metodologia.md](02_metodologia.md).

## O que mostra sobre cada território

- Nível e posição relativa. Brasil 2019: **19,0**; de SP (27,0) a AP (6,5).
- Evolução entre gerações (série bienal).
- **Onde a geração se perde:**
  - fluxo: atraso e evasão;
  - aprendizagem entre os que concluem.
- A mesma medida com outros cortes: Pré-Inclusão (250) e Sucesso Educacional/Adequado (375).
- Versões para os Anos Iniciais e Finais do EF.
- No painel Looker: recortes por sexo, raça/cor e disciplina, e capitais.
- No nível municipal: IIEM 2017, com 4.775 municípios.

Ver [05_resultados_por_territorio.md](05_resultados_por_territorio.md).

## O que o IIE antecipa

A literatura produzida com o índice (ver [06_estudos.md](06_estudos.md)) mostra que gerações com IIE mais alto têm, depois:

- **menos pobreza aos 23 anos**: +1 ponto de IIE → −0,83 p.p. de pobreza;
- mais ingresso e conclusão do ensino superior;
- mais ocupação de qualidade;
- menos nem-nem, gravidez na adolescência, óbitos evitáveis e homicídios.

## Quem está por trás

| Ator | Papel |
|---|---|
| **Metas Sociais** (Reynaldo Fernandes, FEA-RP/USP, ex-presidente do INEP; Fabiana de Felicio) | criou o IIE a pedido do Instituto Natura; produziu a série 2007–2019 e os estudos de 2024 |
| **Instituto Natura** (David Saad; equipe do IIEM) | patrocinador; desenvolveu o IIE Municipal |
| **Lupa Social** | mantém este repositório (IIE Geral 2015–2021), o painel Looker e a expansão para capitais e municípios; contato: contato@lupasocial.com.br |

## Linha do tempo

| Quando | Marco |
|---|---|
| 2007–2019 | série oficial bienal por UF (Metas Sociais / Instituto Natura) |
| mar/2024 | estudo *A Evolução do Desempenho Educacional…* formaliza o método e o tratamento do SAEB 2019 |
| jun/2024 | relatório sobre indicadores socioeconômicos; declara o IIE 2021 inviável com dados públicos |
| ≥ 2023 | IIE Municipal (IIEM 2017) |
| ≥ nov/2025 | estudo *IIE e Pobreza* (Lupa Social); IIE Capitais em validação |
| atual | este repositório: pipeline R (Censo via Sala Segura + SAEB + PNADc), 2015–2021 por UF; 2023 aguarda o Censo 2024 |

## Onde ver os resultados

- Painel Looker Studio: https://lookerstudio.google.com/s/lAHnTj0l5K4 (Brasil, UF e capitais; sexo e raça/cor; LP e MT; família IIE: IIE Legado, Pré-Inclusão, Sucesso Educacional).
- Tabelas por UF nesta pasta: [anexos/](anexos/).
