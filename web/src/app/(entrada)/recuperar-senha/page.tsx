"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { traduzirErroAuth } from "@/lib/cadastro";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { FormNovaSenha } from "../nova-senha/FormNovaSenha";
import { pedirCodigo } from "./acoes";

type Etapa = "email" | "codigo" | "senha";

const TEXTOS: Record<Etapa, string> = {
  email: "Informe o e-mail da sua conta. Enviamos um código de 6 dígitos para você criar uma nova senha.",
  codigo: "",
  senha: "Código confirmado. Agora crie a nova senha de acesso.",
};

/**
 * Recuperação em três passos: e-mail → código de 6 dígitos enviado por e-mail → nova senha.
 * O código é conferido no navegador (verifyOtp), que abre a sessão usada para gravar a senha.
 */
export default function PaginaRecuperarSenha() {
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviarCodigo(endereco: string) {
    setEnviando(true);
    setErro(null);
    setRecado(null);
    const resultado = await pedirCodigo(endereco).catch(() => ({ erro: traduzirErroAuth("") }));
    setEnviando(false);
    if ("erro" in resultado) return setErro(resultado.erro);
    setEmail(endereco.trim().toLowerCase());
    setEtapa("codigo");
    return true;
  }

  async function aoEnviarEmail(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    await enviarCodigo(String(new FormData(evento.currentTarget).get("email") ?? ""));
  }

  async function aoConfirmarCodigo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const codigo = String(new FormData(evento.currentTarget).get("codigo") ?? "").replace(/\D/g, "");
    if (codigo.length !== 6) return setErro("O código tem 6 dígitos. Confira o e-mail que enviamos.");
    setEnviando(true);
    setErro(null);
    setRecado(null);
    const { error } = await criarClienteNavegador().auth.verifyOtp({ email, token: codigo, type: "recovery" });
    setEnviando(false);
    if (error) return setErro(traduzirErroAuth(error.message));
    setEtapa("senha");
  }

  async function reenviar() {
    if (await enviarCodigo(email)) setRecado("Enviamos um novo código. Use o mais recente.");
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Recuperar senha | IIE Conselheiro</title>
      <div>
        <h1 className="text-3xl font-bold">{etapa === "senha" ? "Criar nova senha" : "Recuperar senha"}</h1>
        <p className="mt-2 text-grafite-suave">
          {etapa === "codigo" ? (
            <>
              Enviamos um código de 6 dígitos para <strong className="font-semibold text-grafite">{email}</strong>. Ele
              vale por 1 hora.
            </>
          ) : (
            TEXTOS[etapa]
          )}
        </p>
      </div>

      {etapa === "email" && (
        <form onSubmit={aoEnviarEmail} className="flex flex-col gap-5" noValidate>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Campo rotulo="E-mail" id="email">
            <Entrada id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
          </Campo>
          <Botao type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar código"}
          </Botao>
        </form>
      )}

      {etapa === "codigo" && (
        <form onSubmit={aoConfirmarCodigo} className="flex flex-col gap-5" noValidate>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {recado && <Aviso tipo="sucesso">{recado}</Aviso>}
          <Campo rotulo="Código" id="codigo" ajuda="Confira também a caixa de spam.">
            <Entrada
              id="codigo"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              aria-describedby="codigo-ajuda"
              autoFocus
              required
              className="numeros text-2xl tracking-[0.4em]"
            />
          </Campo>
          <Botao type="submit" disabled={enviando}>
            {enviando ? "Confirmando…" : "Confirmar código"}
          </Botao>
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={reenviar}
              disabled={enviando}
              className="text-tinta underline underline-offset-2 hover:text-tinta-escura disabled:opacity-60"
            >
              Reenviar código
            </button>
            <button
              type="button"
              onClick={() => {
                setErro(null);
                setRecado(null);
                setEtapa("email");
              }}
              className="text-tinta underline underline-offset-2 hover:text-tinta-escura"
            >
              Usar outro e-mail
            </button>
          </div>
        </form>
      )}

      {etapa === "senha" && <FormNovaSenha />}

      <Link href="/entrar" className="text-sm text-tinta underline underline-offset-2 hover:text-tinta-escura">
        Voltar para entrar
      </Link>
    </div>
  );
}
