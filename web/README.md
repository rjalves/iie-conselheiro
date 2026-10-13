# Site do IIE Conselheiro

Next.js 16 (App Router), Supabase (`@supabase/ssr`) e Tailwind 4. As especificações estão em [`projeto/03_proposta_sistema_web.md`](../projeto/03_proposta_sistema_web.md) e [`projeto/planos/P3_site.md`](../projeto/planos/P3_site.md).

## Rodar localmente

Pré-requisitos:
- Docker;
- Supabase CLI;
- Node 24;
- o ambiente Python de `agente/` (`python3 -m venv .venv && pip install -e ".[dev]"`).

```bash
# 1. Supabase local do IIE: aplica as migrações da P1 e o seed com os usuários n8n_app e agente_app
supabase start --workdir agente

# 2. Dados do IIE
cd agente && .venv/bin/python -m dados.carregar_iie \
  --database-url postgresql://postgres:postgres@127.0.0.1:59322/postgres --responsavel local

# 3. n8n simulado (contrato do webhook; grava as mensagens como o n8n real)
.venv/bin/python -m n8n.simulado --database-url postgresql://n8n_app:n8n_app_local@127.0.0.1:59322/postgres

# 4. Site (em outro terminal)
cd web && cp .env.local.example .env.local   # preencha as chaves com `supabase status -o env --workdir ../agente`
npm install && npm run dev                   # http://localhost:3000
```

No ambiente local, o e-mail não precisa ser confirmado. Para virar administrador depois de se cadastrar:

```bash
psql postgresql://postgres:postgres@127.0.0.1:59322/postgres \
  -c "update app.usuario set status = 'ativo', papel = 'admin' where email = '<seu e-mail>'"
```

## Testes

```bash
npm test          # unitários (Vitest): NDJSON, regras do chat, cadastro, redirecionamento seguro
npm run lint
npm run build
npm run e2e       # ponta a ponta (Playwright). Precisa dos passos 1 a 4 rodando; cria e apaga as contas de teste
```

## Estrutura

| Caminho | O que é |
|---|---|
| `src/proxy.ts` | Renova a sessão e manda quem não está logado para `/entrar` (no Next 16, o antigo `middleware`) |
| `src/app/(entrada)/` | Cadastro, entrar, recuperação de senha e termo de uso |
| `src/app/(chat)/` | Chat, com barra lateral, conversa nova (`/`) e conversa (`/c/[id]`) |
| `src/app/api/chat/route.ts` | Regras do chat e repasse ao webhook do n8n, com resposta em *streaming* |
| `src/app/admin/`, `src/app/conta/`, `src/app/aguardando/` | Administração, minha conta e cadastro em análise |
| `src/lib/` | Regras puras (testadas), clientes Supabase e tipos do banco (`supabase/banco.ts`, gerado com `supabase gen types`) |
| `public/municipios/<UF>.json` | Municípios do IBGE (`npm run municipios` gera de novo) |
