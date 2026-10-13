"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { obterUsuario } from "@/lib/usuario";

const DECISOES = ["ativo", "recusado", "bloqueado"] as const;

/** Aprova, recusa ou bloqueia um cadastro. A RLS (P1, 0004) já só deixa administradores mudarem o status. */
export async function decidirCadastro(formData: FormData) {
  const admin = await obterUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof DECISOES)[number];
  if (admin?.papel !== "admin" || admin.status !== "ativo" || !DECISOES.includes(status) || id === admin.id) return;
  const supabase = await criarClienteServidor();
  await supabase.from("usuario").update({ status }).eq("id", id);
  revalidatePath("/admin");
}
