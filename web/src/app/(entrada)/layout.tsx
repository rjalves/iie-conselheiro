import type { ReactNode } from "react";
import { GradeGeracao } from "@/components/GradeGeracao";
import { IconeLupa, Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";

/**
 * Telas de entrada: um cartão branco sobre o fundo azul-claro. À esquerda, o painel com a geração em 100 pontos;
 * à direita, o formulário. No celular, o painel vira uma faixa compacta acima do formulário.
 * Nas telas longas (cadastro, termo), o conteúdo do painel acompanha a rolagem.
 */
export default function LayoutEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-5 bg-tinta-clara p-2.5 sm:gap-6 sm:p-6 lg:justify-center lg:px-10 lg:py-8">
      <div className="grid w-full max-w-6xl rounded-[1.75rem] bg-white p-2 shadow-[0_32px_72px_-32px_rgb(21_43_102/0.45),0_2px_8px_rgb(21_43_102/0.06)] sm:p-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="rounded-[1.25rem] bg-tinta-escura bg-[image:radial-gradient(110%_70%_at_100%_0%,rgb(61_96_186/0.55)_0%,transparent_70%),radial-gradient(80%_50%_at_0%_100%,rgb(9_22_56/0.7)_0%,transparent_75%)] text-white sm:rounded-2xl">
          <div className="flex flex-col gap-5 px-5 py-6 sm:gap-8 sm:px-9 sm:py-8 lg:sticky lg:top-8 lg:h-[min(100%,calc(100dvh_-_4rem))] lg:min-h-min lg:justify-between lg:gap-10 lg:px-12 lg:py-10">
            <Marca claro />
            <div className="flex flex-col gap-5 sm:gap-8">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-3 sm:gap-x-8 sm:gap-y-5 lg:flex lg:flex-col lg:items-start lg:gap-7">
                <GradeGeracao />
                <p className="text-lg leading-snug font-bold sm:text-2xl sm:leading-tight lg:max-w-md lg:text-[1.75rem]">
                  De cada 100 jovens brasileiros, 15 concluem o Ensino Médio até os 18 anos com o básico em Português e
                  Matemática.
                </p>
                <p className="col-span-2 text-white/85 max-sm:text-[0.9375rem] lg:max-w-md">
                  O IIE Conselheiro mostra onde a geração se perde no seu estado e sugere práticas de gestão para mudar
                  esse número.
                </p>
              </div>
              <p className="text-xs text-white/70 sm:text-sm">
                Brasil, IIE 2023 (nascidos em 2006), dado preliminar. Fonte: painel do IIE, Lupa Social.
              </p>
            </div>
          </div>
        </section>
        <main className="flex justify-center px-3 pt-7 pb-6 sm:px-10 sm:py-12 lg:items-center lg:px-14 lg:py-16">
          <div className="w-full max-w-md">
            <IconeLupa className="mb-6 size-9 text-tinta max-lg:hidden" />
            {children}
          </div>
        </main>
      </div>
      <Rodape className="w-full max-w-6xl px-2 text-center" />
    </div>
  );
}
