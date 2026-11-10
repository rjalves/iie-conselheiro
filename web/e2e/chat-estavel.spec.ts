// A conversa não pisca quando a resposta termina: a pergunta e a resposta continuam na tela enquanto o site troca a
// versão local pela gravada (antes, a tela voltava por 2 a 3 s à saudação ou à conversa antiga). Não gasta tokens:
// /api/chat é interceptado e as mensagens são gravadas direto no banco, como o n8n faz antes de encerrar a resposta.
//   E2E_URL=<site> E2E_SUPABASE_URL=<supabase> E2E_SERVICE_ROLE_KEY=<chave> npx playwright test e2e/chat-estavel.spec.ts
import { expect, test, type Page } from "@playwright/test";
import { preencherCadastro, senha, sql, sufixo } from "./comum";

test.skip(!process.env.E2E_SERVICE_ROLE_KEY, "precisa de SQL pela API (E2E_SUPABASE_URL e E2E_SERVICE_ROLE_KEY)");

const email = `delivered+estavel-${sufixo}@resend.dev`;
test.afterAll(() => sql(`delete from auth.users where email = '${email}'`));

/** A cada quadro, guarda só as mudanças de visibilidade de cada trecho: [false, true] é aparecer e ficar. */
async function vigiar(page: Page, trechos: string[]) {
  await page.evaluate((lista) => {
    const w = window as unknown as { linhas: Record<string, boolean[]> };
    w.linhas = Object.fromEntries(lista.map((t) => [t, []]));
    const passo = () => {
      const texto = document.body.innerText;
      for (const [t, linha] of Object.entries(w.linhas)) {
        if (linha.at(-1) !== texto.includes(t)) linha.push(texto.includes(t));
      }
      requestAnimationFrame(passo);
    };
    passo();
  }, trechos);
}
const linhas = (page: Page) => page.evaluate(() => (window as unknown as { linhas: unknown }).linhas);

async function perguntar(page: Page, pergunta: string, resposta: string, respostasGravadas: number) {
  await vigiar(page, [pergunta, resposta]);
  await page.getByLabel("Sua pergunta").fill(pergunta);
  await page.getByRole("button", { name: "Enviar" }).click();
  // A versão gravada chegou quando cada resposta ganha os botões de avaliação (que dependem do id).
  await expect(page.getByRole("button", { name: "Útil", exact: true })).toHaveCount(respostasGravadas);
  expect(await linhas(page)).toEqual({ [pergunta]: [false, true], [resposta]: [false, true] });
}

test("pergunta e resposta não somem quando a resposta termina", async ({ page }) => {
  await preencherCadastro(page, { nome: "Teste Estável", email });
  await expect(
    page.getByRole("heading", { name: "Seu cadastro está em análise" }).or(page.getByText("Confirme seu e-mail para continuar.")),
  ).toBeVisible({ timeout: 20_000 });
  await sql(`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where email = '${email}';
             update app.usuario set status = 'ativo' where email = '${email}'`);
  const [{ id: usuarioId }] = await sql<{ id: string }>(`select id from app.usuario where email = '${email}'`);
  await page.goto("/");
  if (page.url().includes("/entrar")) {
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(senha);
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await expect(page.getByRole("heading", { name: "Olá, Teste." })).toBeVisible();

  let conversaId = "";
  let respostas = 0;
  await page.route("**/api/chat", async (route) => {
    const { mensagem } = route.request().postDataJSON() as { mensagem: string };
    if (!conversaId) {
      [{ id: conversaId }] = await sql<{ id: string }>(
        `insert into app.conversa (usuario_id, titulo) values ('${usuarioId}', 'Estável') returning id`,
      );
    }
    const resposta = `Resposta simulada ${++respostas}`;
    await sql(`insert into app.mensagem (conversa_id, papel, texto) values
               ('${conversaId}', 'usuario', '${mensagem}'), ('${conversaId}', 'agente', '${resposta}')`);
    await route.fulfill({ headers: { "Content-Type": "text/plain; charset=utf-8", "X-Conversa-Id": conversaId }, body: resposta });
  });

  await perguntar(page, "Primeira pergunta de teste", "Resposta simulada 1", 1); // conversa nova: vai para /c/<id>
  await expect(page).toHaveURL(/\/c\/[0-9a-f-]{36}$/);
  await perguntar(page, "Segunda pergunta de teste", "Resposta simulada 2", 2); // conversa existente: só o refresh
});
