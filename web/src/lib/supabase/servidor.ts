import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./banco";

/** Cliente com a sessão do usuário (cookies). Lê e grava o esquema app, sempre sob RLS. */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database, "app">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "app" },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component, que não grava cookies: o proxy renova a sessão.
          }
        },
      },
    },
  );
}
