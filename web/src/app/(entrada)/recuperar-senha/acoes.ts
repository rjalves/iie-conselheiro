"use server";

import { traduzirErroAuth } from "@/lib/cadastro";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Passo 1 da recuperação: confere se há conta com o e-mail e pede ao Auth um código de 6 dígitos.
 * O Auth chama o hook /api/auth/email, que manda o código pelo Resend.
 * ponytail: dizer que o e-mail não existe permite descobrir quem tem conta; foi pedido assim. O Auth já limita os envios.
 */
export async function pedirCodigo(email: string): Promise<{ erro: string } | { ok: true }> {
  const endereco = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return { erro: "Informe um e-mail válido." };

  const admin = criarClienteAdmin();
  const { data: conta, error } = await admin.from("usuario").select("id").eq("email", endereco).maybeSingle();
  if (error) {
    console.error("recuperar-senha: consulta da conta falhou", error.message);
    return { erro: traduzirErroAuth(error.message) };
  }
  if (!conta) return { erro: "Não encontramos uma conta com este e-mail. Confira o endereço ou crie uma conta." };

  const { error: falha } = await admin.auth.resetPasswordForEmail(endereco);
  if (falha) {
    console.error("recuperar-senha: pedido do código falhou", falha.message);
    return { erro: traduzirErroAuth(falha.message) };
  }
  return { ok: true };
}
