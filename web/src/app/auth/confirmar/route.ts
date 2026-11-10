import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { caminhoSeguro, redirecionarPara } from "@/lib/caminho";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Destino dos links enviados por e-mail (confirmação de cadastro e nova senha): troca o código por sessão. */
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const codigo = parametros.get("code");
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type") as EmailOtpType | null;
  const proxima = caminhoSeguro(parametros.get("proxima"));

  const supabase = await criarClienteServidor();
  let falhou = true;
  if (codigo) {
    falhou = Boolean((await supabase.auth.exchangeCodeForSession(codigo)).error);
  } else if (tokenHash && tipo) {
    falhou = Boolean((await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })).error);
  }
  return redirecionarPara(falhou ? "/entrar?link=invalido" : proxima);
}
