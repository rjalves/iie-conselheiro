import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/sessao";

// Rotas abertas sem login. O resto exige sessão; o status (ativo, pendente…) é conferido nas páginas.
const PUBLICAS = ["/entrar", "/cadastro", "/recuperar-senha", "/nova-senha", "/termo", "/auth", "/inicio"];

export async function proxy(request: NextRequest) {
  const { resposta, user } = await atualizarSessao(request);
  const caminho = request.nextUrl.pathname;
  if (caminho.startsWith("/api/")) return resposta; // a rota responde 401 em JSON
  // Na raiz, quem não entrou vê a página de apresentação (o endereço continua "/"); quem entrou vai para o chat.
  if (!user && caminho === "/") {
    const inicio = request.nextUrl.clone();
    inicio.pathname = "/inicio";
    return comCookies(resposta, NextResponse.rewrite(inicio));
  }
  const publica = PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
  if (!user && !publica) {
    return redirecionar(request, resposta, `/entrar?proxima=${encodeURIComponent(caminho)}`);
  }
  if (user && (caminho === "/entrar" || caminho === "/cadastro")) return redirecionar(request, resposta, "/");
  return resposta;
}

/** Redireciona sem perder os cookies da sessão renovada. */
function redirecionar(request: NextRequest, resposta: NextResponse, destino: string) {
  return comCookies(resposta, NextResponse.redirect(new URL(destino, request.url)));
}

function comCookies(resposta: NextResponse, nova: NextResponse) {
  resposta.cookies.getAll().forEach((cookie) => nova.cookies.set(cookie));
  return nova;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|municipios/|parceiros/).*)"],
};
