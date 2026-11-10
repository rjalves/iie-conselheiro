// Testes do código dos nós Code do workflow iie-agente-web. Rodar: node --test agente/n8n/codigo/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  TEXTO_INSTABILIDADE,
  TEXTO_FORA_DE_ESCOPO,
  numerosSemOrigem,
  praticasSemOrigem,
  registroDaResposta,
  registroDeErro,
} = require("./rastreabilidade.js");
const { validarPedido } = require("./validar_pedido.js");

test("números sem origem: decimais com tolerância, inteiros arredondados, constantes e pequenos ignorados", () => {
  const saida = '{"iie_oficial": 21.2, "componentes": {"P1": 11.1, "F1": 67.4}, "serie": [{"ano": 2019}]}';
  const texto = "Em 2019 o IIE foi 21,2; 11,1% fora da escola; 67% concluem; corte de 300 pontos; 3 práticas; 99,9 e 45.";
  assert.deepEqual(numerosSemOrigem(texto, [saida]), ["99,9", "45"]);
});

test("números sem origem: milhares e números dentro de textos da ferramenta", () => {
  const saida = '{"alertas": [{"texto": "caíram 77% (43.774 → 9.882)"}]}';
  assert.deepEqual(numerosSemOrigem("Queda de 77%: de 43.774 para 9.882.", [saida]), []);
});

test("números sem origem: anos e códigos de prática não contam", () => {
  assert.deepEqual(numerosSemOrigem("Nascidos em 2002, veja SM-79 e GE-SEC-12.", []), []);
});

test("práticas sem origem: códigos citados que nenhuma ferramenta devolveu", () => {
  assert.deepEqual(praticasSemOrigem("Use SM-79 e GE-SEC-12; também PE-03.", ['{"id":"SM-79"}', '"GE-SEC-12"']), [
    "PE-03",
  ]);
});

test("registro da resposta: ferramentas, rastreabilidade e latência", () => {
  const r = registroDaResposta(
    {
      output: "IIE de **21,2** em 2019.",
      intermediateSteps: [
        {
          action: { tool: "consultar_iie", toolInput: { territorio: "CE" } },
          observation: '[{"resultado":{"serie":[{"ano":2019,"valor":21.2}]}}]',
        },
      ],
    },
    [],
    1000,
    2500,
  );
  assert.deepEqual(r.ferramentas, [{ nome: "consultar_iie", args: { territorio: "CE" } }]);
  assert.deepEqual(r.numeros_sem_origem, []);
  assert.equal(r.latencia_ms, 1500);
  assert.equal(r.erro, null);
});

test("registro da resposta: números lembrados de uma pergunta anterior têm origem", () => {
  assert.deepEqual(registroDaResposta({ output: "Era 21,2." }, ['{"valor": 21.2}'], 0, 1).numeros_sem_origem, []);
});

test("registro da resposta: resposta vazia vira o texto fixo de fora de escopo", () => {
  assert.equal(registroDaResposta({ output: "  " }, [], 0, 1).texto, TEXTO_FORA_DE_ESCOPO);
});

test("registro de erro: texto de instabilidade e a mensagem do erro", () => {
  const r = registroDeErro({ message: "401 invalid x-api-key" }, 0, 10);
  assert.equal(r.texto, TEXTO_INSTABILIDADE);
  assert.equal(r.erro, "401 invalid x-api-key");
  assert.equal(r.latencia_ms, 10);
});

test("o texto de instabilidade é o mesmo do site", () => {
  const site = fs.readFileSync(path.join(__dirname, "../../../web/src/lib/ndjson.ts"), "utf8");
  assert.ok(site.includes(`"${TEXTO_INSTABILIDADE}"`));
});

const PEDIDO = {
  usuario_id: "6f1c1d2e-0000-4000-8000-000000000001",
  conversa_id: "a93e1d2e-0000-4000-8000-000000000002",
  mensagem: "Como está o Ceará?",
  perfil: "secretaria_estadual",
  uf: "CE",
  municipio: "Sobral",
  data_referencia: "2026-10-13",
  ufs_permitidas: ["CE", "PE"],
};

test("validar pedido: aceita o contrato da proposta 03 §5.1", () => {
  assert.doesNotThrow(() => validarPedido(PEDIDO));
});

test("validar pedido: recusa sem a lista de UFs, com a lista vazia ou com uma string", () => {
  const { ufs_permitidas, ...semLista } = PEDIDO;
  for (const corpo of [semLista, { ...PEDIDO, ufs_permitidas: [] }, { ...PEDIDO, ufs_permitidas: "CE" }]) {
    assert.throws(() => validarPedido(corpo), /pedido_invalido: .*ufs_permitidas/);
  }
});

test("validar pedido: recusa UF fora da lista, mensagem longa e conversa que não é UUID", () => {
  for (const corpo of [
    { ...PEDIDO, uf: "BA" },
    { ...PEDIDO, mensagem: "x".repeat(2001) },
    { ...PEDIDO, conversa_id: "abc" },
  ]) {
    assert.throws(() => validarPedido(corpo), /pedido_invalido/);
  }
});
