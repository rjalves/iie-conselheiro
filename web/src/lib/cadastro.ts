import { buscarUf } from "./ufs";
import { PERFIS } from "./rotulos";

export const SENHA_MINIMA = 8;

export type CamposCadastro = {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  instituicao: string;
  uf: string;
  municipio_ibge: string;
  municipio_nome: string;
  aceite: boolean;
};

export type ErrosCadastro = Partial<Record<keyof CamposCadastro, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mesmas regras do gatilho app.ao_criar_usuario (P1, migração 0004), mais e-mail e senha. */
export function validarCadastro(c: CamposCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {};
  if (c.nome.trim().length < 2) erros.nome = "Informe seu nome.";
  if (!EMAIL.test(c.email.trim())) erros.email = "Informe um e-mail válido.";
  if (c.senha.length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (!(c.perfil in PERFIS)) erros.perfil = "Escolha onde você trabalha.";
  if (c.instituicao.trim().length < 2) erros.instituicao = "Informe a instituição.";
  const uf = buscarUf(c.uf);
  if (!uf) erros.uf = "Escolha o estado.";
  if (!/^\d{7}$/.test(c.municipio_ibge) || (uf && !c.municipio_ibge.startsWith(uf.codigo))) {
    erros.municipio_ibge = "Escolha o município na lista do estado.";
  }
  if (!c.aceite) erros.aceite = "Para criar a conta, aceite o termo de uso.";
  return erros;
}

/** Mensagem clara para os erros do Supabase Auth e do gatilho de cadastro. */
export function traduzirErroAuth(mensagem: string | undefined): string {
  const m = (mensagem ?? "").toLowerCase();
  if (m.includes("database error saving new user") || m.includes("cadastro_invalido")) {
    return "Não foi possível criar a conta. Confira o estado e o município e tente de novo.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Já existe uma conta com este e-mail. Entre ou recupere a senha.";
  }
  if (m.includes("password should be") || m.includes("weak password")) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres, com letras e números.`;
  }
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  }
  if (m.includes("same password") || m.includes("different from the old")) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  return "Não foi possível concluir agora. Tente de novo em alguns minutos.";
}
