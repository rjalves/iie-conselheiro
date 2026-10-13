import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./banco";

/** Cliente para componentes do navegador: login, cadastro e avaliação das respostas. */
export function criarClienteNavegador() {
  return createBrowserClient<Database, "app">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "app" } },
  );
}
