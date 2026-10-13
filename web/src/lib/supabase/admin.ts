import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente com a chave de serviço. Só no servidor e só para excluir a própria conta (proposta 03, seção 6.3). */
export function criarClienteAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
