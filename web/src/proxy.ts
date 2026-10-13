import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/sessao";

// Rotas abertas sem login. O resto exige sessão; o status (ativo, pendente…) é conferido nas páginas.
const PUBLICAS = ["/entrar", "/cadastro", "/recuperar-senha", "/nova-senha", "/termo", "/auth"];

export async function proxy(request: NextRequest) {
  const { resposta, user } = await atualizarSessao(request);
  const caminho = request.nextUrl.pathname;
  if (caminho.startsWith("/api/")) return resposta; // a rota responde 401 em JSON
  const publica = PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
  if (!user && !publica) {
    const destino = caminho === "/" ? "/entrar" : `/entrar?proxima=${encodeURIComponent(caminho)}`;
    return redirecionar(request, resposta, destino);
  }
  if (user && (caminho === "/entrar" || caminho === "/cadastro")) return redirecionar(request, resposta, "/");
  return resposta;
}

/** Redireciona sem perder os cookies da sessão renovada. */
function redirecionar(request: NextRequest, resposta: NextResponse, destino: string) {
  const redirecionamento = NextResponse.redirect(new URL(destino, request.url));
  resposta.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  return redirecionamento;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|municipios/).*)"],
};
