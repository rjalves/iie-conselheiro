import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TopoSimples } from "@/components/TopoSimples";
import { acessoDoUsuario, resumirAcesso } from "@/lib/acesso";
import { PERFIS, STATUS, type Perfil, type Status } from "@/lib/rotulos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { obterUsuario } from "@/lib/usuario";
import { BotaoDecisao } from "./BotaoDecisao";
import { EditarEstados } from "./EditarEstados";

export const metadata: Metadata = { title: "Cadastros" };

const ABAS: Status[] = ["pendente", "ativo", "recusado", "bloqueado"];
const ACOES: Record<Status, ("ativo" | "recusado" | "bloqueado")[]> = {
  pendente: ["ativo", "recusado"],
  ativo: ["bloqueado"],
  recusado: ["ativo"],
  bloqueado: ["ativo"],
};

export default async function PaginaAdmin({ searchParams }: PageProps<"/admin">) {
  const admin = await obterUsuario();
  if (!admin) redirect("/entrar");
  if (admin.papel !== "admin" || admin.status !== "ativo") redirect("/");

  const { status: pedido } = await searchParams;
  const aba = ABAS.includes(pedido as Status) ? (pedido as Status) : "pendente";
  const supabase = await criarClienteServidor();
  // ponytail: carrega todos os cadastros e filtra aqui; paginar quando passar de alguns milhares.
  const { data } = await supabase
    .from("usuario")
    .select("id, nome, email, perfil, instituicao, uf, ufs_acesso, municipio_nome, status, papel, criado_em")
    .order("criado_em", { ascending: false });
  const usuarios = data ?? [];
  const contagem = Object.fromEntries(ABAS.map((s) => [s, usuarios.filter((u) => u.status === s).length]));
  const lista = usuarios.filter((u) => u.status === aba);

  return (
    <>
      <TopoSimples />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Cadastros</h1>
        <nav aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
          {ABAS.map((s) => (
            <Link
              key={s}
              href={`/admin?status=${s}`}
              aria-current={s === aba ? "page" : undefined}
              className={`numeros rounded-md border px-3 py-1.5 ${
                s === aba ? "border-tinta bg-tinta text-white" : "border-linha bg-white hover:border-tinta"
              }`}
            >
              {STATUS[s]} ({contagem[s]})
            </Link>
          ))}
        </nav>

        {lista.length === 0 ? (
          <p className="rounded-md border border-linha bg-white px-5 py-8 text-grafite-suave">
            {aba === "pendente" ? "Nenhum cadastro esperando análise." : `Nenhum cadastro com a situação “${STATUS[aba]}”.`}
          </p>
        ) : (
          <div className="relative overflow-x-auto rounded-md border border-linha bg-white">
            {/* relative: o rótulo sr-only da última coluna fica dentro da rolagem, sem alargar a página no celular. */}
            <table className="w-full min-w-[54rem] text-left">
              <thead className="border-b border-linha text-sm whitespace-nowrap text-grafite-suave">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Pessoa</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Onde trabalha</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Município</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estados liberados</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Cadastro</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id} className="border-b border-linha last:border-0">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{u.nome}</p>
                      <p className="text-sm [overflow-wrap:anywhere] text-grafite-suave">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p>{u.instituicao}</p>
                      <p className="text-sm text-grafite-suave">{PERFIS[u.perfil as Perfil] ?? u.perfil}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {u.municipio_nome}, {u.uf}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {u.papel === "admin" ? (
                        <span>Todos (administrador)</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span>{resumirAcesso(acessoDoUsuario(u))}</span>
                          <EditarEstados id={u.id} nome={u.nome} ufs={u.ufs_acesso} />
                        </div>
                      )}
                    </td>
                    <td className="numeros px-4 py-3 align-top text-sm">
                      {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {u.id === admin.id ? (
                        <span className="text-sm text-grafite-suave">Você</span>
                      ) : (
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          {ACOES[aba].map((acao) => (
                            <BotaoDecisao key={acao} id={u.id} status={acao} nome={u.nome} />
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
