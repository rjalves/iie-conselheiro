import { enviarPorResend, montarBoasVindas } from "@/lib/email";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Só logo depois do cadastro; a chave de idempotência do Resend segura repetições do mesmo usuário.
const PRAZO_MS = 15 * 60 * 1000;

/** E-mail de boas-vindas, pedido pelo site assim que o cadastro termina. Vai só para o próprio usuário logado. */
export async function POST(request: Request) {
  const {
    data: { user },
  } = await (await criarClienteServidor()).auth.getUser();
  if (!user?.email) return Response.json({ erro: "sem sessão" }, { status: 401 });
  if (!(Date.now() - Date.parse(user.created_at) <= PRAZO_MS)) {
    return Response.json({ erro: "as boas-vindas só saem logo depois do cadastro" }, { status: 409 });
  }
  // O navegador manda o Origin no POST; request.url traria o endereço interno do contêiner.
  const site = request.headers.get("origin") ?? `https://${request.headers.get("x-forwarded-host") ?? request.headers.get("host")}`;
  try {
    const email = montarBoasVindas({ para: user.email, nome: user.user_metadata?.nome, site });
    await enviarPorResend(email, `boas-vindas-${user.id}`);
  } catch (falha) {
    console.error("boas-vindas: envio pelo Resend falhou", falha);
    return Response.json({ erro: "falha ao enviar o e-mail" }, { status: 502 });
  }
  return new Response(null, { status: 204 });
}
