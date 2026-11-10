import { describe, expect, it } from "vitest";
import { MARCA_ERRO, TEXTO_INSTABILIDADE, ndjsonParaTexto, separarErro } from "./ndjson";

async function converter(pedacos: string[]): Promise<string> {
  const entrada = new ReadableStream<string>({
    start(c) {
      pedacos.forEach((p) => c.enqueue(p));
      c.close();
    },
  });
  let saida = "";
  const leitor = entrada.pipeThrough(ndjsonParaTexto()).getReader();
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) return saida;
    saida += value;
  }
}

const linha = (o: object) => JSON.stringify(o) + "\n";

describe("ndjsonParaTexto", () => {
  it("junta os itens e ignora begin, end e linhas vazias", async () => {
    const texto = await converter([
      linha({ type: "begin", metadata: {} }),
      linha({ type: "item", content: "Ceará: " }),
      "\n",
      linha({ type: "item", content: "21,2" }),
      linha({ type: "end" }),
    ]);
    expect(texto).toBe("Ceará: 21,2");
  });

  it("remonta um JSON partido entre pedaços do stream", async () => {
    const completo = linha({ type: "item", content: "De cada 100 jovens" }) + linha({ type: "end" });
    expect(await converter([completo.slice(0, 17), completo.slice(17, 40), completo.slice(40)])).toBe(
      "De cada 100 jovens",
    );
  });

  it("evento de erro vira o aviso de instabilidade depois do que já chegou", async () => {
    const texto = await converter([linha({ type: "item", content: "Começo" }), linha({ type: "error", content: "x" })]);
    expect(separarErro(texto)).toEqual({ texto: "Começo", erro: TEXTO_INSTABILIDADE });
  });

  it("stream que termina sem end também é erro", async () => {
    expect(await converter([linha({ type: "item", content: "Parcial" })])).toBe(
      `Parcial${MARCA_ERRO}${TEXTO_INSTABILIDADE}`,
    );
  });

  it("erro de ferramenta seguido da resposta não é falha (o agente continua)", async () => {
    // n8n 2.46: a ferramenta que falha (ex.: territorio_sem_acesso) emite "error", e o agente segue respondendo.
    const texto = await converter([
      linha({ type: "begin" }),
      linha({ type: "end" }),
      linha({ type: "error", content: "territorio_sem_acesso: Ceará" }),
      linha({ type: "begin" }),
      linha({ type: "item", content: "Os dados do Ceará não estão liberados para você." }),
      linha({ type: "end" }),
    ]);
    expect(texto).toBe("Os dados do Ceará não estão liberados para você.");
  });

  it("ignora keepalive e itens vazios", async () => {
    const texto = await converter([
      linha({ type: "keepalive" }),
      linha({ type: "item", content: "" }),
      linha({ type: "item", content: "Pronto" }),
      linha({ type: "end" }),
    ]);
    expect(texto).toBe("Pronto");
  });

  it("aceita a resposta do n8n sem streaming (um JSON com output)", async () => {
    expect(await converter([JSON.stringify({ output: "Resposta inteira" })])).toBe("Resposta inteira");
  });
});
