# Contexto do projeto IIE — Índice de Inclusão Educacional

Esta pasta guarda o conhecimento consolidado sobre o IIE: o que mede, como é calculado, o que mostra sobre cada território, como o código funciona e o que falta resolver. Serve para onboarding de pessoas e como contexto para agentes de IA.

> Levantamento de **2026-09-10** sobre o commit `60e7bfb`.
> Base:
> - leitura integral dos quatro notebooks `.Rmd`, do `README.md`, das figuras e dos quatro estudos em `estudos/`;
> - inspeção das três bases `.rds`;
> - reprodução independente do cálculo em Python;
> - indexação com GitNexus. O GitNexus não interpreta R, então o grafo contém só arquivos e seções do README.

## Documentos

| # | Documento | Conteúdo |
|---|---|---|
| 01 | [Visão geral](01_visao_geral.md) | o que é o IIE, por que existe, quem o produz, linha do tempo |
| 02 | [Metodologia](02_metodologia.md) | definição formal, fontes, trajetórias, ajuste de evasão, fórmula, exemplo numérico, tratamento de 2019, premissas |
| 03 | [Arquitetura técnica](03_arquitetura_tecnica.md) | pipeline R Markdown, scripts, funções, caminhos, como reproduzir |
| 04 | [Dicionário de dados](04_dicionario_de_dados.md) | variáveis dos microdados, esquema das `.rds`, saída, códigos de UF |
| 05 | [Resultados por território](05_resultados_por_territorio.md) | série oficial por UF, decomposição fluxo × aprendizagem, EF, municípios, cuidados |
| 06 | [Estudos](06_estudos.md) | resumo dos quatro PDFs e o que acrescentam |
| 07 | [Lacunas, riscos e próximos passos](07_lacunas_riscos_e_proximos_passos.md) | bloqueios de reprodução, bugs, riscos de dados, prioridades |
| 08 | [Glossário](08_glossario.md) | termos e siglas |
| 09 | [Indicadores do IIE e práticas de gestão](09_indicadores_iie_e_praticas_de_gestao.md) | árvore de indicadores, semáforo e prioridade por UF, e o que fazer quando cada indicador está baixo (escola, secretaria, estratégico), a partir dos três referenciais de `boas-praticas/` |
| — | [../projeto/](../projeto/) | proposta de arquitetura e plano de desenvolvimento do agente IIE Conselheiro (WhatsApp) |
| — | [anexos/](anexos/) | script de reprodução, CSV reproduzido por UF, CSV oficial 2013–2019, matriz indicador × prática (`matriz_indicador_pratica.csv`) |

## Fatos essenciais

- **Definição:** % dos nascidos em um ano que concluíram o EM **até os 18 anos** com **LP ≥ 300 e MT ≥ 300** no SAEB. Vai de 0 a 100.
- **Fontes:**
  - Censo Escolar (Situação do Aluno), com microdados identificados via **Sala Segura INEP**;
  - SAEB, 3ª série do EM;
  - PNAD Contínua, 2º trimestre, jovens de 17 anos.
- **Fórmula implementada:** `IIE = (A·p_adiantado + L·p_emlinha + T·p_atrasado) / (C / (1 − perc_fora))`, onde:
  - A, L e T são os concluintes em t−1, t e t+1;
  - C é a coorte observada no Censo;
  - `perc_fora` é a parcela da coorte fora da escola sem EM (PNADc).
- **Coorte ↔ ano:** o ano do IIE é o ano de nascimento + 17. As coortes 1998, 2000, 2002 e 2004 correspondem a 2015, 2017, 2019 e 2021.
- **2019:** o SAEB 2019 não tem idade. A proficiência por trajetória é imputada com a estrutura de 2017. A função que faz isso (`calc_iie_2019_geral`) **não está no repositório**; o método publicado está em [02](02_metodologia.md#7-tratamento-especial-de-2019).
- **Brasil (oficial):** 12,8 (2013) · 9,6 (2015) · 13,6 (2017) · **19,0 (2019)**.
- **UFs em 2019:** do maior ao menor, SP 27,0 · DF 26,0 · GO 25,8 · … · BA 7,9 · AM 7,7 · AP 6,5.
- **Onde a coorte se perde (Brasil 2019):**
  - 62,6% concluem até os 18 anos;
  - só 29,8% desses concluintes têm o básico;
  - 31% seguem atrasados 2+;
  - 6,4% estão fora da escola sem EM.
- **Família IIE:** Pré-Inclusão (corte 250) · IIE (300) · Sucesso Educacional/Adequado (375). Existem versões para os Anos Iniciais (250) e Finais (275) do EF e o **IIEM** municipal (2017, 4.775 municípios).
- **Estado do código:** o script 04 **não roda de ponta a ponta**:
  - falta a função de 2019;
  - falta a coorte 2004 do Censo;
  - falta a pasta `Resultados/`.

  Mesmo assim, as `.rds` reproduzem a série oficial com erro médio de 0,1 ponto em 2015 e 2017. Detalhes em [07](07_lacunas_riscos_e_proximos_passos.md).
- **Do indicador à ação:** o IIE se decompõe exatamente em `IIE = (100 − F2 − P1) × A1 / 100` (retenção 2+, evasão, aprendizagem dos concluintes). Em 10 das 12 UFs de menor IIE, o maior ganho está em aprendizagem. O que fazer em cada caso, com base nos referenciais do MEC, do Itaú Social e do TPE, está em [09](09_indicadores_iie_e_praticas_de_gestao.md).
- **Resultados interativos:** [Painel Looker Studio](https://lookerstudio.google.com/s/lAHnTj0l5K4) · Contato: contato@lupasocial.com.br

## Como manter esta pasta

- Quando o código mudar, atualize [03](03_arquitetura_tecnica.md), [04](04_dicionario_de_dados.md) e [07](07_lacunas_riscos_e_proximos_passos.md).
- Quando novas bases forem versionadas (2021, 2023), rode `python contexto/anexos/reproducao_iie.py` e atualize [05](05_resultados_por_territorio.md).
- Novos estudos em `estudos/` devem ganhar uma seção em [06](06_estudos.md).
