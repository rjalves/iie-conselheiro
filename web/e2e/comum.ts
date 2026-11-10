// Funções comuns aos testes ponta a ponta (local e homologação).
import { randomBytes } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";

export const CAPTURAS = process.env.E2E_CAPTURAS ?? "e2e/capturas";
export const sufixo = `${Date.now()}-${randomBytes(3).toString("hex")}`;
export const senha = `Teste-${randomBytes(8).toString("hex")}`; // gerada a cada execução; as contas são apagadas no fim

/** SQL pela rota /pg/query do Supabase (E2E_SUPABASE_URL), porque o Postgres da homologação não fica exposto. */
export async function sql<T = Record<string, unknown>>(consulta: string): Promise<T[]> {
  const chave = process.env.E2E_SERVICE_ROLE_KEY ?? "";
  const r = await fetch(`${process.env.E2E_SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: consulta }),
  });
  if (!r.ok) throw new Error(`SQL falhou (${r.status}): ${await r.text()}`);
  return r.json();
}

export async function cadastrar(page: Page, pessoa: { nome: string; email: string }) {
  await preencherCadastro(page, pessoa);
  await expect(page.getByRole("heading", { name: `Olá, ${pessoa.nome.split(" ")[0]}.` })).toBeVisible();
}

/** Preenche e envia o cadastro (Sobral, CE). Quem chama confere o que aparece depois. */
export async function preencherCadastro(page: Page, pessoa: { nome: string; email: string }) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill(pessoa.nome);
  await page.getByLabel("E-mail").fill(pessoa.email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByLabel("Onde você trabalha").selectOption("secretaria_estadual");
  await page.getByLabel("Instituição").fill("Secretaria da Educação do Ceará");
  await page.getByLabel("Estado").selectOption("CE");
  await expect(page.locator('#lista-municipios option[value="Sobral"]')).toHaveCount(1);
  await page.getByLabel("Município").fill("Sobral");
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}

export async function entrarComo(browser: Browser, email: string, opcoes = {}) {
  const pagina = await (await browser.newContext(opcoes)).newPage();
  await pagina.goto("/entrar");
  await pagina.getByLabel("E-mail").fill(email);
  await pagina.getByLabel("Senha").fill(senha);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  return pagina;
}
