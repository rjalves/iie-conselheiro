// Ponta a ponta no ambiente local: cadastro, aprovação, conversa com resposta em streaming, avaliação e exclusão.
// Usa o n8n simulado e o banco local; contra a homologação, roda o homologacao.spec.ts.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { devices, expect, test } from "@playwright/test";
import { CAPTURAS, cadastrar, entrarComo, sufixo } from "./comum";

test.skip(!!process.env.E2E_SERVICE_ROLE_KEY, "usa o n8n simulado e o banco local");

const BANCO = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:59322/postgres";
const gestora = { nome: "Gestora de Teste", email: `gestora-${sufixo}@exemplo.test` };
const admin = { nome: "Administração de Teste", email: `admin-${sufixo}@exemplo.test` };

function sql(consulta: string): string {
  return execFileSync("psql", [BANCO, "-v", "ON_ERROR_STOP=1", "-Atc", consulta], { encoding: "utf8" }).trim();
}

test.afterAll(() => {
  sql(`delete from auth.users where email like '%-${sufixo}@exemplo.test'`);
});

test("cadastro, aprovação, conversa, avaliação e exclusão da conversa", async ({ browser, page }) => {
  await cadastrar(page, gestora);

  const paginaAdmin = await (await browser.newContext()).newPage();
  await cadastrar(paginaAdmin, admin);
  sql(`update app.usuario set status = 'ativo', papel = 'admin' where email = '${admin.email}'`);
  await paginaAdmin.goto("/admin");
  await expect(paginaAdmin.getByRole("heading", { name: "Cadastros" })).toBeVisible();
  await paginaAdmin.getByRole("row").filter({ hasText: gestora.email }).getByRole("button", { name: "Aprovar" }).click();
  await expect(paginaAdmin.getByRole("row").filter({ hasText: gestora.email })).toHaveCount(0);

  // Acesso por UF: a gestora começa só com o CE; o administrador libera também Pernambuco.
  await paginaAdmin.goto("/admin?status=ativo");
  const linha = paginaAdmin.getByRole("row").filter({ hasText: gestora.email });
  await expect(linha).toContainText("CE");
  await linha.getByRole("button", { name: `Editar estados de ${gestora.nome}` }).click();
  const janela = paginaAdmin.getByRole("dialog", { name: `Estados liberados para ${gestora.nome}` });
  await janela.getByLabel("Pernambuco (PE)").check();
  mkdirSync(CAPTURAS, { recursive: true });
  await paginaAdmin.screenshot({ path: `${CAPTURAS}/admin-estados.png` });
  await janela.getByRole("button", { name: "Salvar estados" }).click();
  await expect(janela).toBeHidden();
  await expect(linha).toContainText("CE, PE");
  expect(sql(`select ufs_acesso from app.usuario where email = '${gestora.email}'`)).toBe("{CE,PE}");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Olá, Gestora." })).toBeVisible();
  await expect(page.getByText("Estados liberados: Ceará e Pernambuco.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Como está o Ceará no IIE?" }).click();
  const resposta = page.locator("article").last();
  await expect(resposta).toContainText("21,2", { timeout: 30_000 });
  await page.waitForURL(/\/c\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("navigation", { name: "Conversas anteriores" })).toContainText(
    "Como está o Ceará no IIE?",
  );
  expect(sql(`select perguntas from app.cota_diaria c join app.usuario u on u.id = c.usuario_id
              where u.email = '${gestora.email}'`)).toBe("1");

  await page.reload(); // a resposta gravada pelo n8n aparece inteira
  await expect(page.locator("article").last()).toContainText("Ainda não há dados de Sobral");
  await expect(page.locator(".resposta strong").first()).toContainText("Ceará");
  await page.getByRole("button", { name: "Útil", exact: true }).click();
  await expect(page.getByText("Obrigado pela avaliação.")).toBeVisible();
  expect(sql(`select nota from app.feedback f join app.usuario u on u.id = f.usuario_id
              where u.email = '${gestora.email}'`)).toBe("1");

  mkdirSync(CAPTURAS, { recursive: true });
  await page.screenshot({ path: `${CAPTURAS}/chat-computador.png` });
  await paginaAdmin.goto("/admin?status=ativo");
  await paginaAdmin.screenshot({ path: `${CAPTURAS}/admin-computador.png`, fullPage: true });
  const celular = await entrarComo(browser, gestora.email, devices["Pixel 7"]);
  await celular.goto(page.url());
  await expect(celular.locator("article").last()).toContainText("21,2");
  await celular.screenshot({ path: `${CAPTURAS}/chat-celular.png` });

  await page.getByRole("button", { name: "Apagar conversa" }).click();
  await page.getByRole("button", { name: "Apagar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByText("Suas conversas aparecem aqui.")).toBeVisible();
});

test("falha do agente mostra o aviso e a pergunta pode ser refeita", async ({ browser }) => {
  const email = `erro-${sufixo}@exemplo.test`;
  const pagina = await (await browser.newContext()).newPage();
  await cadastrar(pagina, { nome: "Teste de Erro", email });
  sql(`update app.usuario set status = 'ativo' where email = '${email}'`);
  await pagina.goto("/");
  await pagina.getByLabel("Sua pergunta").fill("Teste de falha #erro");
  await pagina.getByRole("button", { name: "Enviar" }).click();
  const aviso = pagina.locator("article [role=alert]");
  await expect(aviso).toContainText("instabilidade", { timeout: 30_000 });
  await pagina.waitForURL(/\/c\//);
  await pagina.reload(); // a resposta gravada com erro mostra o aviso padrão, não o detalhe técnico
  await expect(aviso).toContainText("instabilidade");
  await expect(pagina.getByText("erro simulado")).toHaveCount(0);
  await aviso.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(pagina.locator("article").last()).toContainText("instabilidade", { timeout: 30_000 });
});

test("telas de entrada no computador e no celular", async ({ browser }) => {
  mkdirSync(CAPTURAS, { recursive: true });
  for (const [nome, opcoes] of [["computador", {}], ["celular", devices["Pixel 7"]]] as const) {
    const pagina = await (await browser.newContext(opcoes)).newPage();
    await pagina.goto("/entrar");
    await expect(pagina.getByRole("img", { name: /De cada 100 jovens/ })).toBeVisible();
    await pagina.waitForTimeout(1200); // termina a entrada dos pontos
    await pagina.screenshot({ path: `${CAPTURAS}/entrar-${nome}.png`, fullPage: true });
    await pagina.goto("/cadastro");
    await pagina.screenshot({ path: `${CAPTURAS}/cadastro-${nome}.png`, fullPage: true });
  }
});
