import type { Metadata } from "next";
import { Aviso } from "@/components/ui";
import { caminhoSeguro } from "@/lib/caminho";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar" };

const RECADOS: Record<string, { tipo: "sucesso" | "erro"; texto: string }> = {
  "conta=excluida": { tipo: "sucesso", texto: "Sua conta e todas as suas conversas foram excluídas." },
  "senha=alterada": { tipo: "sucesso", texto: "Senha alterada. Entre com a nova senha." },
  "link=invalido": { tipo: "erro", texto: "O link expirou ou já foi usado. Peça um novo para continuar." },
};

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const parametros = await searchParams;
  const recado = Object.entries(RECADOS).find(([chave]) => {
    const [nome, valor] = chave.split("=");
    return parametros[nome] === valor;
  })?.[1];
  const proxima = caminhoSeguro(typeof parametros.proxima === "string" ? parametros.proxima : null);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Entrar</h1>
        <p className="mt-2 text-grafite-suave">
          Converse sobre o Índice de Inclusão Educacional do seu estado e receba sugestões de práticas de gestão.
        </p>
      </div>
      {recado && <Aviso tipo={recado.tipo}>{recado.texto}</Aviso>}
      <FormEntrar proxima={proxima} />
    </div>
  );
}
