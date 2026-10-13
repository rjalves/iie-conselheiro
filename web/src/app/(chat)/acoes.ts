"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Apaga a conversa do usuário (RLS). Mensagens e memória do agente saem junto (P1, migração 0004). */
export async function apagarConversa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await criarClienteServidor();
  await supabase.from("conversa").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/");
}
