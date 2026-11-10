// Nós Code "rastreabilidade" e "erro-agente" do workflow iie-agente-web (proposta 03, §5.2, nós 5 e E).
// Monta o registro da resposta para app.mensagem: ferramentas usadas, latência e os números e códigos de prática
// do texto que não aparecem nas saídas das ferramentas. O n8n cola este arquivo nos nós (agente/n8n/montar.py),
// então ele não usa require nem import.

const TEXTO_INSTABILIDADE = "Estou com instabilidade agora. Tente de novo em alguns minutos.";
const TEXTO_FORA_DE_ESCOPO =
  "Posso ajudar com o IIE, a educação básica e a gestão educacional. Quer reformular a pergunta dentro desses temas?";

const NUMERO = /(?<![\p{L}\p{N}_.,])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?/gu;
const PRATICA = /\b(?:GE-SEC|GE|SM|PE)-\d+\b/g;
const CONSTANTES = new Set([16, 17, 18, 19, 100, 250, 275, 300, 375]); // idades, escala e cortes do SAEB

function numerosDoTexto(texto) {
  return [...String(texto).matchAll(NUMERO)].map((m) => {
    const inteiro = m[1].replace(/\./g, "");
    return { bruto: m[0], valor: Number(m[2] ? `${inteiro}.${m[2]}` : inteiro), decimal: m[2] !== undefined };
  });
}

function numerosDaSaida(saida) {
  let dado;
  try {
    dado = JSON.parse(saida);
  } catch {
    return numerosDoTexto(saida).map((n) => n.valor);
  }
  const numeros = [];
  const andar = (x) => {
    if (typeof x === "number") numeros.push(x);
    else if (typeof x === "string") numeros.push(...numerosDoTexto(x).map((n) => n.valor));
    else if (x && typeof x === "object") Object.values(x).forEach(andar);
  };
  andar(dado);
  return numeros;
}

// ponytail: heurística de monitoramento, não um bloqueio. Números derivados ("79 em cada 100", o complemento de 21)
// aparecem como sem origem. Se a taxa incomodar, aceitar também 100 − x e diferenças entre valores das saídas.
function numerosSemOrigem(texto, saidas) {
  const origem = saidas.flatMap(numerosDaSaida);
  return numerosDoTexto(String(texto).replace(PRATICA, " "))
    .filter(({ valor, decimal }) => decimal || !(valor < 10 || CONSTANTES.has(valor) || (valor >= 1990 && valor <= 2035)))
    .filter(({ valor, decimal }) =>
      decimal ? !origem.some((n) => Math.abs(valor - n) < 0.051) : !origem.some((n) => Math.round(n) === valor),
    )
    .map((n) => n.bruto);
}

function praticasSemOrigem(texto, saidas) {
  const codigos = [...new Set(String(texto).match(PRATICA) ?? [])];
  return codigos.filter((codigo) => !saidas.some((s) => new RegExp(`(?<![A-Za-z-])${codigo}(?!\\d)`).test(s)));
}

function registroDaResposta(saidaAgente, saidasAnteriores, inicio, agora) {
  const passos = saidaAgente?.intermediateSteps ?? [];
  const saidas = passos
    .map((p) => (typeof p.observation === "string" ? p.observation : JSON.stringify(p.observation ?? null)))
    .concat(saidasAnteriores ?? []);
  const resposta = String(saidaAgente?.output ?? "").trim();
  return {
    texto: resposta || TEXTO_FORA_DE_ESCOPO,
    ferramentas: passos.map((p) => ({ nome: p.action?.tool, args: p.action?.toolInput ?? {} })),
    numeros_sem_origem: numerosSemOrigem(resposta, saidas),
    praticas_sem_origem: praticasSemOrigem(resposta, saidas),
    latencia_ms: Math.round(agora - inicio),
    erro: null,
  };
}

function registroDeErro(erro, inicio, agora) {
  const mensagem = typeof erro === "string" ? erro : erro?.message;
  return {
    texto: TEXTO_INSTABILIDADE,
    ferramentas: [],
    numeros_sem_origem: [],
    praticas_sem_origem: [],
    latencia_ms: Math.round(agora - inicio),
    erro: String(mensagem || "erro do agente").slice(0, 500),
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    TEXTO_INSTABILIDADE,
    TEXTO_FORA_DE_ESCOPO,
    numerosSemOrigem,
    praticasSemOrigem,
    registroDaResposta,
    registroDeErro,
  };
}
