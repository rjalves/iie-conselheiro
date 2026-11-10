"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { agruparPorDia } from "@/lib/grupos";
import { Marca } from "../Marca";

type ConversaResumo = { id: string; titulo: string; atualizada_em: string };

/** Enquanto a conversa carrega, um ponto de marca-texto pulsa no fim do item (sem ocupar espaço do título). */
function Abrindo() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="pulsar absolute top-1/2 right-2 size-2 -translate-y-1/2 rounded-full bg-marca" />;
}

export function BarraLateral({
  conversas,
  nome,
  local,
  admin,
}: {
  conversas: ConversaResumo[];
  nome: string;
  local: string;
  admin: boolean;
}) {
  const caminho = usePathname();
  return (
    <div className="flex h-full flex-col bg-tinta-escura text-white">
      <div className="flex flex-col gap-4 px-4 pt-5 pb-3">
        <Marca claro />
        <Link
          href="/"
          aria-current={caminho === "/" ? "page" : undefined}
          className="rounded-md bg-white px-3 py-2.5 text-center font-semibold text-tinta-escura hover:bg-tinta-clara"
        >
          Nova conversa
        </Link>
      </div>
      <nav
        aria-label="Conversas anteriores"
        className="flex-1 overflow-y-auto px-2 pb-3 [scrollbar-color:rgb(255_255_255/0.25)_transparent]"
      >
        {conversas.length === 0 ? (
          <p className="px-2 py-3 text-sm text-white/70">Suas conversas aparecem aqui.</p>
        ) : (
          agruparPorDia(conversas).map(([grupo, lista]) => (
            <div key={grupo} className="mt-3 first:mt-1">
              <h2 className="px-3 pb-1 text-xs font-semibold text-white/60">
                {grupo}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {lista.map((c) => {
                  const atual = caminho === `/c/${c.id}`;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/c/${c.id}`}
                        aria-current={atual ? "page" : undefined}
                        className={`relative block truncate rounded-md px-3 py-2 hover:bg-white/10 ${
                          atual ? "bg-white/15" : ""
                        }`}
                      >
                        {c.titulo}
                        <Abrindo />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
      <div className="border-t border-white/15 px-4 py-4 text-sm">
        <p className="truncate font-semibold">{nome}</p>
        <p className="truncate text-white/70">{local}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/conta" className="underline underline-offset-2 hover:text-marca">
            Minha conta
          </Link>
          {admin && (
            <Link href="/admin" className="underline underline-offset-2 hover:text-marca">
              Administração
            </Link>
          )}
          <form action="/auth/sair" method="post">
            <button type="submit" className="underline underline-offset-2 hover:text-marca">
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
