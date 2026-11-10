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

O `e2e/chat-estavel.spec.ts` confere que a pergunta e a resposta não somem da tela quando a resposta termina. Ele não gasta tokens e roda contra qualquer Supabase com SQL pela API: `E2E_URL=… E2E_SUPABASE_URL=… E2E_SERVICE_ROLE_KEY=… npx playwright test e2e/chat-estavel.spec.ts`.

## Publicar (homologação, Easypanel)

O site roda como um serviço *App* do Easypanel, no mesmo servidor do n8n, construído a partir do `web/Dockerfile`.

1. **Fonte:** GitHub `rjalves/iie-conselheiro`, ramo `main`, caminho de build `/web`. **Build:** Dockerfile (`Dockerfile`).
2. **Ambiente:** as variáveis de `.env.local.example`, com os valores da homologação. As `NEXT_PUBLIC_*` entram no código do navegador durante a construção; se não chegarem ao build, ele falha com "faltam NEXT_PUBLIC_SUPABASE_URL…".
3. **Domínio:** `iiec.educacional.ia.br`, com HTTPS e apontando para a porta 3000. No DNS, crie um registro A para o IP do servidor.
4. **Supabase:** o esquema `app` precisa estar exposto na API REST. Na homologação, isso foi feito no próprio banco, sem mexer nas variáveis do Easypanel:
   ```sql
   alter role authenticator set pgrst.db_schemas = 'public, storage, graphql_public, app';
   notify pgrst, 'reload config'; notify pgrst, 'reload schema';
   ```
5. **Jornada completa** com o agente real (gasta tokens: uma pergunta; as contas de teste são apagadas no fim):
   ```bash
   E2E_URL=https://<site> E2E_SUPABASE_URL=https://<supabase> E2E_SERVICE_ROLE_KEY=<chave> \
     npx playwright test e2e/homologacao.spec.ts
   ```

### E-mails (Resend, domínio `iiec.educacional.ia.br`)

O Supabase Auth não envia e-mail por SMTP. A cada confirmação de cadastro, nova senha, convite ou link de acesso, ele chama `POST /api/auth/email` (*Send Email Hook*), com o pedido assinado no padrão Standard Webhooks. O site monta o e-mail em português (`src/lib/email.ts`) e envia pela API do Resend. Usa como chave de idempotência o `webhook-id`, porque o Auth pode repetir o pedido.

Para ligar:
1. **Resend:** cadastre o domínio `iiec.educacional.ia.br`, publique no DNS os registros que o Resend mostrar (DKIM e SPF) e crie uma chave de API com acesso de envio.
2. **Site:** defina `RESEND_API_KEY`, `EMAIL_REMETENTE` e `SUPABASE_HOOK_EMAIL_SEGREDO` (veja `.env.local.example`).
3. **Auth:** o compose do Supabase precisa repassar o hook. No `auth.environment`:
   ```yaml
   GOTRUE_HOOK_SEND_EMAIL_ENABLED: ${SEND_EMAIL_HOOK_ENABLED:-false}
   GOTRUE_HOOK_SEND_EMAIL_URI: ${SEND_EMAIL_HOOK_URI:-}
   GOTRUE_HOOK_SEND_EMAIL_SECRETS: ${SEND_EMAIL_HOOK_SECRETS:-}
   ```
   Depois defina, no `.env` do Supabase:
   - `SEND_EMAIL_HOOK_ENABLED=true` e `SEND_EMAIL_HOOK_URI=https://iiec.educacional.ia.br/api/auth/email`;
   - `SEND_EMAIL_HOOK_SECRETS`, com o mesmo segredo do site;
   - `SITE_URL=https://iiec.educacional.ia.br` e `ADDITIONAL_REDIRECT_URLS=https://iiec.educacional.ia.br/**`;
   - por último, `ENABLE_EMAIL_AUTOCONFIRM=false`.

   Enquanto o hook não estiver ligado, deixe `ENABLE_EMAIL_AUTOCONFIRM=true`. Sem ele, o Auth tenta o SMTP de exemplo e o cadastro falha.

O teste da homologação usa os endereços de teste do Resend (`delivered+…@resend.dev`). Ele confere que o e-mail de confirmação foi aceito (`confirmation_sent_at`) e confirma a conta direto no banco.

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
