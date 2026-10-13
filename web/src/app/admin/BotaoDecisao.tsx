"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { decidirCadastro } from "./acoes";

const ROTULOS = {
  ativo: { acao: "Aprovar", confirmar: null },
  recusado: { acao: "Recusar", confirmar: "Confirmar recusa" },
  bloqueado: { acao: "Bloquear", confirmar: "Confirmar bloqueio" },
} as const;

function Enviar({ children, perigo }: { children: string; perigo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
        perigo ? "bg-erro text-white" : "bg-tinta text-white hover:bg-tinta-escura"
      }`}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

/** Aprovar é direto; recusar e bloquear pedem uma segunda confirmação. */
export function BotaoDecisao({ id, status, nome }: { id: string; status: keyof typeof ROTULOS; nome: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const { acao, confirmar } = ROTULOS[status];
  if (confirmar && !confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label={`${acao} ${nome}`}
        className="rounded-md border border-linha px-3 py-1.5 text-sm font-semibold text-grafite hover:border-erro hover:text-erro"
      >
        {acao}
      </button>
    );
  }
  return (
    <form action={decidirCadastro} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Enviar perigo={Boolean(confirmar)}>{confirmar ?? acao}</Enviar>
      {confirmando && (
        <button type="button" onClick={() => setConfirmando(false)} className="text-sm underline">
          Cancelar
        </button>
      )}
    </form>
  );
}
