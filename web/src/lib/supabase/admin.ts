import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./banco";

/**
 * Cliente com a chave de serviço, só no servidor: exclui a própria conta (proposta 03, seção 6.3) e, na recuperação
 * de senha, confere se o e-mail tem conta e pede o código ao Auth.
 */
export function criarClienteAdmin() {
  return createClient<Database, "app">(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "app" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
