"use client";

import { useEffect } from "react";
import { Marca } from "@/components/Marca";
import { Botao } from "@/components/ui";

/** Erro inesperado numa tela: explica em português e deixa tentar de novo sem perder a sessão. */
export default function ErroNaTela({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <>
      <title>Algo deu errado | IIE Conselheiro</title>
      <header className="border-b border-linha bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <Marca />
        </div>
      </header>
      <main className="mx-auto flex max-w-xl flex-col items-start gap-5 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Algo deu errado nesta tela</h1>
        <p className="text-lg">
          Não foi possível carregar agora. Tente de novo em instantes. Se continuar, escreva para{" "}
          <a href="mailto:contato@educacional.ia.br" className="text-tinta underline underline-offset-2">
            contato@educacional.ia.br
          </a>
          .
        </p>
        <Botao onClick={() => retry()}>Tentar de novo</Botao>
      </main>
    </>
  );
}
