# Projeto IIE Conselheiro

O IIE Conselheiro é um agente de IA para gestores da educação. Ele explica os resultados do Índice de Inclusão Educacional (IIE) do território do gestor e orienta práticas de gestão para melhorar os indicadores que estão mal. A primeira versão é um **site**, com cadastro e chat no estilo do Claude e do ChatGPT. O WhatsApp vem depois.

| Documento | Conteúdo |
|---|---|
| [visao_de_negocio.md](visao_de_negocio.md) | **Visão de negócio:** o problema (desigualdade digital e fluência em dados na gestão pública), o IIE e como o Conselheiro une dados, boas práticas e IA. Para parceiros e secretarias |
| [03_proposta_sistema_web.md](03_proposta_sistema_web.md) | **Proposta atual (rascunho para revisão):** site em Next.js, Supabase e agente no n8n |
| [02_plano_desenvolvimento.md](02_plano_desenvolvimento.md) | Plano-mestre v2: fases F0–F6 (site primeiro, WhatsApp por último), tarefas, cronograma, orçamento e decisões |
| [01_proposta_arquitetura.md](01_proposta_arquitetura.md) | Proposta original (WhatsApp + serviço Python). Ainda vale para princípios, ferramentas, base de conhecimento, avaliação e LGPD |
| [planos/P1_camada_de_dados.md](planos/P1_camada_de_dados.md) | Plano executável da camada de dados, v2 (site e base de práticas). Tarefas 1 a 7 executadas |
| [planos/P2_servico_do_agente.md](planos/P2_servico_do_agente.md) | Serviço do agente em Python. **Substituído** pelo agente no n8n; fica como referência e plano B |
| [planos/anexos/seeds/](planos/anexos/seeds/) | Sementes usadas pela P1: territórios, indicadores, alertas de dado |

## Resumo da solução

```
Gestor ⇄ Site (Next.js) ⇄ n8n: AI Agent + Claude (claude-sonnet-5-5)
             │                 │
             └─ Supabase: login e app (RLS) ─┴─ Supabase iie: números só via funções SQL
```

- **Público:** gestores que se cadastram no site (UF e município) e são aprovados pela equipe.
- **Exatidão:** todo número vem de uma função SQL. O modelo interpreta e explica, mas nunca é a fonte de um número.
- **Orientação:** as práticas vêm da matriz indicador × prática ([contexto/09](../contexto/09_indicadores_iie_e_praticas_de_gestao.md)), com o nível ajustado ao perfil do gestor.
- **Custo estimado:** ≈ US$ 0,10 por pergunta na média (≈ US$ 0,17 na primeira pergunta de cada conversa).
- **Prazo:** piloto interno em dezembro de 2026; piloto com secretarias em fevereiro de 2027.

## Situação em 2026-10-13

- A proposta 03 foi aprovada, com a base de práticas completa no Supabase.
- **P1 (camada de dados), Tarefas 1 a 7: executadas e testadas** na *branch* `feat/p1-camada-de-dados`.
  - O que existe: migrações 0001 a 0005, carga, catálogo das 541 práticas e 68 testes num Postgres 17 local.
  - O que falta: a Tarefa 8, que aplica tudo no Supabase de desenvolvimento.
- **P3 (site): executada** com o Supabase local e o n8n simulado. O site está em `web/`; veja o `web/README.md`.
- Próximos passos:
  - pendências da Tarefa 8 (expor `app`, primeiro administrador, trocar as chaves);
  - a prova técnica do agente no n8n (Fase 0);
  - os planos da P2 (agente no n8n) e da P3 (site).
