import { describe, expect, it } from "vitest";
import { type CamposCadastro, traduzirErroAuth, validarCadastro } from "./cadastro";

const VALIDO: CamposCadastro = {
  nome: "Ana Souza",
  email: "ana@seduc.ce.gov.br",
  senha: "senha-forte-1",
  perfil: "secretaria_estadual",
  instituicao: "Seduc CE",
  uf: "CE",
  municipio_ibge: "2312908",
  municipio_nome: "Sobral",
  aceite: true,
};

describe("validarCadastro", () => {
  it("cadastro completo não tem erros", () => {
    expect(validarCadastro(VALIDO)).toEqual({});
  });

  it("aponta cada campo inválido", () => {
    const erros = validarCadastro({
      ...VALIDO,
      nome: " ",
      email: "ana@",
      senha: "curta",
      perfil: "prefeito",
      instituicao: "",
      aceite: false,
    });
    expect(Object.keys(erros).sort()).toEqual(["aceite", "email", "instituicao", "nome", "perfil", "senha"]);
  });

  it("recusa município de outra UF, como o gatilho do banco", () => {
    expect(validarCadastro({ ...VALIDO, municipio_ibge: "3550308" })).toHaveProperty("municipio_ibge");
    expect(validarCadastro({ ...VALIDO, uf: "XX" })).toHaveProperty("uf");
  });
});

describe("traduzirErroAuth", () => {
  it.each([
    ["Database error saving new user", "Confira o estado e o município"],
    ["User already registered", "Já existe uma conta com este e-mail"],
    ["Password should be at least 8 characters", "pelo menos 8 caracteres"],
    ["Invalid login credentials", "E-mail ou senha incorretos."],
    ["Email not confirmed", "Confirme seu e-mail"],
    ["email rate limit exceeded", "Aguarde alguns minutos"],
    ["Token has expired or is invalid", "Código inválido ou vencido"],
    ["For security purposes, you can only request this after 52 seconds.", "Aguarde um minuto"],
    ["Error sending recovery email", "Não conseguimos enviar o e-mail"],
    ["algo inesperado", "Tente de novo em alguns minutos"],
  ])("%s", (original, esperado) => {
    expect(traduzirErroAuth(original)).toContain(esperado);
  });
});
