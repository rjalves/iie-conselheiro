import type { Metadata } from "next";
import Link from "next/link";
import { TopoSimples } from "@/components/TopoSimples";

export const metadata: Metadata = { title: "Página não encontrada" };

/** 404 em português (endereço errado ou conversa apagada), no lugar da página padrão do Next em inglês. */
export default function NaoEncontrada() {
  return (
    <>
      <TopoSimples voltar={false} />
      <main className="mx-auto flex max-w-xl flex-col items-start gap-5 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Não encontramos esta página</h1>
        <p className="text-lg">Confira o endereço. Se ele veio de um link, a página pode ter mudado de lugar.</p>
        <Link
          href="/"
          className="rounded-md bg-tinta px-4 py-2.5 font-semibold text-white hover:bg-tinta-escura"
        >
          Voltar às conversas
        </Link>
      </main>
    </>
  );
}
