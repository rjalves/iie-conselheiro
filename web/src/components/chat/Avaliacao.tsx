"use client";

import { useState, type MouseEvent } from "react";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

// Ícones no traço da lupa da marca (2 px, pontas redondas).
function Polegar({ paraBaixo = false }: { paraBaixo?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${paraBaixo ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10v11" />
      <path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z" />
    </svg>
  );
}

/**
 * Copia a resposta já formatada (negrito, listas e tabelas) para colar em documentos e relatórios.
 * Sem suporte a HTML na área de transferência, copia o texto puro.
 */
async function copiarResposta(origem: HTMLElement) {
  const resposta = origem.closest("article")?.querySelector<HTMLElement>(".resposta");
  if (!resposta) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([resposta.innerHTML], { type: "text/html" }),
        "text/plain": new Blob([resposta.innerText], { type: "text/plain" }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(resposta.innerText);
  }
  return true;
}

/** Útil / Não ajudou em cada resposta (app.feedback, RLS), mais "Copiar". No "Não ajudou", o motivo é opcional. */
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
  const [copiada, setCopiada] = useState(false);

  async function copiar(evento: MouseEvent<HTMLButtonElement>) {
    if (!(await copiarResposta(evento.currentTarget).catch(() => false))) {
      return setRecado("Não foi possível copiar. Selecione o texto e copie.");
    }
    setCopiada(true);
    setTimeout(() => setCopiada(false), 2500);
  }

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
    `inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-sm ${
      ativo
        ? "border-tinta bg-tinta-clara font-semibold text-tinta"
        : "border-linha bg-white text-grafite-suave hover:border-tinta hover:text-tinta"
    }`;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2" role="group" aria-label="Avaliar esta resposta">
          <button type="button" aria-pressed={nota === 1} onClick={() => avaliar(1)} className={estilo(nota === 1)}>
            <Polegar />
            Útil
          </button>
          <button type="button" aria-pressed={nota === -1} onClick={() => avaliar(-1)} className={estilo(nota === -1)}>
            <Polegar paraBaixo />
            Não ajudou
          </button>
        </div>
        <button type="button" onClick={copiar} className={estilo(false)}>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {copiada ? (
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            ) : (
              <>
                <rect x="8" y="8" width="13" height="13" rx="2" />
                <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
              </>
            )}
          </svg>
          {copiada ? "Copiada" : "Copiar"}
        </button>
        <span role="status" className="text-sm text-grafite-suave">
          {recado}
        </span>
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
          <button
            type="button"
            onClick={enviarMotivo}
            className="self-start rounded-md border border-tinta px-3 py-1.5 text-sm font-semibold text-tinta hover:bg-tinta-clara"
          >
            Enviar comentário
          </button>
        </div>
      )}
    </div>
  );
}
