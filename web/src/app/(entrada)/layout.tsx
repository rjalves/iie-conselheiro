import type { ReactNode } from "react";
import { GradeGeracao } from "@/components/GradeGeracao";
import { Marca } from "@/components/Marca";

/**
 * Telas de entrada: à esquerda, a geração em 100 pontos; à direita, o formulário.
 * No celular, a grade e a frase viram uma faixa compacta acima do formulário.
 */
export default function LayoutEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col gap-5 bg-tinta-escura px-5 py-6 text-white sm:gap-8 sm:px-10 sm:py-8 lg:sticky lg:top-0 lg:h-dvh lg:justify-between lg:px-14 lg:py-14">
        <Marca claro href="/entrar" />
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-3 sm:gap-x-8 sm:gap-y-5 lg:flex lg:flex-col lg:items-start lg:gap-7">
          <GradeGeracao />
          <p className="text-lg leading-snug font-bold sm:text-2xl sm:leading-tight lg:max-w-md lg:text-[1.75rem]">
            De cada 100 jovens brasileiros, 19 concluem o Ensino Médio até os 18 anos com o básico em Português e
            Matemática.
          </p>
          <p className="col-span-2 text-white/85 max-sm:text-[0.9375rem] lg:max-w-md">
            O IIE Conselheiro mostra onde a geração se perde no seu estado e sugere práticas de gestão para mudar esse
            número.
          </p>
        </div>
        <p className="text-xs text-white/70 sm:text-sm">
          Brasil, IIE 2019 (nascidos em 2002). Fonte: Fernandes, Felicio e Saad (2024). Lupa Social e Instituto Natura.
        </p>
      </section>
      <main className="flex justify-center px-5 py-8 sm:px-8 sm:py-10 lg:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
