// E-mails da plataforma, enviados pela API do Resend com o domínio iiec.educacional.ia.br.
// O Supabase Auth não envia nada: ele chama /api/auth/email (Send Email Hook), com o pedido assinado no padrão
// Standard Webhooks, sempre que precisa de um e-mail (confirmação de cadastro, nova senha, convite, link de acesso).
// As boas-vindas depois do cadastro saem pela rota /api/boas-vindas, que o próprio site chama.
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

type Modelo = { assunto: string; titulo: string; texto: string; botao: string; proxima: string; vantagens?: true };

/** As três vantagens do IIE Conselheiro para a gestão da educação (projeto/visao_de_negocio.md, seções 3 e 4). */
export const VANTAGENS = [
  "Mostra onde a geração se perde no seu estado (evasão, atraso escolar ou aprendizagem), com um semáforo para cada indicador.",
  "Aponta onde agir primeiro, pelo ganho potencial de cada componente do índice.",
  "Sugere práticas de gestão com fonte e indica o que acompanhar enquanto o resultado não aparece no IIE.",
];

const MODELOS: Record<string, Modelo> = {
  // Só é usado se a confirmação de e-mail for ligada no Auth; hoje o cadastro entra direto e recebe as boas-vindas.
  signup: {
    assunto: "Confirme seu e-mail no IIE Conselheiro",
    titulo: "Confirme seu e-mail",
    texto:
      "Sua conta no IIE Conselheiro foi criada. Confirme seu e-mail pelo botão abaixo e comece a conversar. " +
      "O link vale por 1 hora.",
    botao: "Confirmar e-mail",
    proxima: "/",
    vantagens: true,
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

const saudacao = (nome?: string) => {
  const primeiro = nome?.trim().split(/\s+/)[0];
  return primeiro ? `Olá, ${primeiro}.` : "Olá.";
};

type Conteudo = {
  para: string;
  assunto: string;
  titulo: string;
  ola: string;
  texto: string;
  vantagens?: boolean;
  botao: string;
  link: string;
  nota: string;
};

const TITULO_VANTAGENS = "O que o IIE Conselheiro faz pela gestão da educação";

/**
 * Todos os e-mails na identidade do site: fundo azul-claro, cartão branco, faixa azul-escura com a marca e o ponto
 * de marca-texto, botão azul e o rodapé de autoria. Tabelas e estilos em linha, como os clientes de e-mail pedem.
 */
function montar(c: Conteudo): Email {
  const e = escapar;
  const ponto = (tamanho: number) =>
    `<span style="display:inline-block;width:${tamanho}px;height:${tamanho}px;border-radius:${tamanho}px;background:#ffe066"></span>`;
  const vantagens = c.vantagens
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#e8edf8;border-radius:12px">
<tr><td style="padding:20px 24px 6px;font-size:15px;font-weight:bold;color:#152b66">${e(TITULO_VANTAGENS)}</td></tr>
${VANTAGENS.map(
  (v) => `<tr><td style="padding:8px 24px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="top" style="padding:6px 12px 0 0;line-height:0"><span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#ffe066;border:1px solid #d4b106"></span></td>
<td style="font-size:15px;line-height:1.5;color:#1e2228">${e(v)}</td></tr></table></td></tr>`,
).join("\n")}
<tr><td style="height:14px;line-height:14px;font-size:0">&nbsp;</td></tr>
</table>`
    : "";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><title>${e(c.assunto)}</title></head>
<body style="margin:0;padding:0;background:#e8edf8;font-family:Arial,Helvetica,sans-serif;color:#1e2228">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf8"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px">
<tr><td style="padding:8px 8px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#152b66;border-radius:14px"><tr><td style="padding:28px 32px 32px">
<p style="margin:0;font-size:16px;font-weight:bold;color:#ffffff">${ponto(10)}&nbsp;&nbsp;IIE Conselheiro</p>
<h1 style="margin:20px 0 0;font-size:26px;line-height:1.25;font-weight:bold;color:#ffffff">${e(c.titulo)}</h1>
</td></tr></table>
</td></tr>
<tr><td style="padding:28px 32px 36px">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55">${e(c.ola)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.55">${e(c.texto)}</p>
${vantagens}
<p style="margin:0 0 24px"><a href="${e(c.link)}" style="display:inline-block;background:#1d3a8a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 24px;border-radius:8px">${e(c.botao)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#5a6170;line-height:1.5">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${e(c.link)}" style="color:#1d3a8a;word-break:break-all">${e(c.link)}</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#5a6170;line-height:1.5">${e(c.nota)}</p>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#5a6170">Criação e Desenvolvimento: Educacional.ia - Roberto Alves<br>Todos os direitos reservados - <a href="mailto:contato@educacional.ia.br" style="color:#5a6170">contato@educacional.ia.br</a></p>
</td></tr></table></body></html>`;
  const lista = c.vantagens ? `${TITULO_VANTAGENS}:\n${VANTAGENS.map((v) => `- ${v}`).join("\n")}\n\n` : "";
  const texto =
    `${c.ola}\n\n${c.texto}\n\n${lista}${c.botao}: ${c.link}\n\n${c.nota}\n\n` +
    "IIE Conselheiro\nCriação e Desenvolvimento: Educacional.ia - Roberto Alves\n" +
    "Todos os direitos reservados - contato@educacional.ia.br";
  return { para: c.para, assunto: c.assunto, html, texto };
}

/** Monta o e-mail em português; devolve null para tipos sem modelo (troca de e-mail não existe no site). */
export function montarEmail({ user, email_data: dados }: PedidoHook): Email | null {
  const modelo = MODELOS[dados.email_action_type];
  if (!modelo) return null;
  return montar({
    ...modelo,
    para: user.email,
    ola: saudacao(user.user_metadata?.nome),
    vantagens: modelo.vantagens,
    link: linkDeConfirmacao(dados.redirect_to, dados.token_hash, dados.email_action_type),
    nota: "Se você não fez este pedido, ignore esta mensagem.",
  });
}

/** Boas-vindas logo depois do cadastro: a conta já está ativa e o botão leva direto ao chat. */
export function montarBoasVindas({ para, nome, site }: { para: string; nome?: string; site: string }): Email {
  return montar({
    para,
    assunto: "Sua conta no IIE Conselheiro está pronta",
    titulo: "Sua conta está pronta",
    ola: saudacao(nome),
    texto:
      "Sua conta no IIE Conselheiro foi criada e já pode ser acessada. Para entrar, use o e-mail e a senha que " +
      "você cadastrou.",
    vantagens: true,
    botao: "Acessar o IIE Conselheiro",
    link: new URL("/", site).toString(),
    nota: "Você recebeu este e-mail porque criou uma conta no IIE Conselheiro com este endereço.",
  });
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
