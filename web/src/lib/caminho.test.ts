import { expect, it } from "vitest";
import { caminhoSeguro, redirecionarPara } from "./caminho";

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

it("redireciona com endereço relativo, sem depender do endereço interno do contêiner", () => {
  const r = redirecionarPara("/entrar");
  expect(r.status).toBe(303);
  expect(r.headers.get("Location")).toBe("/entrar");
  expect(redirecionarPara("//golpe.com").headers.get("Location")).toBe("/");
});
