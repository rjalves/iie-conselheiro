import type { Metadata } from "next";
import Link from "next/link";
import { FormNovaSenha } from "./FormNovaSenha";

export const metadata: Metadata = { title: "Nova senha" };

/** Destino do link de convite (o Auth abre a sessão em /auth/confirmar). A recuperação usa o código, em /recuperar-senha. */
export default function PaginaNovaSenha() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Criar nova senha</h1>
      <FormNovaSenha />
      <Link href="/recuperar-senha" className="text-sm text-tinta underline underline-offset-2">
        Pedir um novo código
      </Link>
    </div>
  );
}
