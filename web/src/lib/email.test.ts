import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { VANTAGENS, assinaturaValida, linkDeConfirmacao, montarBoasVindas, montarEmail, type PedidoHook } from "./email";

const SEGREDO = `v1,whsec_${Buffer.from("segredo-de-teste-com-32-bytes!!!").toString("base64")}`;

function assinar(id: string, carimbo: string, corpo: string, segredo = SEGREDO) {
  const chave = Buffer.from(segredo.replace(/^v1,whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", chave).update(`${id}.${carimbo}.${corpo}`).digest("base64")}`;
}

describe("assinaturaValida (Standard Webhooks, como o Supabase Auth assina)", () => {
  const corpo = '{"user":{}}';
  const id = "msg_1";
  const agora = 1_800_000_000_000;
  const carimbo = String(agora / 1000);
  const cabecalhos = (assinatura: string | null, ts = carimbo) => ({ id, timestamp: ts, assinatura });

  it("aceita a assinatura certa", () => {
    expect(assinaturaValida(SEGREDO, cabecalhos(assinar(id, carimbo, corpo)), corpo, agora)).toBe(true);
  });
  it("aceita quando uma de várias assinaturas confere", () => {
    const varias = `v1,AAAA ${assinar(id, carimbo, corpo)}`;
    expect(assinaturaValida(SEGREDO, cabecalhos(varias), corpo, agora)).toBe(true);
  });
  it("recusa corpo alterado", () => {
    expect(assinaturaValida(SEGREDO, cabecalhos(assinar(id, carimbo, corpo)), '{"user":{"x":1}}', agora)).toBe(false);
  });
  it("recusa outro segredo", () => {
    const outro = `v1,whsec_${Buffer.from("outro-segredo").toString("base64")}`;
    expect(assinaturaValida(SEGREDO, cabecalhos(assinar(id, carimbo, corpo, outro)), corpo, agora)).toBe(false);
  });
  it("recusa carimbo com mais de 5 minutos", () => {
    const velho = String(agora / 1000 - 301);
    expect(assinaturaValida(SEGREDO, cabecalhos(assinar(id, velho, corpo), velho), corpo, agora)).toBe(false);
  });
  it("recusa sem cabeçalho ou sem segredo configurado", () => {
    expect(assinaturaValida(SEGREDO, cabecalhos(null), corpo, agora)).toBe(false);
    expect(assinaturaValida("", cabecalhos(assinar(id, carimbo, corpo)), corpo, agora)).toBe(false);
  });
});

describe("linkDeConfirmacao", () => {
  it("leva o token ao /auth/confirmar e mantém a próxima página pedida pelo site", () => {
    const link = new URL(
      linkDeConfirmacao("https://iiec.educacional.ia.br/auth/confirmar?proxima=/aguardando", "abc", "signup"),
    );
    expect(link.origin + link.pathname).toBe("https://iiec.educacional.ia.br/auth/confirmar");
    expect(link.searchParams.get("token_hash")).toBe("abc");
    expect(link.searchParams.get("type")).toBe("signup");
    expect(link.searchParams.get("proxima")).toBe("/aguardando");
  });
  it("usa a próxima página padrão do tipo quando o retorno é só o endereço do site", () => {
    const link = new URL(linkDeConfirmacao("https://iiec.educacional.ia.br", "abc", "recovery"));
    expect(link.pathname).toBe("/auth/confirmar");
    expect(link.searchParams.get("proxima")).toBe("/nova-senha");
  });
});

describe("montarEmail", () => {
  const pedido = (tipo: string, nome = "<b>Maria</b> Silva"): PedidoHook => ({
    user: { email: "gestora@exemplo.gov.br", user_metadata: { nome } },
    email_data: {
      token_hash: "abc",
      redirect_to: "https://iiec.educacional.ia.br/auth/confirmar?proxima=/aguardando",
      email_action_type: tipo,
    },
  });

  it("confirmação de cadastro em português, com o link e o nome escapado", () => {
    const email = montarEmail(pedido("signup"))!;
    expect(email.para).toBe("gestora@exemplo.gov.br");
    expect(email.assunto).toBe("Confirme seu e-mail no IIE Conselheiro");
    expect(email.html).toContain("token_hash=abc");
    expect(email.html).toContain("Olá, &lt;b&gt;Maria&lt;/b&gt;.");
    expect(email.html).not.toContain("<b>Maria</b>");
    expect(email.texto).toContain(
      linkDeConfirmacao("https://iiec.educacional.ia.br/auth/confirmar?proxima=/aguardando", "abc", "signup"),
    );
  });
  it("nova senha manda o código de 6 dígitos, sem link, e avisa a validade", () => {
    const base = pedido("recovery");
    const email = montarEmail({ ...base, email_data: { ...base.email_data, token: "482913" } })!;
    expect(email.assunto).toBe("Seu código para criar uma nova senha no IIE Conselheiro");
    expect(email.texto).toContain("Seu código: 482913");
    expect(email.html).toContain(">482913</span>");
    expect(email.html).not.toContain("token_hash=");
    expect(email.texto).toContain("1 hora");
  });
  it("sem nome no cadastro, cumprimenta sem nome", () => {
    expect(montarEmail(pedido("signup", ""))!.texto).toMatch(/^Olá\./);
  });
  it("tipo sem modelo (troca de e-mail) devolve null", () => {
    expect(montarEmail(pedido("email_change"))).toBeNull();
  });
});

describe("montarBoasVindas", () => {
  const email = montarBoasVindas({ para: "gestora@exemplo.gov.br", nome: "<b>Maria</b> Silva", site: "https://iiec.educacional.ia.br" });
  it("avisa que a conta foi criada e já pode ser acessada, com o link do chat", () => {
    expect(email.assunto).toBe("Sua conta no IIE Conselheiro está pronta");
    expect(email.texto).toMatch(/^Olá, <b>Maria<\/b>\./);
    expect(email.texto).toContain("foi criada e já pode ser acessada");
    expect(email.html).toContain('href="https://iiec.educacional.ia.br/"');
    expect(email.html).toContain("Olá, &lt;b&gt;Maria&lt;/b&gt;.");
  });
  it("traz as três vantagens e o rodapé de autoria", () => {
    expect(VANTAGENS).toHaveLength(3);
    for (const v of VANTAGENS) expect(email.texto).toContain(v);
    expect(email.html).toContain("Educacional.ia - Roberto Alves");
    expect(email.texto).toContain("contato@educacional.ia.br");
  });
});
