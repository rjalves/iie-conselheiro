import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Termo de uso" };

// Conteúdo da proposta 03, seção 10. Versão provisória: depende da revisão do(a) encarregado(a) de dados (plano 02, 4.6).
export default function PaginaTermo() {
  return (
    <article className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">Termo de uso</h1>
        <p className="mt-2 text-sm text-grafite-suave">Versão provisória, em revisão pela área de proteção de dados.</p>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Para que serve</h2>
        <p>
          O IIE Conselheiro explica os resultados do Índice de Inclusão Educacional (IIE) e sugere práticas de gestão
          baseadas em referenciais do MEC, do Itaú Social e do Todos Pela Educação. As sugestões apoiam a decisão do
          gestor; não são ordens nem garantias de resultado.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Quais dados coletamos</h2>
        <p>Nome, e-mail, onde você trabalha, instituição, estado e município. Guardamos também as suas conversas.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Como as perguntas são processadas</h2>
        <p>
          As perguntas são respondidas por um modelo de inteligência artificial da Anthropic. Os números vêm sempre das
          bases oficiais do IIE, nunca do modelo. Não escreva dados pessoais de estudantes ou de outras pessoas.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Por quanto tempo</h2>
        <p>As mensagens são anonimizadas depois de 12 meses.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Seus direitos</h2>
        <p>
          Em “Minha conta” você vê os dados do seu cadastro e pode excluir a conta, o que apaga também todas as suas
          conversas. Dúvidas:{" "}
          <a href="mailto:contato@educacional.ia.br" className="text-tinta underline underline-offset-2">
            contato@educacional.ia.br
          </a>
          .
        </p>
      </section>
      <Link href="/cadastro" className="text-sm text-tinta underline underline-offset-2">
        Voltar ao cadastro
      </Link>
    </article>
  );
}
