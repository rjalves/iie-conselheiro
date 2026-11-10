// Converte a resposta do webhook do n8n (NDJSON: begin, item, end, error, keepalive) no texto que o navegador mostra.
// Só é falha um error que não é seguido de end, ou um stream que acaba sem end.
// Proposta 03, seção 5.1.

export const TEXTO_INSTABILIDADE = "Estou com instabilidade agora. Tente de novo em alguns minutos.";

/** Separador entre o texto da resposta e o aviso de erro, no stream de texto que vai para o navegador. */
export const MARCA_ERRO = "\u001E";

type Evento = { type?: string; content?: unknown; output?: unknown };

export function ndjsonParaTexto(): TransformStream<string, string> {
  let resto = "";
  let terminou = false;
  let falhou = false;

  function processar(linha: string, saida: TransformStreamDefaultController<string>) {
    const texto = linha.trim();
    if (!texto) return;
    let evento: Evento;
    try {
      evento = JSON.parse(texto);
    } catch {
      return; // linha que não é JSON: ignorada
    }
    if (evento.type === "item" && typeof evento.content === "string") {
      saida.enqueue(evento.content);
    } else if (evento.type === "end") {
      // Um end depois de um error: o erro foi de uma ferramenta e o agente seguiu respondendo (n8n 2.46).
      terminou = true;
      falhou = false;
    } else if (evento.type === "error") {
      falhou = true;
    } else if (evento.type === undefined && typeof evento.output === "string") {
      // n8n sem streaming ("Respond: When last node finishes"): um JSON só, com output.
      saida.enqueue(evento.output);
      terminou = true;
    }
  }

  return new TransformStream<string, string>({
    transform(pedaco, saida) {
      resto += pedaco;
      const linhas = resto.split("\n");
      resto = linhas.pop() ?? "";
      for (const linha of linhas) processar(linha, saida);
    },
    flush(saida) {
      processar(resto, saida);
      if (falhou || !terminou) saida.enqueue(MARCA_ERRO + TEXTO_INSTABILIDADE);
    },
  });
}

/** Separa o texto recebido em resposta e aviso de erro (se houver). */
export function separarErro(recebido: string): { texto: string; erro: string | null } {
  const i = recebido.indexOf(MARCA_ERRO);
  return i === -1 ? { texto: recebido, erro: null } : { texto: recebido.slice(0, i), erro: recebido.slice(i + 1) };
}
