import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BarraLateral } from "@/components/chat/BarraLateral";
import { Moldura } from "@/components/chat/Moldura";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { obterUsuario } from "@/lib/usuario";

/** Chat: só para usuários ativos. A barra lateral lista as conversas (RLS: só as do próprio usuário). */
export default async function LayoutChat({ children }: { children: ReactNode }) {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar");
  if (usuario.status !== "ativo") redirect("/aguardando");

  const supabase = await criarClienteServidor();
  // ponytail: as 100 conversas mais recentes; paginar se algum gestor passar disso.
  const { data: conversas } = await supabase
    .from("conversa")
    .select("id, titulo, atualizada_em")
    .order("atualizada_em", { ascending: false })
    .limit(100);

  return (
    <Moldura
      barra={
        <BarraLateral
          conversas={conversas ?? []}
          nome={usuario.nome}
          local={`${usuario.municipio_nome}, ${usuario.uf}`}
          admin={usuario.papel === "admin"}
        />
      }
    >
      {children}
    </Moldura>
  );
}
