// As 27 UFs, em ordem alfabética do português (Pará, Paraíba, Paraná), com o código IBGE (2 primeiros dígitos do código do município).
// Gerado de agente/dados/seeds/territorios.csv. O artigo serve para escrever "o Ceará", "a Bahia", "São Paulo".
export type UF = { sigla: string; nome: string; codigo: string; artigo: "o" | "a" | "" };

const LISTA: UF[] = [
  { sigla: "AC", nome: "Acre", codigo: "12", artigo: "o" },
  { sigla: "AL", nome: "Alagoas", codigo: "27", artigo: "" },
  { sigla: "AP", nome: "Amapá", codigo: "16", artigo: "o" },
  { sigla: "AM", nome: "Amazonas", codigo: "13", artigo: "o" },
  { sigla: "BA", nome: "Bahia", codigo: "29", artigo: "a" },
  { sigla: "CE", nome: "Ceará", codigo: "23", artigo: "o" },
  { sigla: "DF", nome: "Distrito Federal", codigo: "53", artigo: "o" },
  { sigla: "ES", nome: "Espírito Santo", codigo: "32", artigo: "o" },
  { sigla: "GO", nome: "Goiás", codigo: "52", artigo: "" },
  { sigla: "MA", nome: "Maranhão", codigo: "21", artigo: "o" },
  { sigla: "MT", nome: "Mato Grosso", codigo: "51", artigo: "o" },
  { sigla: "MS", nome: "Mato Grosso do Sul", codigo: "50", artigo: "o" },
  { sigla: "MG", nome: "Minas Gerais", codigo: "31", artigo: "" },
  { sigla: "PR", nome: "Paraná", codigo: "41", artigo: "o" },
  { sigla: "PB", nome: "Paraíba", codigo: "25", artigo: "a" },
  { sigla: "PA", nome: "Pará", codigo: "15", artigo: "o" },
  { sigla: "PE", nome: "Pernambuco", codigo: "26", artigo: "" },
  { sigla: "PI", nome: "Piauí", codigo: "22", artigo: "o" },
  { sigla: "RN", nome: "Rio Grande do Norte", codigo: "24", artigo: "o" },
  { sigla: "RS", nome: "Rio Grande do Sul", codigo: "43", artigo: "o" },
  { sigla: "RJ", nome: "Rio de Janeiro", codigo: "33", artigo: "o" },
  { sigla: "RO", nome: "Rondônia", codigo: "11", artigo: "" },
  { sigla: "RR", nome: "Roraima", codigo: "14", artigo: "" },
  { sigla: "SC", nome: "Santa Catarina", codigo: "42", artigo: "" },
  { sigla: "SE", nome: "Sergipe", codigo: "28", artigo: "" },
  { sigla: "SP", nome: "São Paulo", codigo: "35", artigo: "" },
  { sigla: "TO", nome: "Tocantins", codigo: "17", artigo: "o" },
];

export const UFS: UF[] = [...LISTA].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

export function buscarUf(sigla: string): UF | undefined {
  return UFS.find((uf) => uf.sigla === sigla);
}

/** "o Ceará", "a Bahia", "São Paulo" */
export function comArtigo(uf: UF): string {
  return uf.artigo ? `${uf.artigo} ${uf.nome}` : uf.nome;
}

/** "do Ceará", "da Bahia", "de São Paulo" */
export function comDe(uf: UF): string {
  return uf.artigo === "o" ? `do ${uf.nome}` : uf.artigo === "a" ? `da ${uf.nome}` : `de ${uf.nome}`;
}
