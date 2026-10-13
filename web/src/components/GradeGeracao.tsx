/**
 * "De cada 100 jovens…": a geração em 100 pontos, com os que concluíram o Ensino Médio até os 18 anos com o básico.
 * Valor padrão: Brasil, IIE 2019 = 19,0 (Fernandes, Felicio e Saad, 2024, Tabela 7).
 */
export function GradeGeracao({
  preenchidos = 19,
  tamanho = "grande",
  descricao = "De cada 100 jovens nascidos em 2002, 19 concluíram o Ensino Médio até os 18 anos com o básico em Língua Portuguesa e Matemática.",
}: {
  preenchidos?: number;
  tamanho?: "grande" | "pequena";
  descricao?: string;
}) {
  const pontos = Array.from({ length: 100 }, (_, i) => i < preenchidos);
  const lado = tamanho === "grande" ? "size-3.5 sm:size-4" : "size-2.5";
  const espaco = tamanho === "grande" ? "gap-2 sm:gap-2.5" : "gap-1.5";
  return (
    <div role="img" aria-label={descricao} className={`grid w-fit grid-cols-10 ${espaco}`}>
      {pontos.map((cheio, i) => (
        <span
          key={i}
          aria-hidden
          className={`${lado} rounded-full ${cheio ? "ponto-cheio bg-marca" : "border border-white/35"}`}
          style={cheio ? { animationDelay: `${i * 45}ms` } : undefined}
        />
      ))}
    </div>
  );
}
