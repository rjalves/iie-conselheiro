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

export type ResultadoEstados = { ok: true } | { ok: false; erro: string } | null;

/** Salva os estados liberados de um usuário. O banco normaliza e recusa lista vazia ou sigla inválida (0006). */
export async function salvarEstados(_anterior: ResultadoEstados, formData: FormData): Promise<ResultadoEstados> {
  const admin = await obterUsuario();
  if (admin?.papel !== "admin" || admin.status !== "ativo") return { ok: false, erro: "Só administradores mudam os estados." };
  const id = String(formData.get("id") ?? "");
  const ufs = formData.getAll("uf").map(String);
  if (ufs.length === 0) return { ok: false, erro: "Libere ao menos um estado." };
  const supabase = await criarClienteServidor();
  const { error, count } = await supabase.from("usuario").update({ ufs_acesso: ufs }, { count: "exact" }).eq("id", id);
  if (error || count !== 1) return { ok: false, erro: "Não foi possível salvar os estados. Tente de novo." };
  revalidatePath("/admin");
  return { ok: true };
}
