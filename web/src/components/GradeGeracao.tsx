/**
 * "De cada 100 jovens…": a geração em 100 pontos, com os que concluíram o Ensino Médio até os 18 anos com o básico.
 * Valor padrão: Brasil, IIE 2023 = 15,5, preliminar (painel do IIE, Lupa Social; contexto/anexos/iie_uf_painel_2015_2023.csv).
 * Padrão: painel escuro das telas de entrada, compacta no celular para o formulário caber na primeira tela.
 * `clara`: dentro de um cartão claro (página inicial), com pontos em tinta e tamanho fixo de cartão.
 */
export function GradeGeracao({
  preenchidos = 15,
  descricao = "De cada 100 jovens nascidos em 2006, 15 concluíram o Ensino Médio até os 18 anos com o básico em Língua Portuguesa e Matemática.",
  clara = false,
}: {
  preenchidos?: number;
  descricao?: string;
  clara?: boolean;
}) {
  const [grade, ponto, cheio, vazio] = clara
    ? ["gap-1.5", "size-3", "bg-tinta", "border border-tinta/35"]
    : ["gap-1 sm:gap-2 lg:gap-2.5", "size-2 sm:size-3.5 lg:size-4", "bg-marca", "border border-white/35"];
  const pontos = Array.from({ length: 100 }, (_, i) => i < preenchidos);
  return (
    <div role="img" aria-label={descricao} className={`grid w-fit shrink-0 grid-cols-10 ${grade}`}>
      {pontos.map((preenchido, i) => (
        <span
          key={i}
          aria-hidden
          className={`rounded-full ${ponto} ${preenchido ? `ponto-cheio ${cheio}` : vazio}`}
          style={preenchido ? { animationDelay: `${i * 45}ms` } : undefined}
        />
      ))}
    </div>
  );
}
