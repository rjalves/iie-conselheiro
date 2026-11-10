// Nó Code "validar-pedido" do workflow iie-agente-web: confere o corpo do webhook (proposta 03, §5.1).
// Um pedido inválido para o workflow antes de gravar ou chamar o Claude. O n8n cola este arquivo no nó
// (agente/n8n/montar.py), então ele não usa require nem import.

const PERFIS = ["escola", "secretaria_municipal", "secretaria_estadual", "equipe_interna", "outro"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGLA = /^[A-Z]{2}$/;
const TAMANHO_MAXIMO = 2000; // o mesmo de web/src/lib/chat.ts

function validarPedido(corpo) {
  const c = corpo ?? {};
  const ruins = [];
  const texto = (v) => typeof v === "string" && v.trim() !== "";
  if (!UUID.test(String(c.usuario_id ?? ""))) ruins.push("usuario_id");
  if (!UUID.test(String(c.conversa_id ?? ""))) ruins.push("conversa_id");
  if (!texto(c.mensagem) || c.mensagem.trim().length > TAMANHO_MAXIMO) ruins.push("mensagem");
  if (!PERFIS.includes(c.perfil)) ruins.push("perfil");
  const ufs = c.ufs_permitidas;
  const listaOk = Array.isArray(ufs) && ufs.length >= 1 && ufs.length <= 27 && ufs.every((u) => SIGLA.test(u));
  if (!listaOk) ruins.push("ufs_permitidas");
  if (!SIGLA.test(String(c.uf ?? "")) || (listaOk && !ufs.includes(c.uf))) ruins.push("uf");
  if (!texto(c.municipio)) ruins.push("municipio");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.data_referencia ?? ""))) ruins.push("data_referencia");
  if (ruins.length) throw new Error(`pedido_invalido: ${ruins.join(", ")}`);
}

if (typeof module !== "undefined") module.exports = { validarPedido };
