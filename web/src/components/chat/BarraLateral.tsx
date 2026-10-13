"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marca } from "../Marca";

type ConversaResumo = { id: string; titulo: string; atualizada_em: string };

function quando(data: string): string {
  const d = new Date(data);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
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
          className="rounded-md bg-white px-3 py-2.5 text-center font-semibold text-tinta-escura hover:bg-tinta-clara"
        >
          Nova conversa
        </Link>
      </div>
      <nav aria-label="Conversas anteriores" className="flex-1 overflow-y-auto px-2 pb-3">
        {conversas.length === 0 ? (
          <p className="px-2 py-3 text-sm text-white/70">Suas conversas aparecem aqui.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversas.map((c) => {
              const atual = caminho === `/c/${c.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/c/${c.id}`}
                    aria-current={atual ? "page" : undefined}
                    className={`flex flex-col rounded-md px-3 py-2 hover:bg-white/10 ${atual ? "bg-white/15" : ""}`}
                  >
                    <span className="truncate">{c.titulo}</span>
                    <span className="text-xs text-white/60">{quando(c.atualizada_em)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
      <div className="border-t border-white/15 px-4 py-4 text-sm">
        <p className="truncate font-semibold">{nome}</p>
        <p className="truncate text-white/70">{local}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/conta" className="underline underline-offset-2">
            Minha conta
          </Link>
          {admin && (
            <Link href="/admin" className="underline underline-offset-2">
              Administração
            </Link>
          )}
          <form action="/auth/sair" method="post">
            <button type="submit" className="underline underline-offset-2">
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
