"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { excluirConta } from "./acoes";

export function ExcluirConta() {
  const [erro, acao, pendente] = useActionState(excluirConta, null);
  return (
    <form action={acao} className="flex flex-col gap-4">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Campo rotulo="Para confirmar, digite EXCLUIR" id="confirmacao">
        <Entrada id="confirmacao" name="confirmacao" autoComplete="off" className="max-w-xs" />
      </Campo>
      <Botao type="submit" variante="perigo" disabled={pendente} className="self-start">
        {pendente ? "Excluindo…" : "Excluir minha conta"}
      </Botao>
    </form>
  );
}
