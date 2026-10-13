import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TopoSimples } from "@/components/TopoSimples";
import { obterUsuario, primeiroNome } from "@/lib/usuario";

export const metadata: Metadata = { title: "Cadastro em análise" };

const TEXTOS = {
  pendente: {
    titulo: "Seu cadastro está em análise",
    texto:
      "A equipe do IIE confere os cadastros para liberar o acesso a gestores da educação. Quando for aprovado, é só entrar de novo.",
  },
  recusado: {
    titulo: "Seu cadastro não foi aprovado",
    texto: "O acesso é restrito a gestores da educação. Se você acha que houve um engano, escreva para a equipe.",
  },
  bloqueado: {
    titulo: "Seu acesso está suspenso",
    texto: "A equipe do IIE suspendeu este acesso. Escreva para a equipe para saber como regularizar.",
  },
} as const;

export default async function PaginaAguardando() {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar");
  if (usuario.status === "ativo") redirect("/");
  const { titulo, texto } = TEXTOS[usuario.status as keyof typeof TEXTOS] ?? TEXTOS.pendente;
  return (
    <>
      <TopoSimples voltar={false} />
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-12 sm:px-6">
        <p className="text-grafite-suave">Olá, {primeiroNome(usuario.nome)}.</p>
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <p className="text-lg">{texto}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md border border-linha bg-white p-5">
          <dt className="text-grafite-suave">E-mail</dt>
          <dd>{usuario.email}</dd>
          <dt className="text-grafite-suave">Instituição</dt>
          <dd>{usuario.instituicao}</dd>
          <dt className="text-grafite-suave">Município</dt>
          <dd>
            {usuario.municipio_nome}, {usuario.uf}
          </dd>
        </dl>
        <p className="text-sm text-grafite-suave">
          Contato: <a href="mailto:contato@lupasocial.com.br" className="text-tinta underline">contato@lupasocial.com.br</a>.
          Você pode ver ou excluir seus dados em{" "}
          <Link href="/conta" className="text-tinta underline underline-offset-2">
            Minha conta
          </Link>
          .
        </p>
      </main>
    </>
  );
}
