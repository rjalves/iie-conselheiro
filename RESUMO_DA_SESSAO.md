# Resumo da sessão: IIE e IIE Conselheiro

> Trabalho realizado em 10 e 11/09/2026. Resumo gerado em 14/09/2026.
> Os documentos produzidos estão em [`contexto/`](contexto/) (conhecimento sobre o IIE) e [`projeto/`](projeto/) (agente IIE Conselheiro). Nada foi commitado ainda.

---

## 1. Principais atividades

### 1.1 Entendimento do IIE e base de contexto

- **O que foi feito**
  - O repositório foi indexado com o GitNexus. A ferramenta não interpreta R, então os quatro notebooks `.Rmd`, as três bases `.rds`, as figuras e o README foram lidos diretamente.
  - O cálculo do IIE foi **reproduzido de forma independente em Python** e comparado com a série oficial por UF:
    - 2015 e 2017: erro médio de 0,1 ponto;
    - 2019: erro médio de 0,3 ponto.
  - O método oficial de 2019, que imputa a proficiência por trajetória porque o SAEB 2019 não traz a idade do aluno, foi **recuperado nos estudos e reimplementado**.
- **Problemas encontrados no pipeline R**
  - Falta a função `calc_iie_2019_geral()`.
  - A base do Censo não tem a coorte de 2021.
  - A pasta `Resultados/` não existe.
  - Há um defeito no `if_error()` do script da PNADc.
  - Os caminhos variam entre maiúsculas e minúsculas.
  - O código está fora de sincronia com as bases (o SAEB 2023 aparece nas bases, mas não no código).
- **Anomalias nos dados**
  - Bahia 2019: queda de 77% nos registros de conclusão em 2020.
  - Santa Catarina: quebra na série a partir de 2017.
  - Volatilidade da PNADc nas UFs pequenas.
- **Estudos:** os 4 estudos da pasta `estudos/` foram lidos na íntegra (Evolução do desempenho, Indicadores socioeconômicos, Pobreza, IIE Municipal).
- **Resultado:** a pasta [`contexto/`](contexto/README.md), com 9 documentos (visão geral, metodologia, arquitetura técnica, dicionário de dados, resultados por território, estudos, lacunas, glossário, indicadores × práticas) e anexos:
  - script de reprodução;
  - CSV reproduzido por UF;
  - CSV oficial 2013–2019;
  - matriz indicador × prática.

### 1.2 Catálogo de indicadores do IIE

- **Decomposição exata:** o IIE foi decomposto numa identidade que liga o índice a componentes gerenciáveis:

  > **IIE = (100 − F2 − P1) × A1 / 100**
  > (F2 = retenção de 2+ anos; P1 = evasão aos 17; A1 = básico em LP e MT entre quem conclui até os 18)

- **11 indicadores definidos:**

| Grupo | Indicadores |
|---|---|
| Permanência | **P1**: evasão aos 17 anos |
| Fluxo | **F1**: conclusão até os 18; **F2**: retenção prolongada (atraso 2+) |
| Aprendizagem | **A1**: básico entre concluintes; **A2**: aprendizagem de quem atrasou; **A3**: componente limitante (LP × MT) |
| Trajetória anterior | **E1**: Anos Iniciais; **E2**: Anos Finais e perda AI→AF; **E3**: passagem para o EM |
| Transversais | **Q1**: equidade; **D1**: qualidade do dado |

- **O que cada indicador traz:**
  - pergunta que responde;
  - métrica;
  - valor do Brasil em 2019;
  - gatilhos de **atenção** (pior que o Brasil) e **crítico** (quartil das piores UFs);
  - perguntas de diagnóstico;
  - sinais antecipados para monitorar;
  - tempo até o efeito aparecer no IIE.
- **Semáforo das 27 UFs:** construído junto com o **ganho potencial**, isto é, quantos pontos de IIE a UF ganharia se cada componente chegasse ao nível do Brasil.

### 1.3 Catálogo de boas práticas de gestão

Os três referenciais da pasta `boas-praticas/` foram lidos de ponta a ponta e inventariados, com referência de linha:

| Visão | Documento | Práticas inventariadas |
|---|---|---:|
| Gestão Escolar | *Referencial para Qualidade e Equidade da Gestão Escolar* (MEC, 2026) | 279 da escola (GE-) + 93 da secretaria (GE-SEC-) |
| Gestão da Secretaria | *Secretaria Municipal de Educação: Práticas para uma boa gestão* (Itaú Social) | 117 (SM-) |
| Gestão Estratégica | *Planejamento Estratégico de uma Secretaria de Educação* (Todos Pela Educação) | 52 (PE-) |
| **Total** | | **541** |

Cada prática recebeu uma classificação preliminar pelas alavancas do IIE: acesso, fluxo, aprendizagem, equidade, dados e condições estruturantes.

### 1.4 Mapeamento indicadores × práticas

- **Resultado:** [`contexto/09_indicadores_iie_e_praticas_de_gestao.md`](contexto/09_indicadores_iie_e_praticas_de_gestao.md) e a matriz legível por máquina [`matriz_indicador_pratica.csv`](contexto/anexos/matriz_indicador_pratica.csv).
- **Volume:** **133 vínculos** entre os 11 indicadores e **106 práticas distintas**. Cada vínculo tem nível (escola, secretaria, estratégico), papel (núcleo ou complementar), ação e fonte com linha.
- **Guia por indicador:** para cada indicador em situação ruim, o documento diz o que diagnosticar, o que fazer em cada nível e o que monitorar.
- **Pacotes por perfil de território:**
  - gargalo de fluxo;
  - gargalo de aprendizagem;
  - gargalo duplo;
  - evasão alta;
  - perda no EM;
  - dado inconsistente.

  Há exemplos aplicados para AM, RJ, CE e MT.
- **Lacunas dos referenciais:**
  - nenhum trata do Ensino Médio;
  - nenhum trata de correção de fluxo;
  - nenhum cita SAEB ou metas de proficiência;
  - nenhum cita o Educacenso;
  - a transição EF→EM só aparece de forma genérica;
  - a Tabela 1 do documento do TPE se perdeu na conversão do PDF.

### 1.5 Arquitetura do projeto IIE Conselheiro

- **Decisões aprovadas:**
  - público de gestores **cadastrados**;
  - **WhatsApp Cloud API** oficial da Meta;
  - **n8n**, para canal e operação, mais um **serviço Python** com o SDK da Anthropic, para raciocínio e ferramentas;
  - reaproveitamento do **n8n e do Supabase** existentes;
  - modelo `claude-opus-5` com *fallback* automático.
- **Princípio central:** **números só vêm de funções SQL**. O modelo interpreta e explica, mas nunca é a fonte de um número.
- **Base de conhecimento:** curada a partir de `contexto/`, com cache no prompt. As 5 ferramentas trazem sempre fonte, natureza do número e alertas.
- **Especificação:** [`projeto/01_proposta_arquitetura.md`](projeto/01_proposta_arquitetura.md) cobre requisitos, 8 workflows no n8n, contrato do serviço, modelo de dados, avaliação com 80 perguntas, LGPD, custos (≈ US$ 0,11 por pergunta), riscos e critérios de sucesso do piloto.

### 1.6 Plano de desenvolvimento

- **Plano-mestre:** [`projeto/02_plano_desenvolvimento.md`](projeto/02_plano_desenvolvimento.md), com fases F0 a F4 em ≈ 12 semanas até o fim do piloto com 2 secretarias. Inclui equipe, cronograma, orçamento (≈ US$ 270 a 420) e decisões programadas.
- **Planos executáveis:**
  - [P1, camada de dados](projeto/planos/P1_camada_de_dados.md);
  - [P2, serviço do agente](projeto/planos/P2_servico_do_agente.md).

  O código completo dos dois foi **executado e validado localmente**: 43 testes num Postgres 17 descartável, com o Claude simulado.
- **P3 a P5** (base de conhecimento e avaliação, n8n com WhatsApp, piloto): têm tarefas e critérios de aceite definidos.

---

## 2. Principais avanços para o estudo IIE Conselheiro

1. **De conhecimento disperso a uma base única e auditável.**
   - O que estava espalhado em notebooks R, bases `.rds`, 4 PDFs e 3 referenciais agora é uma base versionada.
   - Cada afirmação traz a origem: arquivo e linha, ou estudo e página.
   - É essa base que alimenta o agente.

2. **Os números do IIE ficaram reprodutíveis e confiáveis.**
   - A reprodução independente bate com a série oficial.
   - O método de 2019, que faltava no código, foi recuperado.
   - As funções SQL devolvem os mesmos valores dos documentos, conferidos por teste automatizado.
   - Isso permite um agente que **não inventa números**.

3. **O IIE passou a falar a língua da gestão.**
   - A identidade `IIE = (100 − F2 − P1) × A1 / 100` e o ganho potencial transformam um índice-síntese num diagnóstico com prioridade.
   - **Aprendizagem:** é o maior gargalo em 10 das 12 UFs de menor IIE. Em AP, AM, MA e RR, levá-la ao nível do Brasil renderia de +7 a +10 pontos.
   - **Retenção:** é a prioridade no RJ e no RS.
   - **Evasão:** é a prioridade no CE, em MG e no MS.

4. **Uma ponte rastreável entre indicador e ação.**
   - Com 541 práticas catalogadas e 133 vínculos, o agente recomenda ações citando o referencial de origem (MEC, Itaú Social ou TPE).
   - As recomendações ficam **justificáveis e auditáveis**, e não genéricas.

5. **A qualidade do dado virou indicador.**
   - As anomalias da BA 2019 e de SC e a volatilidade da PNADc viraram alertas embutidos nas respostas.
   - Isso evita orientar uma secretaria a partir de um número distorcido.

6. **Evidências de que vale a pena melhorar o IIE.**
   - Os estudos mostram que gerações com IIE mais alto têm menos pobreza aos 23 anos: −0,83 p.p. por ponto de IIE.
   - Também têm mais ensino superior, mais ocupação de qualidade e menos gravidez na adolescência e homicídios.
   - Esse argumento reforça o valor do conselheiro para os gestores.

7. **Uma agenda clara de lacunas.**
   - **Nos referenciais de gestão:** Ensino Médio, correção de fluxo, metas de proficiência, Educacenso e transição EF→EM.
   - **Nos dados:** municípios, capitais, recortes por sexo e raça/cor, 2021 e 2023.
   - **No pipeline R:** os problemas listados em 1.1.
   - Isso orienta os próximos conteúdos e cargas de dados.

8. **Arquitetura aprovada e risco de execução reduzido.**
   - O desenho tem decisões registradas, custo estimado, LGPD tratada e critérios de sucesso.
   - O código das camadas de dados e do agente já foi testado.
   - As correções que os testes revelaram já foram aplicadas nos documentos, por exemplo o IIE reproduzido do Brasil em 2019, que é 18,6 e não 18,7.

---

## 3. Pendências e próximos passos

- [ ] Revisar a proposta e os planos em `projeto/`.
- [ ] Iniciar a **Fase 0** (contas Meta, Anthropic e Supabase; termo de uso e LGPD).
- [ ] Executar a **P1** e a **P2**, por subagentes ou nesta sessão.
- [ ] Rodar o teste com o Claude real (P2, Tarefa 8). Exige a chave de desenvolvimento e consome tokens.
- [ ] Detalhar e executar a **P3** (base de conhecimento e avaliação), a **P4** (n8n + WhatsApp) e a **P5** (piloto).
- [ ] Corrigir o pipeline R (`contexto/07`) e integrar os dados de 2021 e 2023.
- [ ] Fazer o commit de `contexto/`, `boas-praticas/`, `projeto/` e deste resumo.
