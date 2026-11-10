import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const SEGREDO = `v1,whsec_${Buffer.from("segredo-de-teste-com-32-bytes!!!").toString("base64")}`;
const corpo = JSON.stringify({
  user: { email: "gestora@exemplo.gov.br", user_metadata: { nome: "Maria" } },
  email_data: {
    token_hash: "abc",
    redirect_to: "https://iiec.educacional.ia.br/auth/confirmar?proxima=/aguardando",
    email_action_type: "signup",
  },
});

function pedido(texto = corpo, segredo = SEGREDO) {
  const id = "msg_123";
  const carimbo = String(Math.floor(Date.now() / 1000));
  const chave = Buffer.from(segredo.replace(/^v1,whsec_/, ""), "base64");
  const assinatura = createHmac("sha256", chave).update(`${id}.${carimbo}.${texto}`).digest("base64");
  return new Request("http://site/api/auth/email", {
    method: "POST",
    headers: { "webhook-id": id, "webhook-timestamp": carimbo, "webhook-signature": `v1,${assinatura}` },
    body: texto,
  });
}

describe("POST /api/auth/email (Send Email Hook do Supabase → Resend)", () => {
  const fetchFalso = vi.fn();
  beforeEach(() => {
    vi.stubEnv("SUPABASE_HOOK_EMAIL_SEGREDO", SEGREDO);
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    vi.stubEnv("EMAIL_REMETENTE", "IIE Conselheiro <nao-responda@iiec.educacional.ia.br>");
    vi.stubGlobal("fetch", fetchFalso);
    fetchFalso.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia pela API do Resend e responde 200 ao Auth", async () => {
    fetchFalso.mockResolvedValue(new Response('{"id":"e1"}', { status: 200 }));
    const resposta = await POST(pedido());
    expect(resposta.status).toBe(200);
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opcoes.headers.Authorization).toBe("Bearer re_teste");
    expect(opcoes.headers["Idempotency-Key"]).toBe("msg_123"); // o Auth pode repetir o pedido
    const enviado = JSON.parse(opcoes.body);
    expect(enviado.from).toBe("IIE Conselheiro <nao-responda@iiec.educacional.ia.br>");
    expect(enviado.to).toEqual(["gestora@exemplo.gov.br"]);
    expect(enviado.subject).toBe("Confirme seu e-mail no IIE Conselheiro");
  });

  it("recusa pedido sem a assinatura do Auth e não envia nada", async () => {
    const outro = `v1,whsec_${Buffer.from("outro").toString("base64")}`;
    const resposta = await POST(pedido(corpo, outro));
    expect(resposta.status).toBe(401);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("falha do Resend vira erro no formato que o Auth repassa", async () => {
    fetchFalso.mockResolvedValue(new Response('{"message":"domain not verified"}', { status: 403 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const resposta = await POST(pedido());
    expect(resposta.status).toBe(502);
    expect(await resposta.json()).toEqual({ error: { http_code: 502, message: "falha ao enviar o e-mail" } });
  });

  it("tipo sem modelo responde 422", async () => {
    const troca = corpo.replace('"signup"', '"email_change"');
    const resposta = await POST(pedido(troca));
    expect(resposta.status).toBe(422);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
