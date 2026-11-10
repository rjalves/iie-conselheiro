import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Resposta do agente em markdown (HTML embutido é ignorado). Negrito vira marca-texto (globals.css, .resposta). */
export function TextoResposta({ texto }: { texto: string }) {
  return (
    <div className="resposta">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}

export function PerguntaUsuario({ texto }: { texto: string }) {
  return (
    <div
      data-pergunta
      className="relative ml-auto max-w-[85%] rounded-lg bg-tinta-clara px-4 py-3 whitespace-pre-wrap sm:max-w-[75%]"
    >
      <span className="sr-only">Você: </span>
      {texto}
    </div>
  );
}
