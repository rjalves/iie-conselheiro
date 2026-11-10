"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Marca } from "../Marca";

/** Barra lateral fixa no computador; gaveta no celular, aberta pelo botão "Conversas". */
export function Moldura({ barra, children }: { barra: ReactNode; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const caminho = usePathname();
  const gaveta = useRef<HTMLElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  // Fecha a gaveta ao trocar de conversa.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setAberta(false), [caminho]);

  // Aberta, o foco entra na gaveta; com Esc, ela fecha e o foco volta ao botão "Conversas".
  useEffect(() => {
    if (!aberta) return;
    gaveta.current?.querySelector<HTMLElement>("a, button")?.focus();
    const fechar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberta(false);
      botao.current?.focus();
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberta]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Fechada no celular, fica invisível: some também da ordem do Tab e do leitor de tela. */}
      <aside
        ref={gaveta}
        id="barra-conversas"
        aria-label="Conversas"
        className={`fixed inset-y-0 left-0 z-30 w-[18rem] max-w-[85vw] transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none md:visible md:static md:translate-x-0 ${
          aberta ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        {barra}
      </aside>
      {aberta && (
        <button
          type="button"
          aria-label="Fechar a lista de conversas"
          className="fixed inset-0 z-20 bg-grafite/40 md:hidden"
          onClick={() => {
            setAberta(false);
            botao.current?.focus();
          }}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-linha bg-white px-4 py-2.5 md:hidden">
          <Marca />
          <button
            ref={botao}
            type="button"
            aria-expanded={aberta}
            aria-controls="barra-conversas"
            onClick={() => setAberta(true)}
            className="rounded-md border border-linha px-3 py-1.5 font-semibold text-tinta hover:border-tinta hover:bg-tinta-clara"
          >
            Conversas
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
