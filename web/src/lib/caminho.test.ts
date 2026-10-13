import { expect, it } from "vitest";
import { caminhoSeguro } from "./caminho";

it.each([
  ["/c/123", "/c/123"],
  ["/nova-senha", "/nova-senha"],
  ["https://golpe.com", "/"],
  ["//golpe.com", "/"],
  ["/\\golpe.com", "/"],
  [null, "/"],
])("caminhoSeguro(%j) = %j", (entrada, esperado) => {
  expect(caminhoSeguro(entrada)).toBe(esperado);
});
