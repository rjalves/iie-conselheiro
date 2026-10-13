import { describe, expect, it } from "vitest";
import { TODAS_SIGLAS, acessoDoUsuario, descreverAcesso, resumirAcesso } from "./acesso";

describe("acessoDoUsuario", () => {
  it("usuário comum vê só a lista; a UF padrão é a do cadastro", () => {
    const a = acessoDoUsuario({ papel: "usuario", uf: "PE", ufs_acesso: ["PE", "CE"] });
    expect(a).toEqual({ todas: false, ufs: ["CE", "PE"], padrao: "PE" });
    expect(descreverAcesso(a)).toBe("Ceará e Pernambuco");
    expect(resumirAcesso(a)).toBe("CE, PE");
  });

  it("se a UF do cadastro foi retirada, a padrão é a primeira liberada", () => {
    expect(acessoDoUsuario({ papel: "usuario", uf: "SP", ufs_acesso: ["RJ", "BA"] }).padrao).toBe("BA");
  });

  it("administrador vê todas, qualquer que seja a lista", () => {
    const a = acessoDoUsuario({ papel: "admin", uf: "PE", ufs_acesso: ["PE"] });
    expect(a.todas).toBe(true);
    expect(a.ufs).toHaveLength(27);
    expect(descreverAcesso(a)).toBe("Todos os estados");
  });

  it("as 27 UFs liberadas contam como todas; siglas inválidas são ignoradas", () => {
    expect(acessoDoUsuario({ papel: "usuario", uf: "AC", ufs_acesso: TODAS_SIGLAS }).todas).toBe(true);
    expect(acessoDoUsuario({ papel: "usuario", uf: "PE", ufs_acesso: ["PE", "XX"] }).ufs).toEqual(["PE"]);
  });
});

it("UFs em ordem alfabética do português", async () => {
  const { UFS } = await import("./ufs");
  const nomes = UFS.map((u) => u.nome);
  expect(nomes.slice(nomes.indexOf("Pará"), nomes.indexOf("Pará") + 3)).toEqual(["Pará", "Paraíba", "Paraná"]);
  expect(nomes.indexOf("Rio de Janeiro")).toBeLessThan(nomes.indexOf("Rio Grande do Norte"));
});
