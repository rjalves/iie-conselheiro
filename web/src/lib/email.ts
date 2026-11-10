// E-mails da plataforma, enviados pela API do Resend com o domínio iiec.educacional.ia.br.
// O Supabase Auth não envia nada: ele chama /api/auth/email (Send Email Hook), com o pedido assinado no padrão
// Standard Webhooks, sempre que precisa de um e-mail (confirmação de cadastro, nova senha, convite, link de acesso).
import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCIA_MS = 5 * 60 * 1000;

/** Confere a assinatura do Auth (cabeçalhos webhook-id, webhook-timestamp e webhook-signature). */
export function assinaturaValida(
  segredo: string,
  cabecalhos: { id: string | null; timestamp: string | null; assinatura: string | null },
  corpo: string,
  agora = Date.now(),
): boolean {
  const { id, timestamp, assinatura } = cabecalhos;
  if (!segredo || !id || !timestamp || !assinatura) return false;
  if (!(Math.abs(agora - Number(timestamp) * 1000) <= TOLERANCIA_MS)) return false;
  const chave = Buffer.from(segredo.replace(/^v1,whsec_/, ""), "base64");
  const esperada = createHmac("sha256", chave).update(`${id}.${timestamp}.${corpo}`).digest();
  return assinatura.split(" ").some((parte) => {
    const [versao, valor = ""] = parte.split(",");
    const recebida = Buffer.from(valor, "base64");
    return versao === "v1" && recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
  });
}

type Modelo = { assunto: string; titulo: string; texto: string; botao: string; proxima: string };

const MODELOS: Record<string, Modelo> = {
  signup: {
    assunto: "Confirme seu e-mail no IIE Conselheiro",
    titulo: "Confirme seu e-mail",
    texto:
      "Recebemos seu cadastro no IIE Conselheiro. Confirme seu e-mail pelo botão abaixo. Depois, a equipe do IIE " +
      "analisa o cadastro e libera o seu acesso. O link vale por 1 hora.",
    botao: "Confirmar e-mail",
    proxima: "/aguardando",
  },
  recovery: {
    assunto: "Crie uma nova senha no IIE Conselheiro",
    titulo: "Crie uma nova senha",
    texto: "Recebemos um pedido para criar uma nova senha na sua conta do IIE Conselheiro. O link vale por 1 hora.",
    botao: "Criar nova senha",
    proxima: "/nova-senha",
  },
  invite: {
    assunto: "Convite para o IIE Conselheiro",
    titulo: "Você recebeu um convite",
    texto: "A equipe do IIE convidou você para usar o IIE Conselheiro. Aceite o convite e crie sua senha pelo botão abaixo.",
    botao: "Aceitar convite",
    proxima: "/nova-senha",
  },
  magiclink: {
    assunto: "Seu link de acesso ao IIE Conselheiro",
    titulo: "Entrar no IIE Conselheiro",
    texto: "Use o botão abaixo para entrar no IIE Conselheiro. O link vale por 1 hora e só funciona uma vez.",
    botao: "Entrar",
    proxima: "/",
  },
};

/** Link para o /auth/confirmar do site, que troca o token por sessão e segue para a próxima página. */
export function linkDeConfirmacao(redirectTo: string, tokenHash: string, tipo: string): string {
  const retorno = new URL(redirectTo); // o Auth já conferiu o endereço com a lista de retornos permitidos
  const link = new URL("/auth/confirmar", retorno.origin);
  const pedida = retorno.pathname === "/auth/confirmar" ? retorno.searchParams.get("proxima") : null;
  link.searchParams.set("token_hash", tokenHash);
  link.searchParams.set("type", tipo);
  link.searchParams.set("proxima", pedida ?? MODELOS[tipo]?.proxima ?? "/");
  return link.toString();
}

export type PedidoHook = {
  user: { email: string; user_metadata?: { nome?: string } };
  email_data: { token_hash: string; redirect_to: string; email_action_type: string };
};

export type Email = { para: string; assunto: string; html: string; texto: string };

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Monta o e-mail em português; devolve null para tipos sem modelo (troca de e-mail não existe no site). */
export function montarEmail({ user, email_data: dados }: PedidoHook): Email | null {
  const modelo = MODELOS[dados.email_action_type];
  if (!modelo) return null;
  const link = linkDeConfirmacao(dados.redirect_to, dados.token_hash, dados.email_action_type);
  const nome = user.user_metadata?.nome?.trim().split(/\s+/)[0] ?? "";
  const ola = nome ? `Olá, ${nome}.` : "Olá.";
  const ignorar = "Se você não fez este pedido, ignore esta mensagem.";
  const texto = `${ola}\n\n${modelo.texto}\n\n${modelo.botao}: ${link}\n\n${ignorar}\n\nIIE Conselheiro · Educacional.ia - Roberto Alves`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#1e2228">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde1e8;border-radius:8px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:bold;color:#1d3a8a">IIE Conselheiro</p>
<h1 style="margin:0 0 16px;font-size:22px">${escapar(modelo.titulo)}</h1>
<p style="margin:0 0 16px;line-height:1.5">${escapar(ola)}</p>
<p style="margin:0 0 24px;line-height:1.5">${escapar(modelo.texto)}</p>
<p style="margin:0 0 24px"><a href="${escapar(link)}" style="display:inline-block;background:#1d3a8a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">${escapar(modelo.botao)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#5a6170;line-height:1.5">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${escapar(link)}" style="color:#1d3a8a;word-break:break-all">${escapar(link)}</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#5a6170">${escapar(ignorar)}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#5a6170">IIE Conselheiro · Educacional.ia - Roberto Alves</p>
</td></tr></table></body></html>`;
  return { para: user.email, assunto: modelo.assunto, html, texto };
}

/** Envia pela API do Resend. A chave de idempotência evita e-mail repetido quando o Auth tenta de novo. */
export async function enviarPorResend(email: Email, idempotencia: string): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) throw new Error("RESEND_API_KEY não configurada");
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", "Idempotency-Key": idempotencia },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || "IIE Conselheiro <nao-responda@iiec.educacional.ia.br>",
      to: [email.para],
      subject: email.assunto,
      html: email.html,
      text: email.texto,
    }),
    signal: AbortSignal.timeout(4000), // o Auth espera pouco pelo hook
  });
  if (!resposta.ok) throw new Error(`Resend ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
}
