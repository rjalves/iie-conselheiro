# P3 — Site do IIE Conselheiro: plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.
>
> **Versão 1, 2026-10-13. Executado em 2026-10-13**, na *branch* `feat/p1-camada-de-dados`. Resultado:
> - **site:** 34 testes unitários, 3 testes ponta a ponta (Playwright), lint e build limpos;
> - **camada de dados:** 72 testes, incluindo o contrato do n8n simulado.
>
> Este plano descreve tarefas, interfaces e testes. O código fica no repositório (`web/`, `agente/n8n/simulado.py`, `agente/supabase/config.toml`) e não é copiado aqui, para não haver duas versões do mesmo código.

**Objetivo:** o site em que gestores se cadastram (UF e município), esperam a aprovação da equipe e conversam com o IIE Conselheiro. O chat tem várias conversas e respostas em *streaming*.

**Arquitetura:**
- Next.js 16.4 (App Router, TypeScript), sem `cacheComponents`, porque o site é todo personalizado pela sessão, e com `@supabase/ssr`. No Next 16, o *middleware* passou a se chamar `src/proxy.ts`. A sessão fica em *cookies*.
- As páginas leem `app.*` com a sessão do usuário, sob RLS.
- `POST /api/chat` valida o pedido, cria a conversa e repassa a pergunta ao webhook do n8n. O NDJSON que volta é convertido em texto para o navegador.
- Em desenvolvimento, usa:
  - um **Supabase local** (CLI), com Postgres 15, as migrações da P1 e a carga;
  - um **n8n simulado** (`agente/n8n/simulado.py`), que cumpre o contrato da [03 §5.1](../03_proposta_sistema_web.md#51-contrato-site--n8n) e grava as mensagens como o n8n gravaria.

**Stack:** Next.js e React, TypeScript, Tailwind CSS, `@supabase/ssr` e `@supabase/supabase-js`, `react-markdown` com `remark-gfm`, Vitest e Playwright, Supabase CLI.

**Especificação:**
- [`03_proposta_sistema_web.md`](../03_proposta_sistema_web.md): seções 2 (RW01 a RW11), 4 (site), 5.1 (contrato), 6.2 e 6.3 (dados e RLS), 9 (erros) e 10 (segurança);
- [`P1_camada_de_dados.md`](P1_camada_de_dados.md): a migração 0004 tem o gatilho de cadastro, a cota e a RLS.

## Restrições globais

- **Idioma e textos:** português do Brasil, frases curtas, voz ativa. Os botões dizem o que acontece ("Criar conta", "Enviar pergunta"). Mensagens de erro dizem o que houve e como resolver.
- **Acessibilidade:** contraste AA, foco visível, rótulo em todo campo, navegação por teclado, `prefers-reduced-motion` respeitado. O layout funciona a partir de 360 px de largura.
- **Segurança:**
  - a chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`) e a chave do n8n (`N8N_CHAT_CHAVE`) ficam **só no servidor** e nunca vão para o navegador;
  - o site nunca chama o Claude.
- **Banco:**
  - o site lê e grava `app.*` só com a sessão do usuário (RLS);
  - a única exceção é excluir a conta, que usa a chave de serviço no servidor;
  - o site não acessa `iie.*`.
- **Contrato com o n8n:** [03 §5.1](../03_proposta_sistema_web.md#51-contrato-site--n8n). Cabeçalho `X-IIE-Chave`; corpo `{usuario_id, conversa_id, mensagem, perfil, uf, municipio, data_referencia}`; resposta em NDJSON (`begin`, `item` com `content`, `end`, `error`).
- **Limite:** `LIMITE_DIARIO`, padrão 40. A contagem vem de `app.fn_perguntas_hoje()`.

## Direção visual

| Elemento | Escolha | Por quê |
|---|---|---|
| Elemento marcante | Grade de 100 pontos ("de cada 100 jovens…") nas telas de entrada, com 19 preenchidos: o IIE oficial do Brasil em 2019, 19,0, com a fonte citada | É o próprio jeito de ler o IIE (doc 02 e diálogo de referência da proposta 01) |
| Destaque nas respostas | Texto em **negrito** aparece como marca-texto amarelo | O gestor "sublinha o relatório". O agente usa negrito só para o que importa |
| Cores | Tinta `#1D3A8A`, tinta escura `#152B66`, grafite `#1E2228`, papel `#F6F7F9`, marca-texto `#FFE066`, linha `#DDE1E8`, erro `#B42318`, sucesso `#1F7A4D` | Caderno escolar e caneta azul. Evita o creme com terracota e o escuro com neon |
| Tipografia | Atkinson Hyperlegible Next (Google Fonts), uma família, pesos 400, 600 e 700, algarismos tabulares | Fonte desenhada para legibilidade; adequada a serviço público |
| Chat | Barra lateral em tinta escura. Respostas do agente como texto corrido, com no máximo cerca de 72 caracteres por linha. A pergunta do usuário fica num bloco claro alinhado à direita. O campo de pergunta fica fixo embaixo | Leitura de relatório, não de mensageiro |
| Evitar | Rótulos em maiúsculas, setas nos botões, cartões iguais com sombra, animações de entrada em tudo | São marcas de página genérica |

## Pontos de atenção na revisão

1. **Pergunta enviada por usuário pendente, bloqueado ou acima do limite:** `/api/chat` responde 403 ou 429, e a tela explica o motivo. Teste unitário em `rotas/chat.test.ts`.
2. **Conversa de outro usuário no `conversa_id`:** a RLS esconde a conversa, e a rota responde 404. Teste unitário e coberto pela RLS da P1.
3. **n8n fora do ar ou lento (mais de 120 s):** o texto fixo de instabilidade aparece, com "Tentar de novo". Teste unitário do conversor com *stream* interrompido e com evento `error`.
4. **Cadastro com município de outra UF ou sem aceite:** o formulário impede. Se passar, o erro `cadastro_invalido` do gatilho vira uma mensagem clara. Teste unitário do mapeamento de erros.
5. **Conexão do navegador caindo no meio da resposta:** ao recarregar a conversa, aparece a resposta completa gravada pelo n8n. Coberto no ponta a ponta (recarregar depois da resposta).

## Arquivos (principais)

| Caminho | Responsabilidade |
|---|---|
| `agente/supabase/config.toml` | Supabase local do IIE: portas 59320 a 59329, Postgres 15, `app` exposto, sem confirmação de e-mail no ambiente local |
| `agente/n8n/simulado.py` | n8n simulado: webhook `POST /webhook/iie-chat`, confere a chave, grava pergunta e resposta e devolve NDJSON. A resposta usa `iie.fn_consultar_iie`, para trazer números reais |
| `agente/tests/n8n/test_simulado.py` | contrato do simulado (chave, NDJSON, gravação) |
| `web/scripts/gerar_municipios.mjs` | gera `web/public/municipios/<UF>.json` a partir da API de localidades do IBGE |
| `web/src/lib/supabase/{servidor,navegador,sessao}.ts` | clientes Supabase (servidor, navegador, renovação de sessão) |
| `web/src/lib/ndjson.ts` | converte o NDJSON do n8n em texto (`item.content`) e trata `error` e fim inesperado |
| `web/src/lib/cadastro.ts` | validação do formulário e tradução dos erros do Auth e do gatilho |
| `web/src/lib/usuario.ts` | lê `app.usuario` do usuário logado |
| `web/src/app/api/chat/route.ts` | regras do chat e repasse ao n8n |
| `web/src/app/(entrada)/…` | cadastro, entrar, recuperar-senha, nova-senha, termo |
| `web/src/app/auth/confirmar/route.ts` | troca o código do link de e-mail por sessão |
| `web/src/app/aguardando/page.tsx` | pendente, recusado ou bloqueado |
| `web/src/app/(chat)/…` | *layout* com a barra lateral, conversa nova (`/`) e conversa (`/c/[id]`) |
| `web/src/app/admin/page.tsx` | cadastros e ações de aprovar, recusar e bloquear |
| `web/src/app/conta/page.tsx` | meus dados e excluir conta |
| `web/src/middleware.ts` | renova a sessão e manda quem não está logado para `/entrar` |
| `web/e2e/fluxo.spec.ts` | ponta a ponta: cadastro, aprovação, pergunta, resposta, avaliação e apagar |

---

### Tarefa 1: Supabase local e n8n simulado

**Interfaces:**
- **Supabase local:** `supabase start --workdir agente`. API em `http://127.0.0.1:59321`; banco em `postgresql://postgres:postgres@127.0.0.1:59322/postgres`. As migrações 0001 a 0005 são aplicadas na subida. A carga roda com `python -m dados.carregar_iie`.
- **Simulado:** `python -m n8n.simulado --porta 5679 --chave dev --database-url <banco local>`. Atende `POST /webhook/iie-chat`.

- [ ] Rodar `supabase init --workdir agente` e ajustar o `config.toml`:
  - `project_id = "iie-conselheiro"`;
  - portas 593xx;
  - `[db] major_version = 15`;
  - `[api] schemas = ["public", "graphql_public", "app"]`;
  - `[auth] site_url = "http://localhost:3000"`;
  - `[auth.email] enable_confirmations = false` (só local);
  - desligar `analytics`, `realtime`, `storage` e `edge_runtime`.
- [ ] Subir o Supabase local, rodar a carga e conferir que `GET /rest/v1/conversa` com `Accept-Profile: app` e a chave anônima responde 401 ou `[]`, e nunca 404 de esquema.
- [ ] **Teste** `agente/tests/n8n/test_simulado.py`:
  - chave errada dá 401;
  - pergunta válida gera NDJSON com `begin`, ao menos um `item` e `end`;
  - `app.mensagem` recebe a pergunta e a resposta;
  - `app.cota_diaria` soma 1.
- [ ] Implementar `agente/n8n/simulado.py` (biblioteca padrão + psycopg) até o teste passar. Commit.
- [ ] `agente/supabase/seed.sql` (só no ambiente local): cria os usuários de login `n8n_app` e `agente_app`. No Supabase, o `postgres` não é superusuário e não pode assumir `n8n_operacao`, por isso o simulado conecta como `n8n_app`, como o n8n real.

### Tarefa 2: Projeto `web/`, identidade visual e clientes Supabase

- [ ] `create-next-app` em `web/` com TypeScript, Tailwind, App Router, `src/` e ESLint. Dependências: `@supabase/ssr`, `@supabase/supabase-js`, `react-markdown` e `remark-gfm`; Vitest para testes.
- [ ] Definir os *tokens* de cor e fonte no CSS global (seção "Direção visual"); componente `GradeGeracao` (100 pontos, `aria-label` com a leitura por extenso).
- [ ] Clientes Supabase (servidor, navegador e *middleware*) e `.env.local.example` com as variáveis da [03 §12](../03_proposta_sistema_web.md#12-implantação).
- [ ] `scripts/gerar_municipios.mjs`: gera `public/municipios/<UF>.json` (`[{codigo, nome}]`, em ordem alfabética) com os municípios (o IBGE devolveu 5.571 em 2026-10-13). Conferir: 27 arquivos; o do CE tem Sobral com código 2312908.
- [ ] `npm run build` e `npm run lint` passam. Commit.

### Tarefa 3: Cadastro, entrada e recuperação de senha

- [ ] **Teste** `src/lib/cadastro.test.ts`:
  - validação: nome com 2 caracteres ou mais, e-mail, senha com 8 caracteres ou mais, UF, município da UF, perfil e aceite;
  - tradução de erros: `cadastro_invalido` vira mensagem sobre UF/município; "User already registered" vira "Já existe uma conta com este e-mail"; erro de senha fraca; credenciais inválidas.
- [ ] **Telas:**
  - `/cadastro`: `signUp` com os metadados `nome`, `perfil`, `instituicao`, `uf`, `municipio_ibge`, `municipio_nome` e `aceite_termo`; os municípios carregam conforme a UF;
  - `/entrar`;
  - `/recuperar-senha`;
  - `/nova-senha`;
  - `/termo`;
  - `/auth/confirmar`;
  - ação de sair.
- [ ] **Depois do cadastro:** com confirmação de e-mail, a tela diz "confirme pelo link enviado para …"; sem confirmação, vai para `/aguardando`.
- [ ] Testes passam. Commit.

### Tarefa 4: Acesso por status e administração

- [ ] **`middleware.ts`:** renova a sessão. Rotas públicas: `/entrar`, `/cadastro`, `/recuperar-senha`, `/nova-senha`, `/termo` e `/auth/*`. O resto exige sessão.
- [ ] **`/aguardando`:** mostra o status (pendente, recusado ou bloqueado), um texto de orientação e o botão de sair. O *layout* do chat manda quem não está ativo para essa tela.
- [ ] **`/admin`:** só para quem tem `papel = admin` (os outros vão para `/`). Abas por status, com contagem. A tabela mostra nome, e-mail, perfil, instituição, município/UF e data. As ações de aprovar, recusar e bloquear são *server actions* com a sessão do administrador (a RLS da P1 garante). Confirmação antes de recusar ou bloquear.
- [ ] Commit.

### Tarefa 5: Chat com várias conversas e *streaming*

- [ ] **Teste** `src/lib/ndjson.test.ts`:
  - junta os `item.content`;
  - ignora linhas vazias e `begin`/`end`;
  - evento `error` vira o texto fixo de instabilidade;
  - JSON partido entre pedaços do *stream* é remontado.
- [ ] **Teste** `src/app/api/chat/regras.test.ts`, com a função pura `avaliarPedido`:
  - mensagem vazia ou com mais de 2.000 caracteres dá 400;
  - sem sessão dá 401;
  - status diferente de ativo dá 403;
  - limite atingido dá 429, com o horário de renovação;
  - conversa inexistente dá 404.
- [ ] **`POST /api/chat`:**
  1. valida;
  2. cria a conversa se for nova, com título = primeiros 60 caracteres;
  3. chama o n8n (tempo limite de 120 s, cabeçalho `X-IIE-Chave`);
  4. devolve `text/plain` em *stream*, com `X-Conversa-Id`.
- [ ] **Interface:**
  - barra lateral com as conversas (mais recentes primeiro), "Nova conversa" e "Apagar conversa", com confirmação;
  - conversa vazia com saudação e 3 sugestões que usam a UF do usuário;
  - aviso fixo discreto: "Dados por estado. O IIE ainda não tem dados por município.";
  - mensagens com `react-markdown`, em que negrito vira marca-texto;
  - campo de pergunta com Enter para enviar e Shift+Enter para nova linha, mostrando quantas perguntas faltam no dia;
  - "Tentar de novo" em caso de erro;
  - no celular, a barra lateral vira gaveta.
- [ ] **Avaliação:** 👍/👎 em cada resposta, com *upsert* em `app.feedback` e motivo opcional no 👎.
- [ ] Testes passam. Commit.

### Tarefa 6: Minha conta

- [ ] **`/conta`:** dados do cadastro e link para o termo.
- [ ] **"Excluir minha conta":**
  - pede confirmação digitando "EXCLUIR";
  - uma *server action* chama `auth.admin.deleteUser` com a chave de serviço, só para o próprio usuário;
  - depois sai da sessão e mostra a confirmação.
  - O efeito em cascata (conversas, mensagens, memória e cota) foi testado na P1.
- [ ] Commit.

### Tarefa 7: Ponta a ponta e verificação visual

Pré-requisitos: Supabase local, n8n simulado e `npm run dev`. Contas e senhas de teste geradas no próprio teste, só no ambiente local.

- [ ] **`e2e/fluxo.spec.ts`:**
  1. cadastra um usuário (Sobral, CE) e vê "cadastro em análise";
  2. o teste promove um administrador e aprova o usuário pelo `/admin`;
  3. o usuário entra, faz uma pergunta e vê o texto chegar aos poucos, com "Ceará";
  4. recarrega e vê a conversa na barra lateral, com a resposta completa;
  5. avalia com 👍;
  6. apaga a conversa.
- [ ] Capturas de tela (computador e celular) das telas de entrada, chat e administração, revisadas contra a "Direção visual".
- [ ] Commit.
