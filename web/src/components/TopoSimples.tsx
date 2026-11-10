import Link from "next/link";
import type { ReactNode } from "react";
import { Marca } from "./Marca";

/** Topo das telas fora do chat (aguardando, minha conta, administração). */
export function TopoSimples({ voltar = true, children }: { voltar?: boolean; children?: ReactNode }) {
  return (
    <header className="border-b border-linha bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Marca />
        <nav className="flex items-center gap-4 text-sm">
          {voltar && (
            <Link href="/" className="font-semibold text-tinta underline underline-offset-2 hover:text-tinta-escura">
              Voltar às conversas
            </Link>
          )}
          {children}
          <form action="/auth/sair" method="post">
            <button type="submit" className="text-grafite-suave underline underline-offset-2 hover:text-grafite">
              Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
