import type { Metadata } from "next";
import { FormCadastro } from "./FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Criar conta</h1>
        <p className="mt-2 text-grafite-suave">
          O acesso é para gestores da educação. Assim que criar a conta, você já pode conversar com o IIE Conselheiro.
        </p>
      </div>
      <FormCadastro />
    </div>
  );
}
