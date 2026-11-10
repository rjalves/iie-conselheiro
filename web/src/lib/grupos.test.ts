import { expect, it } from "vitest";
import { agruparPorDia } from "./grupos";

it("agrupa pelo dia de Brasília, não pelo do servidor", () => {
  const agora = new Date("2026-11-10T02:30:00Z"); // 23h30 de 09/11 em Brasília (já é 10/11 em UTC)
  const itens = [
    { id: "a", atualizada_em: "2026-11-10T01:00:00Z" }, // 22h de 09/11
    { id: "b", atualizada_em: "2026-11-09T02:00:00Z" }, // 23h de 08/11
    { id: "c", atualizada_em: "2026-11-02T12:00:00Z" },
    { id: "d", atualizada_em: "2026-10-20T12:00:00Z" },
    { id: "e", atualizada_em: "2026-01-01T12:00:00Z" },
  ];
  expect(agruparPorDia(itens, agora).map(([nome, lista]) => [nome, lista.map((i) => i.id)])).toEqual([
    ["Hoje", ["a"]],
    ["Ontem", ["b"]],
    ["Últimos 7 dias", ["c"]],
    ["Últimos 30 dias", ["d"]],
    ["Mais antigas", ["e"]],
  ]);
});
