import { describe, expect, it } from "vitest";
import { avaliarPedido, hojeEmBrasilia, tituloDaConversa } from "./chat";

const ATIVO = { status: "ativo" };
const CONVERSA = "6f1c2a3b-1111-4222-8333-444455556666";
const base = { usuario: ATIVO, perguntasHoje: 0, limite: 40, conversaEncontrada: null };

describe("avaliarPedido", () => {
  it("aceita pergunta válida, com ou sem conversa", () => {
    expect(avaliarPedido({ ...base, corpo: { mensagem: "  Como está o Ceará? " } })).toEqual({
      ok: true,
      pedido: { conversaId: null, mensagem: "Como está o Ceará?" },
    });
    const r = avaliarPedido({ ...base, corpo: { mensagem: "E a evasão?", conversa_id: CONVERSA }, conversaEncontrada: true });
    expect(r).toEqual({ ok: true, pedido: { conversaId: CONVERSA, mensagem: "E a evasão?" } });
  });

  it("sem sessão dá 401 antes de qualquer outra regra", () => {
    expect(avaliarPedido({ ...base, usuario: null, corpo: null })).toMatchObject({ ok: false, status: 401 });
  });

  it.each([
    [null, "Pedido inválido."],
    [{ mensagem: "   " }, "Escreva uma pergunta."],
    [{ mensagem: "x".repeat(2001) }, "A pergunta pode ter até 2.000 caracteres."],
    [{ mensagem: "oi", conversa_id: "não-é-uuid" }, "Conversa inválida."],
  ])("pedido %j dá 400", (corpo, erro) => {
    expect(avaliarPedido({ ...base, corpo })).toEqual({ ok: false, status: 400, erro });
  });

  it.each(["pendente", "recusado", "bloqueado"])("usuário %s dá 403", (status) => {
    expect(avaliarPedido({ ...base, usuario: { status }, corpo: { mensagem: "oi" } })).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("limite diário atingido dá 429 com a renovação", () => {
    const r = avaliarPedido({ ...base, perguntasHoje: 40, corpo: { mensagem: "oi" } });
    expect(r).toMatchObject({ ok: false, status: 429 });
    expect(!r.ok && r.erro).toContain("meia-noite");
  });

  it("conversa que a RLS não encontrou dá 404", () => {
    const r = avaliarPedido({ ...base, corpo: { mensagem: "oi", conversa_id: CONVERSA }, conversaEncontrada: false });
    expect(r).toEqual({ ok: false, status: 404, erro: "Conversa não encontrada." });
  });
});

describe("auxiliares", () => {
  it("título da conversa usa o começo da pergunta", () => {
    expect(tituloDaConversa("Como  está\no Ceará?")).toBe("Como está o Ceará?");
    expect(tituloDaConversa("a".repeat(80))).toHaveLength(60);
  });

  it("data de referência no fuso de Brasília", () => {
    expect(hojeEmBrasilia(new Date("2026-10-14T02:30:00Z"))).toBe("2026-10-13");
  });
});
