import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Chat } from "@/components/chat/Chat";
import { carregarConversa, limiteDiario, perguntasRestantes } from "@/lib/conversa";
import { obterUsuario } from "@/lib/usuario";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  const dados = UUID.test(id) ? await carregarConversa(id) : null;
  return { title: dados?.conversa.titulo ?? "Conversa" };
}

export default async function PaginaConversa({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const dados = UUID.test(id) ? await carregarConversa(id) : null;
  if (!dados) notFound();
  const usuario = (await obterUsuario())!;
  return (
    <Chat
      key={id}
      conversa={dados.conversa}
      mensagensIniciais={dados.mensagens}
      usuario={{ id: usuario.id, nome: usuario.nome, uf: usuario.uf, municipio: usuario.municipio_nome }}
      restantes={await perguntasRestantes()}
      limite={limiteDiario()}
    />
  );
}
