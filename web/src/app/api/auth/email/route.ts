import { assinaturaValida, enviarPorResend, montarEmail, type PedidoHook } from "@/lib/email";

/**
 * Send Email Hook do Supabase Auth: o Auth chama esta rota em vez de enviar e-mail por SMTP.
 * Responde {} quando o Resend aceitou o envio; nos erros, usa o formato que o Auth repassa ao site.
 */
export async function POST(request: Request) {
  const corpo = await request.text();
  const h = request.headers;
  const cabecalhos = { id: h.get("webhook-id"), timestamp: h.get("webhook-timestamp"), assinatura: h.get("webhook-signature") };
  if (!assinaturaValida(process.env.SUPABASE_HOOK_EMAIL_SEGREDO ?? "", cabecalhos, corpo)) {
    return erro(401, "assinatura inválida");
  }

  let email;
  try {
    email = montarEmail(JSON.parse(corpo) as PedidoHook);
  } catch {
    return erro(400, "pedido inválido");
  }
  if (!email) return erro(422, "tipo de e-mail sem modelo");

  try {
    await enviarPorResend(email, cabecalhos.id!);
  } catch (falha) {
    console.error("email: envio pelo Resend falhou", falha);
    return erro(502, "falha ao enviar o e-mail");
  }
  return Response.json({});
}

function erro(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status });
}
