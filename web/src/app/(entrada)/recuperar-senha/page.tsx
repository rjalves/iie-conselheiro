"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { traduzirErroAuth } from "@/lib/cadastro";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export default function PaginaRecuperarSenha() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviarLink(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = String(new FormData(evento.currentTarget).get("email") ?? "").trim();
    setEnviando(true);
    setErro(null);
    const { error } = await criarClienteNavegador().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirmar?proxima=/nova-senha`,
    });
    setEnviando(false);
    if (error) setErro(traduzirErroAuth(error.message));
    else setEnviado(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Recuperar senha | IIE Conselheiro</title>
      <h1 className="text-3xl font-bold">Recuperar senha</h1>
      {enviado ? (
        <Aviso tipo="sucesso">
          Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha. O link vale por 1
          hora.
        </Aviso>
      ) : (
        <form onSubmit={enviarLink} className="flex flex-col gap-5">
          <p className="text-grafite-suave">Informe o e-mail da sua conta. Enviamos um link para criar uma nova senha.</p>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Campo rotulo="E-mail" id="email">
            <Entrada id="email" name="email" type="email" autoComplete="email" required />
          </Campo>
          <Botao type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link"}
          </Botao>
        </form>
      )}
      <Link href="/entrar" className="text-sm text-tinta underline underline-offset-2">
        Voltar para entrar
      </Link>
    </div>
  );
}
