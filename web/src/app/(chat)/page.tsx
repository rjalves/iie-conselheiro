import { Chat } from "@/components/chat/Chat";
import { limiteDiario, perguntasRestantes } from "@/lib/conversa";
import { obterUsuario } from "@/lib/usuario";

/** Conversa nova: saudação e sugestões. A conversa é criada na primeira pergunta. */
export default async function PaginaNovaConversa() {
  const usuario = (await obterUsuario())!; // o layout já garantiu usuário ativo
  return (
    <Chat
      key="nova"
      conversa={null}
      mensagensIniciais={[]}
      usuario={{ id: usuario.id, nome: usuario.nome, uf: usuario.uf, municipio: usuario.municipio_nome }}
      restantes={await perguntasRestantes()}
      limite={limiteDiario()}
    />
  );
}
