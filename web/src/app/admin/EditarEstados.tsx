"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UFS } from "@/lib/ufs";
import { salvarEstados, type ResultadoEstados } from "./acoes";

/** Janela com as 27 UFs para liberar ou retirar estados de um usuário (acesso por UF). */
export function EditarEstados({ id, nome, ufs }: { id: string; nome: string; ufs: string[] }) {
  const janela = useRef<HTMLDialogElement>(null);
  const [marcadas, setMarcadas] = useState(() => new Set(ufs));
  const [resultado, acao, pendente] = useActionState<ResultadoEstados, FormData>(salvarEstados, null);

  useEffect(() => {
    if (resultado?.ok) janela.current?.close();
  }, [resultado]);

  function abrir() {
    setMarcadas(new Set(ufs));
    janela.current?.showModal();
  }

  function alternar(sigla: string) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(sigla)) nova.delete(sigla);
      else nova.add(sigla);
      return nova;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Editar estados de ${nome}`}
        className="text-sm font-semibold text-tinta underline underline-offset-2"
      >
        Editar
      </button>
      <dialog
        ref={janela}
        aria-labelledby={`titulo-estados-${id}`}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-linha p-0 backdrop:bg-grafite/50"
      >
        <form action={acao} className="flex flex-col gap-5 p-6">
          <input type="hidden" name="id" value={id} />
          <div>
            <h2 id={`titulo-estados-${id}`} className="text-xl font-bold">
              Estados liberados para {nome}
            </h2>
            <p className="mt-1 text-sm text-grafite-suave">
              A pessoa vê os dados do IIE só destes estados. O Brasil e as práticas de gestão ficam sempre liberados.
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">Estados</legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              {UFS.map((uf) => (
                <label key={uf.sigla} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="uf"
                    value={uf.sigla}
                    checked={marcadas.has(uf.sigla)}
                    onChange={() => alternar(uf.sigla)}
                    className="size-4 accent-tinta"
                  />
                  <span>
                    {uf.nome} <span className="text-grafite-suave">({uf.sigla})</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={() => setMarcadas(new Set(UFS.map((u) => u.sigla)))} className="underline">
              Marcar todas
            </button>
            <button type="button" onClick={() => setMarcadas(new Set())} className="underline">
              Desmarcar todas
            </button>
            <span className="numeros text-grafite-suave" aria-live="polite">
              {marcadas.size} de 27 marcadas
            </span>
          </div>
          {resultado && !resultado.ok && (
            <p role="alert" className="font-semibold text-erro">
              {resultado.erro}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => janela.current?.close()} className="rounded-md px-4 py-2 underline">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendente || marcadas.size === 0}
              className="rounded-md bg-tinta px-4 py-2 font-semibold text-white hover:bg-tinta-escura disabled:opacity-50"
            >
              {pendente ? "Salvando…" : "Salvar estados"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
