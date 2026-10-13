import type { ReactNode } from "react";
import { GradeGeracao } from "@/components/GradeGeracao";
import { Marca } from "@/components/Marca";

/** Telas de entrada: à esquerda, a geração em 100 pontos; à direita, o formulário. */
export default function LayoutEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col gap-8 bg-tinta-escura px-5 py-7 text-white sm:px-10 lg:justify-between lg:px-14 lg:py-14">
        <Marca claro href="/entrar" />
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center lg:flex-col lg:items-start">
          <GradeGeracao />
          <div className="max-w-md">
            <p className="text-2xl leading-tight font-bold sm:text-[1.75rem]">
              De cada 100 jovens brasileiros, 19 concluem o Ensino Médio até os 18 anos com o básico em Português e
              Matemática.
            </p>
            <p className="mt-3 text-white/85">
              O IIE Conselheiro mostra onde a geração se perde no seu estado e sugere práticas de gestão para mudar esse
              número.
            </p>
          </div>
        </div>
        <p className="text-sm text-white/70">
          Brasil, IIE 2019 (nascidos em 2002). Fonte: Fernandes, Felicio e Saad (2024). Lupa Social e Instituto Natura.
        </p>
      </section>
      <main className="flex justify-center px-4 py-10 sm:px-8 lg:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
