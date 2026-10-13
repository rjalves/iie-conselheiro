// Regras do POST /api/chat (proposta 03, seção 4), como funções puras para poderem ser testadas.

export const LIMITE_PADRAO = 40;
export const TAMANHO_MAXIMO = 2000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Pedido = { conversaId: string | null; mensagem: string };

export type EntradaAvaliacao = {
  corpo: unknown;
  usuario: { status: string } | null;
  perguntasHoje: number;
  limite: number;
  /** null quando o pedido não traz conversa; false quando traz, mas a RLS não a encontrou. */
  conversaEncontrada: boolean | null;
};

export type Decisao = { ok: true; pedido: Pedido } | { ok: false; status: number; erro: string };

export function lerPedido(corpo: unknown): Pedido | { erro: string } {
  if (typeof corpo !== "object" || corpo === null) return { erro: "Pedido inválido." };
  const { mensagem, conversa_id } = corpo as Record<string, unknown>;
  if (typeof mensagem !== "string" || !mensagem.trim()) return { erro: "Escreva uma pergunta." };
  if (mensagem.length > TAMANHO_MAXIMO) {
    return { erro: `A pergunta pode ter até ${TAMANHO_MAXIMO.toLocaleString("pt-BR")} caracteres.` };
  }
  if (conversa_id != null && (typeof conversa_id !== "string" || !UUID.test(conversa_id))) {
    return { erro: "Conversa inválida." };
  }
  return { conversaId: (conversa_id as string | null | undefined) ?? null, mensagem: mensagem.trim() };
}

export function avaliarPedido(e: EntradaAvaliacao): Decisao {
  if (!e.usuario) return { ok: false, status: 401, erro: "Sua sessão terminou. Entre de novo para continuar." };
  const pedido = lerPedido(e.corpo);
  if ("erro" in pedido) return { ok: false, status: 400, erro: pedido.erro };
  if (e.usuario.status !== "ativo") {
    const erro = e.usuario.status === "pendente"
      ? "Seu cadastro ainda está em análise. Você recebe acesso assim que a equipe aprovar."
      : "Seu acesso não está liberado. Fale com a equipe do IIE.";
    return { ok: false, status: 403, erro };
  }
  if (e.perguntasHoje >= e.limite) {
    return {
      ok: false,
      status: 429,
      erro: `Você chegou ao limite de ${e.limite} perguntas de hoje. O limite renova à meia-noite (horário de Brasília).`,
    };
  }
  if (pedido.conversaId && e.conversaEncontrada === false) {
    return { ok: false, status: 404, erro: "Conversa não encontrada." };
  }
  return { ok: true, pedido };
}

/** Título da conversa: o começo da primeira pergunta. */
export function tituloDaConversa(mensagem: string): string {
  const limpa = mensagem.replace(/\s+/g, " ").trim();
  return limpa.length <= 60 ? limpa : `${limpa.slice(0, 59).trimEnd()}…`;
}

/** Data de hoje no fuso de Brasília (AAAA-MM-DD), para o contrato com o n8n. */
export function hojeEmBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}
