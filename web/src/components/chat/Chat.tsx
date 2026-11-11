"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { apagarConversa } from "@/app/(chat)/acoes";
import type { MensagemTela } from "@/lib/conversa";
import { TEXTO_INSTABILIDADE, separarErro } from "@/lib/ndjson";
import { primeiroNome } from "@/lib/rotulos";
import { buscarUf, comArtigo, comDe } from "@/lib/ufs";
import { Avaliacao } from "./Avaliacao";
import { PerguntaUsuario, TextoResposta } from "./Mensagem";

type Props = {
  conversa: { id: string; titulo: string } | null;
  mensagensIniciais: MensagemTela[];
  usuario: {
    id: string;
    nome: string;
    uf: string;
    municipio: string;
  };
  restantes: number;
  limite: number;
};

type Falha = { texto: string; pergunta: string | null }; // pergunta != null: dá para tentar de novo

export function Chat({ conversa, mensagensIniciais, usuario, restantes, limite }: Props) {
  const router = useRouter();
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [rascunho, setRascunho] = useState("");
  const rolagem = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  // Leitura de relatório: a última pergunta fica no alto e a resposta corre abaixo dela, sem arrastar a tela até o
  // fim a cada pedaço. Se o usuário rolar por conta própria, a tela para de acompanhar até a próxima pergunta.
  const ancorar = useRef(true);
  const uf = buscarUf(usuario.uf);

  // Quando o servidor manda a versão gravada (com ids para a avaliação), ela substitui a local. Só quando chega uma
  // versão nova: reaplicar a antiga ao fim do streaming apagava a resposta até o refresh trazê-la de volta.
  const [versao, setVersao] = useState(mensagensIniciais);
  if (versao !== mensagensIniciais && !enviando) {
    setVersao(mensagensIniciais);
    setMensagens(mensagensIniciais);
  }

  useLayoutEffect(() => {
    const caixa = rolagem.current;
    const perguntas = caixa?.querySelectorAll<HTMLElement>("[data-pergunta]");
    const ultima = perguntas?.[perguntas.length - 1];
    if (!caixa || !ultima || !ancorar.current) return;
    caixa.scrollTop = Math.min(ultima.offsetTop - 24, caixa.scrollHeight - caixa.clientHeight);
  }, [mensagens]);

  function soltar() {
    const caixa = rolagem.current;
    if (caixa && caixa.scrollHeight > caixa.clientHeight) ancorar.current = false;
  }

  async function enviar(pergunta: string) {
    const texto = pergunta.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    setFalha(null);
    setRascunho("");
    ancorar.current = true;
    // Quem enviou pela sugestão continua no campo; no celular, não abre o teclado sobre a resposta.
    if (window.matchMedia("(pointer: fine)").matches) campo.current?.focus();
    setMensagens((m) => [
      ...m,
      { id: null, papel: "usuario", texto, erro: null, nota: null },
      { id: null, papel: "agente", texto: "", erro: null, nota: null },
    ]);
    const atualizarResposta = (parcial: Partial<MensagemTela>) =>
      setMensagens((m) => [...m.slice(0, -1), { ...m[m.length - 1], ...parcial }]);

    const resposta = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversa_id: conversa?.id ?? null, mensagem: texto }),
    }).catch(() => null);

    if (!resposta?.ok || !resposta.body) {
      const corpo = resposta ? await resposta.json().catch(() => null) : null;
      const recuperavel = !resposta || resposta.status >= 500;
      setMensagens((m) => m.slice(0, -2));
      setFalha({ texto: corpo?.erro ?? TEXTO_INSTABILIDADE, pergunta: recuperavel ? texto : null });
      setRascunho(recuperavel ? "" : texto);
      setEnviando(false);
      return;
    }

    const novaConversa = resposta.headers.get("X-Conversa-Id");
    const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
    let recebido = "";
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      recebido += value;
      const { texto: parcial, erro } = separarErro(recebido);
      atualizarResposta({ texto: parcial, erro });
    }
    setEnviando(false);
    if (!conversa && novaConversa) router.replace(`/c/${novaConversa}`);
    router.refresh(); // traz a versão gravada pelo n8n e atualiza a lista de conversas
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    enviar(rascunho);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();
      enviar(rascunho);
    }
  }

  const sugestoes = uf
    ? [
        `Como está ${comArtigo(uf)} no IIE?`,
        `Onde ${comArtigo(uf)} deveria agir primeiro para melhorar o IIE?`,
        "O que é o IIE e como ele é calculado?",
      ]
    : ["O que é o IIE e como ele é calculado?"];

  const semPerguntas = restantes <= 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {conversa && (
        <header className="flex items-center justify-between gap-3 border-b border-linha bg-white px-4 py-3 sm:px-8">
          <h1 className="truncate font-semibold">{conversa.titulo}</h1>
          <ApagarConversa id={conversa.id} />
        </header>
      )}

      <div
        ref={rolagem}
        onWheel={soltar}
        onTouchMove={soltar}
        className="relative flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 py-8 sm:px-8">
          {mensagens.length === 0 && (
            <section className="flex flex-col gap-5 pt-6 sm:pt-14">
              <h1 className="text-3xl font-bold">Olá, {primeiroNome(usuario.nome)}.</h1>
              <p className="max-w-[60ch] text-lg text-grafite-suave">
                Pergunte sobre o IIE {uf ? comDe(uf) : "do seu estado"} ou de qualquer outro estado: resultados, comparações e o
                que fazer para melhorar.
              </p>
              <ul className="flex flex-col gap-2" aria-label="Sugestões de pergunta">
                {sugestoes.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => enviar(s)}
                      disabled={semPerguntas}
                      className="w-full rounded-md border border-linha bg-white px-4 py-3 text-left hover:border-tinta hover:text-tinta disabled:opacity-60"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mensagens.map((m, i) =>
            m.papel === "usuario" ? (
              <PerguntaUsuario key={m.id ?? `local-${i}`} texto={m.texto} />
            ) : (
              <article key={m.id ?? `local-${i}`} aria-busy={enviando && i === mensagens.length - 1}>
                <p className="mb-1.5 text-sm font-semibold text-tinta">IIE Conselheiro</p>
                {m.texto ? <TextoResposta texto={m.texto} /> : !m.erro && <Consultando />}
                {m.erro && (
                  <div role="alert" className="mt-3 rounded-md border border-erro/40 bg-erro-fundo px-4 py-3 text-erro">
                    <p>{m.erro}</p>
                    {!enviando && i === mensagens.length - 1 && mensagens[i - 1]?.papel === "usuario" && (
                      <button
                        type="button"
                        onClick={() => enviar(mensagens[i - 1].texto)}
                        className="mt-2 font-semibold underline underline-offset-2"
                      >
                        Tentar de novo
                      </button>
                    )}
                  </div>
                )}
                {m.id && !m.erro && <Avaliacao mensagemId={m.id} usuarioId={usuario.id} notaInicial={m.nota} />}
              </article>
            ),
          )}

          {falha && (
            <div role="alert" className="rounded-md border border-erro/40 bg-erro-fundo px-4 py-3 text-erro">
              <p>{falha.texto}</p>
              {falha.pergunta && (
                <button
                  type="button"
                  onClick={() => enviar(falha.pergunta!)}
                  className="mt-2 font-semibold underline underline-offset-2"
                >
                  Tentar de novo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={aoEnviar} className="border-t border-linha bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:px-8">
          <label htmlFor="pergunta" className="sr-only">
            Sua pergunta
          </label>
          <div className="flex items-end gap-2">
            <textarea
              ref={campo}
              id="pergunta"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={aoTeclar}
              rows={1}
              maxLength={2000}
              disabled={semPerguntas}
              placeholder={semPerguntas ? "Limite de hoje atingido" : "Escreva sua pergunta"}
              className="max-h-48 min-h-12 flex-1 resize-none rounded-md border border-linha px-3 py-2.5 [field-sizing:content] placeholder:text-grafite-suave/80 disabled:bg-papel"
            />
            <button
              type="submit"
              disabled={enviando || semPerguntas || !rascunho.trim()}
              className="h-12 rounded-md bg-tinta px-5 font-semibold text-white hover:bg-tinta-escura disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-xs text-grafite-suave">
            {semPerguntas ? (
              <p className="numeros font-semibold text-grafite">
                Você usou as {limite} perguntas de hoje. O limite renova à meia-noite (horário de Brasília).
              </p>
            ) : (
              <>
                <p className="min-w-0 flex-1 basis-80">
                  Dados oficiais do IIE de todos os estados; ainda não há dados de{" "}
                  {usuario.municipio}. O Conselheiro pode errar: confira as fontes citadas.
                </p>
                <p className={`numeros shrink-0 ${restantes <= 5 ? "font-semibold text-grafite" : ""}`}>
                  {restantes} de {limite} perguntas restantes hoje
                </p>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/** Espera pela resposta. Depois de alguns segundos, explica a demora (consultas com ferramenta levam 15 s ou mais). */
function Consultando() {
  const [demorando, setDemorando] = useState(false);
  useEffect(() => {
    const espera = setTimeout(() => setDemorando(true), 8000);
    return () => clearTimeout(espera);
  }, []);
  return (
    <div role="status" className="flex flex-col gap-1 text-grafite-suave">
      <p className="flex items-center gap-2.5">
        <span aria-hidden className="pulsar size-2 rounded-full bg-tinta" />
        Consultando os dados do IIE…
      </p>
      {demorando && <p className="text-sm">Respostas que cruzam vários dados podem levar até um minuto.</p>}
    </div>
  );
}

function ApagarConversa({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="shrink-0 text-sm text-grafite-suave underline underline-offset-2 hover:text-erro">
        Apagar conversa
      </button>
    );
  }
  return (
    <form action={apagarConversa} className="flex shrink-0 items-center gap-3 text-sm">
      <input type="hidden" name="id" value={id} />
      <span>Apagar de vez?</span>
      <button type="submit" className="font-semibold text-erro underline underline-offset-2">
        Apagar
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="underline underline-offset-2">
        Cancelar
      </button>
    </form>
  );
}
