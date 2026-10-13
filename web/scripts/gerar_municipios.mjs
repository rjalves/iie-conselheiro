// Gera public/municipios/<UF>.json ([{codigo, nome}], em ordem alfabética) a partir da API de localidades do IBGE.
// Uso: npm run municipios
import { mkdir, writeFile } from "node:fs/promises";

const URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado";
const resposta = await fetch(URL_IBGE);
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
const municipios = await resposta.json();

const porUf = {};
for (const m of municipios) {
  (porUf[m["UF-sigla"]] ??= []).push({ codigo: String(m["municipio-id"]), nome: m["municipio-nome"] });
}
await mkdir("public/municipios", { recursive: true });
for (const [uf, lista] of Object.entries(porUf)) {
  lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  await writeFile(`public/municipios/${uf}.json`, JSON.stringify(lista));
}
console.log(`${municipios.length} municípios em ${Object.keys(porUf).length} arquivos`);
