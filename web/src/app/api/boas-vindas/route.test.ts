import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => ({ auth: { getUser } }) }));
const { POST } = await import("./route");

const pedido = () => new Request("http://interno:3000/api/boas-vindas", { method: "POST", headers: { origin: "https://iiec.educacional.ia.br" } });
const usuario = (criadoHa: number) => ({
  data: {
    user: {
      id: "u-1",
      email: "gestora@exemplo.gov.br",
      created_at: new Date(Date.now() - criadoHa).toISOString(),
      user_metadata: { nome: "Maria Silva" },
    },
  },
});

describe("POST /api/boas-vindas", () => {
  const fetchFalso = vi.fn();
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    vi.stubGlobal("fetch", fetchFalso.mockResolvedValue(new Response("{}", { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchFalso.mockReset();
    getUser.mockReset();
  });

  it("sem sessão dá 401 e não envia", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(pedido())).status).toBe(401);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
  it("conta antiga não recebe boas-vindas de novo", async () => {
    getUser.mockResolvedValue(usuario(60 * 60 * 1000));
    expect((await POST(pedido())).status).toBe(409);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
  it("conta nova recebe as boas-vindas, uma vez, com o link do site", async () => {
    getUser.mockResolvedValue(usuario(5_000));
    expect((await POST(pedido())).status).toBe(204);
    const [, opcoes] = fetchFalso.mock.calls[0];
    expect(opcoes.headers["Idempotency-Key"]).toBe("boas-vindas-u-1");
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.to).toEqual(["gestora@exemplo.gov.br"]);
    expect(corpo.subject).toBe("Sua conta no IIE Conselheiro está pronta");
    expect(corpo.text).toContain("Olá, Maria.");
    expect(corpo.text).toContain("já pode ser acessada");
    expect(corpo.text).toContain("Acessar o IIE Conselheiro: https://iiec.educacional.ia.br/");
  });
});
