/**
 * "De cada 100 jovens…": a geração em 100 pontos, com os que concluíram o Ensino Médio até os 18 anos com o básico.
 * Valor padrão: Brasil, IIE 2023 = 15,5, preliminar (painel do IIE, Lupa Social; contexto/anexos/iie_uf_painel_2015_2023.csv).
 * Compacta no celular, para o formulário caber na primeira tela.
 */
export function GradeGeracao({
  preenchidos = 15,
  descricao = "De cada 100 jovens nascidos em 2006, 15 concluíram o Ensino Médio até os 18 anos com o básico em Língua Portuguesa e Matemática.",
}: {
  preenchidos?: number;
  descricao?: string;
}) {
  const pontos = Array.from({ length: 100 }, (_, i) => i < preenchidos);
  return (
    <div role="img" aria-label={descricao} className="grid w-fit shrink-0 grid-cols-10 gap-1 sm:gap-2 lg:gap-2.5">
      {pontos.map((cheio, i) => (
        <span
          key={i}
          aria-hidden
          className={`size-2 rounded-full sm:size-3.5 lg:size-4 ${cheio ? "ponto-cheio bg-marca" : "border border-white/35"}`}
          style={cheio ? { animationDelay: `${i * 45}ms` } : undefined}
        />
      ))}
    </div>
  );
}
