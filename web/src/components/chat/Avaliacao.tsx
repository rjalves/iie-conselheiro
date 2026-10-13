"use client";

import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

/** 👍/👎 em cada resposta (app.feedback, RLS). No 👎, o motivo é opcional. */
export function Avaliacao({
  mensagemId,
  usuarioId,
  notaInicial,
}: {
  mensagemId: string;
  usuarioId: string;
  notaInicial: 1 | -1 | null;
}) {
  const [nota, setNota] = useState(notaInicial);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [recado, setRecado] = useState<string | null>(null);

  async function salvar(novaNota: 1 | -1, novoMotivo: string | null) {
    const supabase = criarClienteNavegador();
    const registro = { mensagem_id: mensagemId, usuario_id: usuarioId, nota: novaNota, motivo: novoMotivo };
    // Insere; se a resposta já foi avaliada, atualiza (o usuário só pode mudar nota e motivo).
    let { error } = await supabase.from("feedback").insert(registro);
    if (error?.code === "23505") {
      ({ error } = await supabase
        .from("feedback")
        .update({ nota: novaNota, motivo: novoMotivo })
        .eq("mensagem_id", mensagemId)
        .eq("usuario_id", usuarioId));
    }
    if (error) {
      setRecado("Não foi possível registrar a avaliação. Tente de novo.");
      return false;
    }
    setNota(novaNota);
    return true;
  }

  async function avaliar(novaNota: 1 | -1) {
    setRecado(null);
    if (await salvar(novaNota, null)) {
      setPedirMotivo(novaNota === -1);
      setRecado(novaNota === 1 ? "Obrigado pela avaliação." : null);
    }
  }

  async function enviarMotivo() {
    if (await salvar(-1, motivo.trim().slice(0, 500) || null)) {
      setPedirMotivo(false);
      setRecado("Obrigado. Vamos usar sua resposta para melhorar.");
    }
  }

  const estilo = (ativo: boolean) =>
    `rounded-md border px-2.5 py-1 text-sm ${ativo ? "border-tinta bg-tinta-clara font-semibold text-tinta" : "border-linha text-grafite-suave hover:border-tinta hover:text-tinta"}`;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2" role="group" aria-label="Avaliar esta resposta">
        <button type="button" aria-pressed={nota === 1} onClick={() => avaliar(1)} className={estilo(nota === 1)}>
          👍 Útil
        </button>
        <button type="button" aria-pressed={nota === -1} onClick={() => avaliar(-1)} className={estilo(nota === -1)}>
          👎 Não ajudou
        </button>
        {recado && (
          <span role="status" className="text-sm text-grafite-suave">
            {recado}
          </span>
        )}
      </div>
      {pedirMotivo && (
        <div className="flex max-w-xl flex-col gap-2">
          <label htmlFor={`motivo-${mensagemId}`} className="text-sm font-semibold">
            O que faltou? (opcional)
          </label>
          <textarea
            id={`motivo-${mensagemId}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={500}
            className="rounded-md border border-linha bg-white px-3 py-2"
          />
          <button type="button" onClick={enviarMotivo} className="self-start text-sm font-semibold text-tinta underline">
            Enviar comentário
          </button>
        </div>
      )}
    </div>
  );
}
