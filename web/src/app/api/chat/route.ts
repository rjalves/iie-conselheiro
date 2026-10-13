import { avaliarPedido, hojeEmBrasilia, tituloDaConversa } from "@/lib/chat";
import { limiteDiario } from "@/lib/conversa";
import { TEXTO_INSTABILIDADE, ndjsonParaTexto } from "@/lib/ndjson";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const TEMPO_LIMITE_MS = 120_000;

/** Recebe a pergunta, aplica as regras (proposta 03, seção 4), repassa ao n8n e devolve a resposta em texto. */
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usuario = user
    ? (await supabase.from("usuario").select("id, status, perfil, uf, municipio_nome").eq("id", user.id).maybeSingle())
        .data
    : null;

  let perguntasHoje = 0;
  if (usuario?.status === "ativo") perguntasHoje = (await supabase.rpc("fn_perguntas_hoje")).data ?? 0;
  const conversaInformada = (corpo as { conversa_id?: unknown } | null)?.conversa_id;
  let conversaEncontrada: boolean | null = null;
  if (typeof conversaInformada === "string" && usuario?.status === "ativo") {
    const { data } = await supabase.from("conversa").select("id").eq("id", conversaInformada).maybeSingle();
    conversaEncontrada = Boolean(data);
  }

  const decisao = avaliarPedido({ corpo, usuario, perguntasHoje, limite: limiteDiario(), conversaEncontrada });
  if (!decisao.ok) return Response.json({ erro: decisao.erro }, { status: decisao.status });
  const { pedido } = decisao;

  let conversaId = pedido.conversaId;
  const conversaNova = !conversaId;
  if (!conversaId) {
    const { data, error } = await supabase
      .from("conversa")
      .insert({ usuario_id: usuario!.id, titulo: tituloDaConversa(pedido.mensagem) })
      .select("id")
      .single();
    if (error || !data) return Response.json({ erro: TEXTO_INSTABILIDADE }, { status: 500 });
    conversaId = data.id;
  }

  const url = process.env.N8N_CHAT_URL;
  const resposta = url
    ? await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-IIE-Chave": process.env.N8N_CHAT_CHAVE ?? "" },
        body: JSON.stringify({
          usuario_id: usuario!.id,
          conversa_id: conversaId,
          mensagem: pedido.mensagem,
          perfil: usuario!.perfil,
          uf: usuario!.uf,
          municipio: usuario!.municipio_nome,
          data_referencia: hojeEmBrasilia(),
        }),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      }).catch(() => null)
    : null;

  if (!resposta?.ok || !resposta.body) {
    // Sem resposta do agente: uma conversa nova ficaria vazia, então ela é desfeita.
    if (conversaNova) await supabase.from("conversa").delete().eq("id", conversaId);
    return Response.json({ erro: TEXTO_INSTABILIDADE }, { status: 503 });
  }

  const texto = resposta.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(ndjsonParaTexto())
    .pipeThrough(new TextEncoderStream());
  return new Response(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Conversa-Id": conversaId },
  });
}
