# 08 — Glossário

| Termo | Definição |
|---|---|
| **IIE** | Índice de Inclusão Educacional: % de uma coorte de nascimento que concluiu o EM até os 18 anos com LP ≥ 300 **e** MT ≥ 300 no SAEB (0–100) |
| **IIE Geral** | nome usado neste repositório para o IIE total, sem recortes (saída `IIE_Geral`) |
| **Painel do IIE** | painel da Lupa Social no Looker Studio (Data Studio) com o IIE por UF e Brasil de 2015 a 2023 e três componentes: atraso de 2+ anos (Censo), abaixo do básico (SAEB) e fora da escola (PNADc). Também traz capitais, equidade, disciplina e as variantes IPIE, ISE e idade correta. O IIE 2023 é preliminar |
| **IIE Legado** | citado só no painel Looker; não há definição nos materiais do repositório (hipótese: série original da Metas Sociais) |
| **IPIE / Pré-Inclusão** | Índice de Pré-Inclusão Educacional: mesma construção, com corte 250 |
| **ISE / Sucesso Educacional** | Índice de Sucesso Educacional: corte 375, equivalente ao nível "Adequado" do IIEM |
| **IIE-MT (adaptado)** | só Matemática, com fluxo pela PNAD; série 2003–2017 |
| **IIE Anos Iniciais / Anos Finais (IIE_EF2)** | conclusão da etapa com até 1 ano de atraso; cortes 250 (AI) e 275 (AF), em LP e MT |
| **IIEM** | IIE Municipal (Instituto Natura), coorte 2000 / 2017; evasão estimada por razão de matrículas |
| **IJDS** | Índice de Jovens com Desempenho Suficiente (Salomão e Menezes-Filho, 2023): alunos do último ano do EM com ENEM ≥ 600 em Linguagens e em Matemática (e redação ≠ 0), divididos pelos ingressantes da mesma geração no EF; é municipal, mas não conta atrasados nem evadidos |
| **Coorte / geração** | nascidos entre 1º de janeiro e 31 de dezembro de um ano |
| **Ano de referência (t)** | ano de nascimento + 17, isto é, o ano da conclusão "em linha" |
| **Adiantado** | concluiu o EM em t−1 (≤ 16 anos) |
| **Em linha** | concluiu o EM em t (17 anos) |
| **Atrasado (1 ano)** | concluiu o EM em t+1 (18 anos) |
| **Atrasado 2+** | ainda matriculado em t+1 sem concluir o EM |
| **Fora da escola sem EM** | jovem de 17 anos (PNADc) que não frequenta a escola e não concluiu o EM |
| **Coorte ajustada** | total do Censo ÷ (1 − % fora da escola); é o denominador do IIE |
| **Abaixo do básico** | LP < 300 **ou** MT < 300 |
| **Básico (ou mais)** | LP ≥ 300 **e** MT ≥ 300 |
| **Adequado** | LP ≥ 375 **e** MT ≥ 375 (definição do IIEM) |
| **p(básico)** | proporção ponderada de alunos do 3º EM com básico, por trajetória |
| **Efeito de composição** | mudança na média de uma série escolar causada pela mudança de quem chega a ela (fluxo), não pela aprendizagem |
| **Sala Segura (SEDAP/INEP)** | ambiente controlado do INEP para acesso a microdados identificados |
| **Situação do Aluno** | módulo do Censo Escolar com o rendimento ao fim do ano (aprovado, reprovado, abandono…) |
| **`tp_etapa_ensino`** | etapa da matrícula no Censo; terminais do EM: 27, 28, 32, 33, 37 e 38 |
| **`tp_situacao = 5`** | aprovado |
| **PNADc 2º trimestre** | trimestre usado para medir a coorte de 17 anos |
| **`V1028`** | peso amostral calibrado da PNADc |
| **`peso_aluno_lp`** | peso amostral do SAEB usado na expansão |
| **UF 0** | agregado Brasil (soma das UFs) |
| **EF / EA** | efeitos fixos / efeitos aleatórios (modelos de painel dos estudos) |
