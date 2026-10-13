// Acesso por UF (proposta 03, W5 revista): de quais estados o usuário pode ver dados. Administradores veem todos.
import { UFS, buscarUf } from "./ufs";

export const TODAS_SIGLAS = UFS.map((u) => u.sigla).sort();

export type Acesso = {
  /** true para administradores ou para quem tem as 27 UFs liberadas. */
  todas: boolean;
  /** Siglas liberadas, em ordem alfabética. É o que vai para o n8n em ufs_permitidas. */
  ufs: string[];
  /** UF usada quando a pergunta não diz o estado: a do cadastro, se liberada; senão, a primeira liberada. */
  padrao: string;
};

export function acessoDoUsuario(u: { papel: string; uf: string; ufs_acesso: string[] }): Acesso {
  const validas = [...new Set(u.ufs_acesso)].filter((s) => buscarUf(s)).sort();
  const todas = u.papel === "admin" || TODAS_SIGLAS.every((s) => validas.includes(s));
  const ufs = todas ? TODAS_SIGLAS : validas;
  return { todas, ufs, padrao: ufs.includes(u.uf) ? u.uf : (ufs[0] ?? u.uf) };
}

const lista = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });

/** "Todos os estados", "Pernambuco", "Ceará e Pernambuco". */
export function descreverAcesso(a: Acesso): string {
  if (a.todas) return "Todos os estados";
  return lista.format(a.ufs.map((s) => buscarUf(s)?.nome ?? s));
}

/** Versão curta para tabelas: "Todos", "PE", "CE, PE". */
export function resumirAcesso(a: Acesso): string {
  return a.todas ? "Todos" : a.ufs.join(", ");
}
