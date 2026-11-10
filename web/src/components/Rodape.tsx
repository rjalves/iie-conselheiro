/** Autoria e contato, no pé de todas as telas. Sem className, é o rodapé das páginas simples (conta, admin, erros). */
export function Rodape({
  claro = false,
  className = "mx-auto mt-auto w-full max-w-5xl px-4 py-6 sm:px-6",
}: {
  claro?: boolean;
  className?: string;
}) {
  return (
    <footer className={`text-xs leading-relaxed ${claro ? "text-white/70" : "text-grafite-suave"} ${className}`}>
      <p>Criação e Desenvolvimento: Educacional.ia - Roberto Alves</p>
      <p>
        Todos os direitos reservados -{" "}
        <a
          href="mailto:contato@educacional.ia.br"
          className={`underline underline-offset-2 ${claro ? "hover:text-marca" : "hover:text-grafite"}`}
        >
          contato@educacional.ia.br
        </a>
      </p>
    </footer>
  );
}
