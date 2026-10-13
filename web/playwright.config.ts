import { defineConfig, devices } from "@playwright/test";

// Pré-requisitos (plano P3, Tarefa 7): Supabase local (supabase start --workdir agente), n8n simulado
// (python -m n8n.simulado, em agente/) e o site (npm run dev). Contas de teste são criadas e apagadas pelo teste.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
