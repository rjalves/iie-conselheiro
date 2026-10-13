"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { SENHA_MINIMA, traduzirErroAuth, validarCadastro, type CamposCadastro, type ErrosCadastro } from "@/lib/cadastro";
import { PERFIS } from "@/lib/rotulos";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { UFS } from "@/lib/ufs";

type Municipio = { codigo: string; nome: string };

export function FormCadastro() {
  const router = useRouter();
  const [uf, setUf] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipioNome, setMunicipioNome] = useState("");
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!uf) return;
    let ativo = true;
    fetch(`/municipios/${uf}.json`)
      .then((r) => r.json())
      .then((lista: Municipio[]) => ativo && setMunicipios(lista))
      .catch(() => ativo && setErroGeral("Não foi possível carregar os municípios. Recarregue a página."));
    return () => {
      ativo = false;
    };
  }, [uf]);

  const municipio = municipios.find((m) => m.nome.toLowerCase() === municipioNome.trim().toLowerCase());

  async function criarConta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const campos: CamposCadastro = {
      nome: String(dados.get("nome") ?? ""),
      email: String(dados.get("email") ?? "").trim(),
      senha: String(dados.get("senha") ?? ""),
      perfil: String(dados.get("perfil") ?? ""),
      instituicao: String(dados.get("instituicao") ?? ""),
      uf,
      municipio_ibge: municipio?.codigo ?? "",
      municipio_nome: municipio?.nome ?? "",
      aceite: dados.get("aceite") === "on",
    };
    const encontrados = validarCadastro(campos);
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    const { data, error } = await criarClienteNavegador().auth.signUp({
      email: campos.email,
      password: campos.senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmar?proxima=/aguardando`,
        data: {
          nome: campos.nome.trim(),
          perfil: campos.perfil,
          instituicao: campos.instituicao.trim(),
          uf: campos.uf,
          municipio_ibge: campos.municipio_ibge,
          municipio_nome: campos.municipio_nome,
          aceite_termo: true,
        },
      },
    });
    setEnviando(false);
    if (error) {
      setErroGeral(traduzirErroAuth(error.message));
      return;
    }
    if (data.session) {
      router.replace("/aguardando");
      router.refresh();
    } else {
      setConfirmarEmail(campos.email);
    }
  }

  if (confirmarEmail) {
    return (
      <Aviso tipo="sucesso">
        <p className="font-semibold">Confirme seu e-mail para continuar.</p>
        <p className="mt-1">
          Enviamos um link para <strong>{confirmarEmail}</strong>. Abra o link para ativar a conta. Depois, a equipe do
          IIE analisa seu cadastro.
        </p>
      </Aviso>
    );
  }

  return (
    <form onSubmit={criarConta} className="flex flex-col gap-5" noValidate>
      {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
      <Campo rotulo="Nome completo" id="nome" erro={erros.nome}>
        <Entrada id="nome" name="nome" autoComplete="name" invalido={!!erros.nome} />
      </Campo>
      <Campo rotulo="E-mail" id="email" erro={erros.email} ajuda="De preferência, o e-mail da instituição.">
        <Entrada id="email" name="email" type="email" autoComplete="email" invalido={!!erros.email} />
      </Campo>
      <Campo rotulo="Senha" id="senha" erro={erros.senha} ajuda={`Pelo menos ${SENHA_MINIMA} caracteres.`}>
        <Entrada id="senha" name="senha" type="password" autoComplete="new-password" invalido={!!erros.senha} />
      </Campo>
      <Campo rotulo="Onde você trabalha" id="perfil" erro={erros.perfil}>
        <Selecao id="perfil" name="perfil" defaultValue="" invalido={!!erros.perfil}>
          <option value="" disabled>
            Escolha uma opção
          </option>
          {Object.entries(PERFIS)
            .filter(([valor]) => valor !== "equipe_interna")
            .map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Instituição" id="instituicao" erro={erros.instituicao} ajuda="Ex.: Secretaria de Educação do Ceará">
        <Entrada id="instituicao" name="instituicao" autoComplete="organization" invalido={!!erros.instituicao} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
        <Campo rotulo="Estado" id="uf" erro={erros.uf}>
          <Selecao
            id="uf"
            value={uf}
            invalido={!!erros.uf}
            onChange={(e) => {
              setUf(e.target.value);
              setMunicipios([]);
              setMunicipioNome("");
            }}
          >
            <option value="" disabled>
              UF
            </option>
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.sigla}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo
          rotulo="Município"
          id="municipio"
          erro={erros.municipio_ibge}
          ajuda={uf ? "Comece a digitar e escolha na lista." : "Escolha o estado primeiro."}
        >
          <Entrada
            id="municipio"
            list="lista-municipios"
            value={municipioNome}
            onChange={(e) => setMunicipioNome(e.target.value)}
            disabled={!uf}
            autoComplete="off"
            invalido={!!erros.municipio_ibge}
          />
          <datalist id="lista-municipios">
            {municipios.map((m) => (
              <option key={m.codigo} value={m.nome} />
            ))}
          </datalist>
        </Campo>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="aceite"
            className="mt-1 size-5 accent-tinta"
            aria-invalid={!!erros.aceite || undefined}
            aria-describedby={erros.aceite ? "aceite-erro" : undefined}
          />
          <span>
            Li e aceito o{" "}
            <Link href="/termo" target="_blank" className="font-semibold text-tinta underline underline-offset-2">
              termo de uso
            </Link>
            , que explica como meus dados e minhas perguntas são usados.
          </span>
        </label>
        {erros.aceite && (
          <p id="aceite-erro" className="text-sm font-semibold text-erro">
            {erros.aceite}
          </p>
        )}
      </div>
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Criando a conta…" : "Criar conta"}
      </Botao>
      <p className="text-sm">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-tinta underline underline-offset-2">
          Entrar
        </Link>
      </p>
    </form>
  );
}
