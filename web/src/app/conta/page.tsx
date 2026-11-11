import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Rodape } from "@/components/Rodape";
import { TopoSimples } from "@/components/TopoSimples";
import { PERFIS, STATUS, type Perfil, type Status } from "@/lib/rotulos";
import { obterUsuario } from "@/lib/usuario";
import { ExcluirConta } from "./ExcluirConta";

export const metadata: Metadata = { title: "Minha conta" };

export default async function PaginaConta() {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar");
  const dados: [string, string][] = [
    ["Nome", usuario.nome],
    ["E-mail", usuario.email],
    ["Onde trabalha", PERFIS[usuario.perfil as Perfil] ?? usuario.perfil],
    ["Instituição", usuario.instituicao],
    ["Município", `${usuario.municipio_nome}, ${usuario.uf}`],
    ["Situação", STATUS[usuario.status as Status] ?? usuario.status],
    ["Termo de uso aceito em", new Date(usuario.aceite_termo_em).toLocaleString("pt-BR")],
  ];
  return (
    <>
      <TopoSimples voltar={usuario.status === "ativo"} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Minha conta</h1>
        <section aria-labelledby="dados" className="flex flex-col gap-3">
          <h2 id="dados" className="text-xl font-bold">
            Seus dados
          </h2>
          <dl className="grid gap-x-6 gap-y-2 rounded-md border border-linha bg-white p-5 sm:grid-cols-[auto_1fr]">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo} className="contents">
                <dt className="text-grafite-suave">{rotulo}</dt>
                <dd className="mb-2 sm:mb-0">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-grafite-suave">
            Para corrigir algum dado, escreva para{" "}
            <a href="mailto:contato@educacional.ia.br" className="text-tinta underline underline-offset-2">
              contato@educacional.ia.br
            </a>
            . Leia o{" "}
            <Link href="/termo" className="text-tinta underline underline-offset-2">
              termo de uso
            </Link>
            .
          </p>
        </section>
        <section aria-labelledby="excluir" className="flex flex-col gap-3 rounded-md border border-erro/30 bg-white p-5">
          <h2 id="excluir" className="text-xl font-bold">
            Excluir conta
          </h2>
          <p>
            Apaga seu cadastro e todas as suas conversas, de forma definitiva. Para voltar a usar o IIE Conselheiro, será
            preciso criar uma conta nova.
          </p>
          <ExcluirConta />
        </section>
      </main>
      <Rodape />
    </>
  );
}
