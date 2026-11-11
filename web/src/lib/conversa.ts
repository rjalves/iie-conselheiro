import { LIMITE_PADRAO } from "./chat";
import { TEXTO_INSTABILIDADE } from "./ndjson";
import { criarClienteServidor } from "./supabase/servidor";
import type { Usuario } from "./usuario";

export type MensagemTela = {
  id: string | null;
  papel: "usuario" | "agente";
  texto: string;
  erro: string | null;
  nota: 1 | -1 | null;
};

export function limiteDiario(): number {
  const valor = Number(process.env.LIMITE_DIARIO);
  return Number.isInteger(valor) && valor > 0 ? valor : LIMITE_PADRAO;
}

/** Perguntas que ainda cabem hoje para o usuário logado. */
export async function perguntasRestantes(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("fn_perguntas_hoje");
  return Math.max(limiteDiario() - (data ?? 0), 0);
}

/** Conversa e mensagens do usuário logado (RLS), com a avaliação que ele deu a cada resposta. */
export async function carregarConversa(id: string) {
  const supabase = await criarClienteServidor();
  const { data: conversa } = await supabase.from("conversa").select("id, titulo").eq("id", id).maybeSingle();
  if (!conversa) return null;
  const { data: mensagens } = await supabase
    .from("mensagem")
    .select("id, papel, texto, erro, feedback(nota)")
    .eq("conversa_id", id)
    .order("criado_em");
  const tela: MensagemTela[] = (mensagens ?? []).map((m) => ({
    id: m.id,
    papel: m.papel as MensagemTela["papel"],
    // A coluna erro guarda o detalhe técnico (para a equipe); o gestor vê só o aviso padrão.
    texto: m.erro ? "" : m.texto,
    erro: m.erro ? TEXTO_INSTABILIDADE : null,
    nota: (m.feedback?.[0]?.nota as 1 | -1 | undefined) ?? null,
  }));
  return { conversa, mensagens: tela };
}

/** O que o chat precisa saber do usuário. A UF do cadastro é só o ponto de partida: os dados de todas são públicos. */
export function usuarioDoChat(usuario: Usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    uf: usuario.uf,
    municipio: usuario.municipio_nome,
  };
}
