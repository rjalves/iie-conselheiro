"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { SENHA_MINIMA, traduzirErroAuth } from "@/lib/cadastro";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export default function PaginaNovaSenha() {
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
      return setErro("O link expirou. Peça um novo link em “Esqueci minha senha”.");
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
    <div className="flex flex-col gap-6">
      <title>Nova senha | IIE Conselheiro</title>
      <h1 className="text-3xl font-bold">Criar nova senha</h1>
      <form onSubmit={salvar} className="flex flex-col gap-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo rotulo="Nova senha" id="senha" ajuda={`Pelo menos ${SENHA_MINIMA} caracteres.`}>
          <Entrada id="senha" name="senha" type="password" autoComplete="new-password" required />
        </Campo>
        <Campo rotulo="Repita a nova senha" id="confirmacao">
          <Entrada id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
        </Campo>
        <Botao type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar nova senha"}
        </Botao>
      </form>
      <Link href="/recuperar-senha" className="text-sm text-tinta underline underline-offset-2">
        Pedir um novo link
      </Link>
    </div>
  );
}
