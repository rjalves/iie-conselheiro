"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EntradaSenha } from "@/components/EntradaSenha";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { traduzirErroAuth } from "@/lib/cadastro";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export function FormEntrar({ proxima }: { proxima: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");
    if (!email || !senha) return setErro("Informe o e-mail e a senha.");
    setEnviando(true);
    setErro(null);
    const { error } = await criarClienteNavegador().auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(traduzirErroAuth(error.message));
      setEnviando(false);
      return;
    }
    router.replace(proxima);
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-5" noValidate>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Campo rotulo="E-mail" id="email">
        <Entrada id="email" name="email" type="email" autoComplete="email" required />
      </Campo>
      <Campo rotulo="Senha" id="senha">
        <EntradaSenha id="senha" name="senha" autoComplete="current-password" required />
      </Campo>
      <Link
        href="/recuperar-senha"
        className="-mt-2 self-end text-sm text-tinta underline underline-offset-2 hover:text-tinta-escura"
      >
        Esqueci minha senha
      </Link>
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
      <p className="mt-2 text-center text-sm">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-tinta underline underline-offset-2 hover:text-tinta-escura">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
