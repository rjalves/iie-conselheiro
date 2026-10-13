import { cache } from "react";
import type { Database } from "./supabase/banco";
import { criarClienteServidor } from "./supabase/servidor";

export type Usuario = Database["app"]["Tables"]["usuario"]["Row"];
export { PERFIS, STATUS, primeiroNome, type Perfil, type Status } from "./rotulos";

/** Usuário logado, com o cadastro de app.usuario. Uma consulta por requisição (React cache). */
export const obterUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("usuario").select("*").eq("id", user.id).maybeSingle();
  return data;
});

