import type { Metadata } from "next";
import { FormCadastro } from "./FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Criar conta</h1>
        <p className="mt-2 text-grafite-suave">
          O acesso é para gestores da educação. Depois do cadastro, a equipe do IIE analisa e libera sua conta.
        </p>
      </div>
      <FormCadastro />
    </div>
  );
}
