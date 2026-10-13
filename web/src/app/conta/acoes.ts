"use server";

import { redirect } from "next/navigation";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Exclui a conta do próprio usuário. O banco apaga em cascata cadastro, conversas, mensagens, cota e memória. */
export async function excluirConta(_estado: string | null, formData: FormData): Promise<string | null> {
  if (String(formData.get("confirmacao") ?? "").trim().toUpperCase() !== "EXCLUIR") {
    return "Para confirmar, digite EXCLUIR.";
  }
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { error } = await criarClienteAdmin().auth.admin.deleteUser(user.id);
  if (error) return "Não foi possível excluir a conta agora. Tente de novo em alguns minutos.";
  await supabase.auth.signOut();
  redirect("/entrar?conta=excluida");
}
