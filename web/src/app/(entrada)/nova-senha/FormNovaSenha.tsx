"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EntradaSenha } from "@/components/EntradaSenha";
import { Aviso, Botao, Campo } from "@/components/ui";
import { SENHA_MINIMA, traduzirErroAuth } from "@/lib/cadastro";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

/** Nova senha com a sessão aberta pelo código (recuperação) ou pelo link (convite). Depois, volta para o Entrar. */
export function FormNovaSenha() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const senha = String(dados.get("senha") ?? "");
    if (senha.length < SENHA_MINIMA) return setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    if (senha !== String(dados.get("confirmacao") ?? "")) return setErro("As duas senhas não são iguais.");
    setEnviando(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setEnviando(false);
      return setErro("O prazo para criar a senha acabou. Peça um novo código em “Esqueci minha senha”.");
    }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setEnviando(false);
      return setErro(traduzirErroAuth(error.message));
    }
    await supabase.auth.signOut();
    router.replace("/entrar?senha=alterada");
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5" noValidate>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Campo rotulo="Nova senha" id="senha" ajuda={`Pelo menos ${SENHA_MINIMA} caracteres.`}>
        <EntradaSenha id="senha" name="senha" autoComplete="new-password" aria-describedby="senha-ajuda" required />
      </Campo>
      <Campo rotulo="Repita a nova senha" id="confirmacao">
        <EntradaSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required />
      </Campo>
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
