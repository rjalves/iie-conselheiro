// Jornada completa no site publicado, com o agente real do n8n: cadastro → aprovação → pergunta → resposta gravada
// → avaliação → exclusão da conversa. Gasta tokens do Claude (uma pergunta por execução); as contas são apagadas no fim.
//   E2E_URL=https://<site> E2E_SUPABASE_URL=https://<supabase> E2E_SERVICE_ROLE_KEY=<chave> \
//     npx playwright test e2e/homologacao.spec.ts
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { CAPTURAS, preencherCadastro, senha, sql, sufixo } from "./comum";

test.skip(!process.env.E2E_SERVICE_ROLE_KEY, "só contra a homologação (E2E_SERVICE_ROLE_KEY)");

// Endereços de teste do Resend: aceitam o envio sem entregar a ninguém e sem prejudicar a reputação do domínio.
const gestora = { nome: "Gestora de Homologação", email: `delivered+gestora-${sufixo}@resend.dev` };
const admin = { nome: "Administração de Homologação", email: `delivered+admin-${sufixo}@resend.dev` };

type Resposta = { texto: string | null; erro: string | null; ferramentas: unknown; latencia_ms: number | null };
const respostas = () =>
  sql<Resposta>(`select m.texto, m.erro, m.ferramentas, m.latencia_ms from app.mensagem m
                 join app.conversa c on c.id = m.conversa_id join app.usuario u on u.id = c.usuario_id
                 where u.email = '${gestora.email}' and m.papel = 'agente'`);

test.afterAll(async () => {
  await sql(`delete from auth.users where email like 'delivered+%-${sufixo}@resend.dev'`);
});

/**
 * Cadastro pelo site. Com a confirmação de e-mail ligada, o Auth chama o hook e o site envia o e-mail pelo Resend:
 * o teste confere que o envio foi aceito (confirmation_sent_at), confirma direto no banco e entra com a senha.
 */
async function cadastrar(page: Page, pessoa: { nome: string; email: string }) {
  await preencherCadastro(page, pessoa);
  const emAnalise = page.getByRole("heading", { name: "Seu cadastro está em análise" });
  const confirmar = page.getByText("Confirme seu e-mail para continuar.");
  await expect(emAnalise.or(confirmar)).toBeVisible({ timeout: 20_000 });
  if (!(await confirmar.isVisible())) return;
  const [usuario] = await sql<{ enviado: boolean }>(
    `select confirmation_sent_at is not null as enviado from auth.users where email = '${pessoa.email}'`,
  );
  expect(usuario.enviado).toBe(true);
  await sql(`update auth.users set email_confirmed_at = now() where email = '${pessoa.email}'`);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(pessoa.email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(emAnalise).toBeVisible();
}

test("jornada completa com o agente real", async ({ browser, page }) => {
  test.setTimeout(300_000);
  await cadastrar(page, gestora);
  const paginaAdmin = await (await browser.newContext()).newPage();
  await cadastrar(paginaAdmin, admin);
  await sql(`update app.usuario set status = 'ativo', papel = 'admin' where email = '${admin.email}'`);
  await paginaAdmin.goto("/admin");
  await paginaAdmin.getByRole("row").filter({ hasText: gestora.email }).getByRole("button", { name: "Aprovar" }).click();
  await expect(paginaAdmin.getByRole("row").filter({ hasText: gestora.email })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Olá, Gestora." })).toBeVisible();
  await page.getByRole("button", { name: "Como está o Ceará no IIE?" }).click();

  // A resposta do agente fica gravada pelo n8n quando o streaming termina.
  await expect.poll(async () => (await respostas()).length, { timeout: 180_000, intervals: [3_000] }).toBe(1);
  const [gravada] = await respostas();
  console.log("resposta gravada:", JSON.stringify({ ...gravada, texto: gravada.texto?.slice(0, 400) }));
  expect(gravada.erro).toBeNull();
  expect(gravada.texto).toContain("Ceará");

  await page.waitForURL(/\/c\/[0-9a-f-]{36}$/);
  await page.reload();
  const resposta = page.locator("article").last();
  await expect(resposta).toContainText("Ceará");
  await expect(resposta.locator("[role=alert]")).toHaveCount(0);
  await page.getByRole("button", { name: "Útil", exact: true }).click();
  await expect(page.getByText("Obrigado pela avaliação.")).toBeVisible();
  mkdirSync(CAPTURAS, { recursive: true });
  await page.screenshot({ path: `${CAPTURAS}/homologacao-chat.png`, fullPage: true });

  await page.getByRole("button", { name: "Apagar conversa" }).click();
  await page.getByRole("button", { name: "Apagar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByText("Suas conversas aparecem aqui.")).toBeVisible();
});
