// Rótulos e tipos sem dependência de servidor: podem ser usados em qualquer componente.
export type Perfil = "escola" | "secretaria_municipal" | "secretaria_estadual" | "equipe_interna" | "outro";
export type Status = "pendente" | "ativo" | "recusado" | "bloqueado";

export const PERFIS: Record<Perfil, string> = {
  escola: "Escola (direção ou coordenação)",
  secretaria_municipal: "Secretaria municipal de educação",
  secretaria_estadual: "Secretaria estadual de educação",
  equipe_interna: "Equipe do IIE",
  outro: "Outro",
};

export const STATUS: Record<Status, string> = {
  pendente: "Em análise",
  ativo: "Ativo",
  recusado: "Recusado",
  bloqueado: "Bloqueado",
};

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
