# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dirigentes e técnicos de secretarias de educação, estaduais e municipais (confirmado em 2026-11-11). Num município pequeno, quem lê os dados costuma ser o próprio dirigente ou um técnico que acumula funções, sem área de TI própria. O trabalho deles: entender o resultado do IIE do território, decidir onde agir primeiro e escolher práticas de gestão.

## Product Purpose

O IIE Conselheiro é uma solução digital que usa IA para apoiar a gestão estratégica de secretarias de educação a partir dos resultados do Índice de Inclusão Educacional (IIE). É um agente que conversa com o gestor: explica os resultados do território, mostra onde agir primeiro e sugere práticas de gestão com fonte. O painel do IIE responde "como estamos?"; o Conselheiro responde também "por quê?", "onde agir primeiro?", "o que fazer?" e "como saber se está funcionando?".

## Positioning

O IIE é um indicador público criado pela Metas Sociais a pedido do Instituto Natura. O IIE Conselheiro é o projeto próprio, criado e desenvolvido por Roberto Alves, fundador da Educacional.ia.br. O mecanismo que outro produto não copia: decomposição exata do IIE (fluxo × aprendizagem), semáforo, ganho potencial por componente e um catálogo de 541 práticas de três referenciais públicos (MEC, Itaú Social, Todos Pela Educação), cada uma com código e fonte.

## Operating Context

Site em `web/` (Next.js), com cadastro, entrada e chat. O agente roda no n8n e consulta o Supabase. A base atual tem o IIE por UF (27 UFs e Brasil), série do painel de 2015 a 2023; o IIE 2023 é preliminar. O cadastro aceita municípios, mas o dado ainda é estadual. Novos cadastros são aprovados na hora.

## Capabilities and Constraints

- Consultas do agente: resultado, decomposição, comparação, ranking, práticas por indicador, pacote por perfil e busca de práticas.
- Regras de confiança: todo número vem de uma consulta, nunca da memória do modelo; toda prática traz código e fonte; o agente avisa ano, fonte e problemas conhecidos do dado.
- Limite diário de perguntas por usuário.

## Brand Commitments

- Autoria do site: "Criação e Desenvolvimento: Educacional.ia - Roberto Alves". Contato: contato@educacional.ia.br. Não atribuir a autoria do site a Lupa Social nem ao Instituto Natura.
- Créditos do índice: o IIE é citado como indicador público criado pela Metas Sociais a pedido do Instituto Natura.
- Instituições parceiras e apoiadoras do IIE Conselheiro, informadas pelo usuário em 2026-11-11: Instituto Natura, Todos Pela Educação e B3 Social. As logos ficam em `web/public/parceiros/`.
- Identidade visual existente (caderno escolar, caneta azul e marca-texto), registrada em `projeto/planos/P3_site.md`, seção "Direção visual", e nos tokens de `web/src/app/globals.css`. O usuário pediu para manter as cores atuais.

## Evidence on Hand

- Dados do IIE: `contexto/anexos/iie_uf_painel_2015_2023.csv` e `contexto/05_resultados_por_territorio.md`.
- Problema e proposta de valor: `projeto/visao_de_negocio.md` (dados da TIC Governo 2025, Cetic.br/NIC.br).
- Catálogo de práticas: `contexto/anexos/catalogo_praticas.csv`.
- Não existem depoimentos, clientes, secretarias parceiras, preços nem métricas de uso. Não inventar.

## Product Principles

1. Do indicador à ação: cada leitura do dado termina numa prioridade ou numa prática.
2. Nada sem fonte: números e práticas sempre conferíveis.
3. Linguagem do gestor, não do estatístico.
4. Servir primeiro quem tem menos estrutura.

## Accessibility & Inclusion

Serviço público: fonte de alta legibilidade (Atkinson Hyperlegible Next), foco sempre visível, contraste adequado, leitura por extenso de gráficos (a grade de 100 pontos tem `aria-label`).
