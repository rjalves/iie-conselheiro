/*
 * Contrato de direção (impeccable; superfície nova no mundo existente, composição fixada pela referência do usuário).
 * THESIS: o IIE vira decisão de gestão; recusa o "hero + três cartões iguais" de produto de IA.
 * OWN-WORLD: caderno escolar, caneta azul e marca-texto. Folha branca arredondada sobre azul-claro; cartões em
 *   tinta-clara pautada, marca-texto amarelo e tinta escura; pílulas de contorno; Atkinson Hyperlegible.
 * STORY: o gestor entende o que é o IIE e onde a geração se perde, vê que o Conselheiro responde com dado e fonte,
 *   e cria a conta (ou entra).
 * FIRST VIEWPORT: à esquerda, título grande com "decisões de gestão" em tinta sobre marca-texto, texto, selo
 *   giratório e os botões Criar conta e Entrar; à direita, grade de cartões: 100 pontos (15 cheios), três
 *   referenciais, 27 UFs, 541 práticas e um trecho de conversa real com "Experimente agora".
 * FORM: composição fixada pela referência anexada pelo usuário (EduDesigns, imagem 2.png da conversa de 2026-11-11);
 *   dispensa explícita do sorteio de conceito (concept-seed não rodou), porque a direção fixada pelo usuário prevalece.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict,
 *   DESIGN.md, and every shipping raster carrying its provenance
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { GradeGeracao } from "@/components/GradeGeracao";
import { IconeLupa, Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";

export const metadata: Metadata = {
  title: { absolute: "IIE Conselheiro: do IIE à decisão de gestão" },
  description:
    "Agente de inteligência artificial para secretarias de educação: explica o Índice de Inclusão Educacional (IIE), mostra onde agir primeiro e sugere práticas de gestão com fonte.",
};

// Brasil, série do painel do IIE (contexto/anexos/iie_uf_painel_2015_2023.csv). O IIE 2023 é preliminar.
const SERIE = [
  { ano: 2015, iie: 9.5 },
  { ano: 2017, iie: 13.5 },
  { ano: 2019, iie: 18.9 },
  { ano: 2021, iie: 17.0 },
  { ano: 2023, iie: 15.5, preliminar: true },
];

// Logos em public/parceiros/. Sem arquivo oficial, o nome aparece em texto até a instituição enviar a logo.
const PARCEIROS: { nome: string; logo?: { src: string; largura: number; altura: number } }[] = [
  { nome: "Instituto Natura" },
  { nome: "Todos Pela Educação", logo: { src: "/parceiros/todos-pela-educacao.png", largura: 432, altura: 108 } },
  { nome: "B3 Social" },
];

const SECOES = [
  { id: "iie", nome: "O IIE" },
  { id: "problemas", nome: "Problemas" },
  { id: "como-funciona", nome: "Como funciona" },
  { id: "vantagens", nome: "Vantagens" },
];

const PERGUNTAS = [
  "Como está meu estado no IIE?",
  "Onde agir primeiro?",
  "Evasão",
  "Atraso escolar",
  "Aprendizagem em LP e MT",
  "Comparar com o Brasil",
  "Ranking das UFs",
  "Busca ativa",
  "Formação de diretores",
  "Quando o resultado aparece?",
];

const DIMENSOES = [
  { nome: "Acesso e permanência", texto: "Quem saiu da escola continua na conta.", fonte: "PNAD Contínua (IBGE)" },
  { nome: "Fluxo", texto: "Só conta quem concluiu até os 18 anos.", fonte: "Censo Escolar (INEP)" },
  { nome: "Conclusão", texto: "É preciso ser aprovado na série final do Ensino Médio.", fonte: "Censo Escolar (INEP)" },
  { nome: "Aprendizagem", texto: "300 pontos ou mais em Português e em Matemática.", fonte: "SAEB (INEP)" },
];

const PROBLEMAS = [
  {
    titulo: "Painel sem orientação",
    situacao: "O gestor vê que um indicador piorou, mas o painel não diz por quê nem o que fazer.",
    resposta: "O Conselheiro decompõe o IIE e mostra onde a geração se perde.",
  },
  {
    titulo: "Indicador lido fora de contexto",
    situacao:
      "A média de uma série pode cair quando mais jovens atrasados chegam ao fim do Ensino Médio, mesmo com a geração aprendendo mais.",
    resposta: "O Conselheiro lê a geração inteira e avisa quando o dado tem problema.",
  },
  {
    titulo: "Prioridade por percepção",
    situacao: "Sem decompor o problema, a gestão ataca o que é mais visível, não o que mais pesa.",
    resposta: "O Conselheiro calcula quantos pontos cada componente pode render.",
    destaque: true,
  },
  {
    titulo: "Conhecimento disperso",
    situacao: "As boas práticas existem, mas em documentos longos. Só três referenciais somam 541 práticas.",
    resposta: "O Conselheiro liga cada indicador às práticas certas, com código e fonte.",
  },
  {
    titulo: "Rotatividade das equipes",
    situacao:
      "A cada troca de governo, a memória técnica se perde e o diagnóstico recomeça do zero. O próximo ciclo estadual começa em janeiro de 2027.",
    resposta: "O Conselheiro deixa o diagnóstico a uma pergunta de distância, para qualquer equipe.",
  },
];

// Prefeituras que usaram IA nos últimos 12 meses, por porte (Cetic.br/NIC.br, TIC Governo 2025; visao_de_negocio.md, 1.1).
const IA_POR_PORTE = [
  { rotulo: "Até 10 mil habitantes", valor: 22 },
  { rotulo: "De 10 mil a 100 mil", valor: 27 },
  { rotulo: "De 100 mil a 500 mil", valor: 54 },
  { rotulo: "Mais de 500 mil", valor: 85 },
];

const VANTAGENS = [
  {
    titulo: "Práticas que se pode conferir",
    texto: "Cada sugestão traz o código e o documento de origem: MEC, Itaú Social ou Todos Pela Educação.",
  },
  {
    titulo: "Fluência em dados sem equipe de TI",
    texto: "A leitura do indicador vem pronta, em linguagem simples. Serve à secretaria que não tem analista de dados.",
  },
  {
    titulo: "Diagnóstico que atravessa gestões",
    texto: "Quem chega à secretaria encontra a leitura do território a uma pergunta de distância, sem recomeçar do zero.",
  },
  {
    titulo: "Números auditáveis",
    texto:
      "Cada resposta fica registrada com as consultas usadas. Quando o dado tem problema conhecido, o Conselheiro avisa antes de interpretar.",
  },
];

const PASSOS = [
  {
    titulo: "Pergunte do seu jeito",
    texto: "Sobre o seu estado, um indicador ou uma prática. Em linguagem simples, no seu ritmo.",
  },
  {
    titulo: "O Conselheiro consulta as bases",
    texto:
      "O IIE por estado, de 2015 a 2023, e o catálogo de 541 práticas. Todo número vem de uma consulta, nunca da memória do modelo.",
  },
  {
    titulo: "Receba o caminho",
    texto:
      "Diagnóstico com semáforo, a prioridade pelo ganho potencial, práticas com código e fonte e o que acompanhar até o resultado aparecer.",
  },
];

// Quando uma ação aparece no IIE, que mede o fim do Ensino Médio (projeto/visao_de_negocio.md, 3.2).
const PRAZOS = [
  { etapa: "Ensino Médio", de: 0, ate: 3 },
  { etapa: "Anos Finais", de: 4, ate: 7 },
  { etapa: "Anos Iniciais e alfabetização", de: 8, ate: 11 },
];

const virgula = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const tituloSecao = "text-4xl leading-[1.06] font-bold tracking-[-0.025em] sm:text-5xl lg:text-[3.4rem]";
const botao = "inline-flex items-center justify-center rounded-full px-7 py-3.5 font-semibold transition-colors";
const botaoTinta = `${botao} bg-tinta text-white shadow-[0_10px_22px_-12px_rgb(29_58_138/0.75)] hover:bg-tinta-escura`;
const pilula =
  "inline-flex w-fit items-center rounded-full border border-grafite px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-grafite hover:text-white";
const fundoEscuro =
  "bg-tinta-escura bg-[image:radial-gradient(110%_70%_at_100%_0%,rgb(61_96_186/0.5)_0%,transparent_70%),radial-gradient(80%_50%_at_0%_100%,rgb(9_22_56/0.7)_0%,transparent_75%)] text-white";

/** Página de apresentação. Quem não entrou vê esta página em "/" (o proxy reescreve a raiz para /inicio). */
export default function PaginaInicio() {
  return (
    <div className="bg-tinta-clara p-2 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl rounded-[1.75rem] bg-white shadow-[0_32px_72px_-32px_rgb(21_43_102/0.45),0_2px_8px_rgb(21_43_102/0.06)]">
        <Cabecalho />
        <main>
          <Abertura />
          <Parceiros />
          <SobreIie />
          <Problemas />
          <ComoFunciona />
          <Vantagens />
          <Convite />
        </main>
        <Creditos />
      </div>
    </div>
  );
}

function Cabecalho() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 sm:pt-7 lg:px-14">
      <Marca />
      <nav aria-label="Seções da página" className="hidden items-center gap-7 text-grafite-suave lg:flex">
        {SECOES.map((secao) => (
          <a key={secao.id} href={`#${secao.id}`} className="underline-offset-8 hover:text-grafite hover:underline">
            {secao.nome}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-5">
        <Link href="/entrar" className="font-semibold text-tinta hover:text-tinta-escura max-sm:hidden">
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="rounded-full border-2 border-grafite px-5 py-2 font-semibold transition-colors hover:bg-grafite hover:text-white"
        >
          Criar conta
        </Link>
      </div>
    </header>
  );
}

function Abertura() {
  return (
    <section className="grid gap-x-12 gap-y-12 px-5 pt-10 pb-16 sm:px-10 lg:px-14 lg:pt-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] xl:grid-rows-[auto_1fr] xl:pb-24">
      <div className="xl:col-start-1 xl:row-start-1">
        <h1 className="text-[2.6rem] leading-[1.04] font-bold tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem] xl:text-[4.4rem]">
          Transforme o IIE da sua rede em <span className="marcado text-tinta">decisões de gestão</span>
        </h1>
        <div className="mt-7 flex items-center gap-8">
          <p className="max-w-[33rem] text-lg text-grafite-suave">
            Um agente de inteligência artificial para secretarias estaduais e municipais de educação. Ele explica os
            resultados do Índice de Inclusão Educacional, mostra onde agir primeiro e sugere práticas de gestão com
            fonte.
          </p>
          <Selo />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/cadastro" className={botaoTinta}>
            Criar conta
          </Link>
          <Link href="/entrar" className={`${botao} bg-marca text-grafite hover:brightness-95`}>
            Entrar
          </Link>
        </div>
        <p className="mt-3 text-sm text-grafite-suave">O acesso é liberado assim que você cria a conta.</p>
      </div>

      <Painel />

      {/* No xl, os números e as perguntas fecham a coluna esquerda junto com a conversa, à direita. */}
      <div className="xl:col-start-1 xl:row-start-2 xl:self-end">
        <div className="mb-12 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex flex-col justify-end rounded-[1.6rem] bg-marca p-5 sm:p-6">
            <p className="numeros text-5xl font-bold tracking-tight sm:text-6xl">27</p>
            <p className="mt-2 leading-snug">estados com a série do IIE, de 2015 a 2023</p>
          </div>
          <div className="flex flex-col justify-end rounded-[1.6rem] bg-tinta-clara p-5 sm:p-6">
            <p className="numeros text-5xl font-bold tracking-tight text-tinta sm:text-6xl">541</p>
            <p className="mt-2 leading-snug">práticas de gestão, cada uma com código e fonte</p>
          </div>
        </div>
        <h2 className="max-w-md border-b-2 border-grafite pb-2 text-2xl font-semibold">O que você pode perguntar</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {PERGUNTAS.map((pergunta) => (
            <li key={pergunta} className="rounded-md bg-tinta-clara px-2.5 py-1 text-sm text-tinta-escura">
              {pergunta}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Selo que gira devagar em volta da lupa (para quando o sistema pede menos movimento). */
function Selo() {
  return (
    <div aria-hidden className="relative size-28 shrink-0 max-sm:hidden">
      <svg viewBox="0 0 120 120" className="girar size-full">
        <defs>
          <path id="selo-circulo" d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
        </defs>
        <text className="fill-grafite text-[10.5px] font-semibold">
          <textPath href="#selo-circulo" textLength="292" lengthAdjust="spacing">
            de cada 100 jovens · quantos concluem e aprendem? ·
          </textPath>
        </text>
      </svg>
      <span className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-tinta-clara">
        <IconeLupa className="size-7 text-tinta" />
      </span>
    </div>
  );
}

function Painel() {
  return (
    <div className="grid grid-cols-12 gap-3 self-start sm:gap-4 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:grid-rows-[auto_1fr] xl:self-stretch">
      <div className="pautado col-span-12 flex flex-col gap-5 rounded-[1.6rem] bg-tinta-clara py-6 pr-6 pl-12 sm:col-span-7">
        <GradeGeracao clara />
        <p className="text-xl leading-snug font-bold">
          De cada 100 jovens, 15 concluem o Ensino Médio até os 18 anos com o básico em Português e Matemática.
        </p>
        <p className="-mt-2 text-sm text-grafite-suave">Brasil, IIE 2023 (nascidos em 2006), dado preliminar.</p>
        <a href="#iie" className={pilula}>
          Entenda o IIE
        </a>
      </div>

      <div className="col-span-12 flex flex-col justify-between gap-6 rounded-[1.6rem] bg-marca p-6 sm:col-span-5">
        <p className="text-xl leading-snug font-bold">Práticas de gestão de três referenciais públicos</p>
        <div>
          <ul className="flex -space-x-2.5">
            {[
              { sigla: "MEC", nome: "Ministério da Educação", tom: "bg-white text-tinta" },
              { sigla: "IS", nome: "Itaú Social", tom: "bg-tinta text-white" },
              { sigla: "TPE", nome: "Todos Pela Educação", tom: "bg-tinta-escura text-marca" },
            ].map((ref) => (
              <li
                key={ref.sigla}
                title={ref.nome}
                className={`grid size-12 place-items-center rounded-full text-xs font-bold ring-[3px] ring-marca ${ref.tom}`}
              >
                <abbr title={ref.nome} className="no-underline">
                  {ref.sigla}
                </abbr>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-snug">MEC, Itaú Social e Todos Pela Educação</p>
        </div>
        <a href="#como-funciona" className={pilula}>
          Como funciona
        </a>
      </div>

      <Conversa />
    </div>
  );
}

/** Trecho de conversa com os números do painel do IIE 2023 e práticas reais do catálogo. */
function Conversa() {
  return (
    <figure className={`col-span-12 flex flex-col justify-between rounded-[1.6rem] p-5 sm:p-7 ${fundoEscuro}`}>
      <div className="flex flex-col gap-4">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/12 px-4 py-2.5">Como está o Ceará no IIE?</p>
        <div className="flex gap-3">
          <IconeLupa className="mt-0.5 size-6 shrink-0 text-white" />
          <div className="flex flex-col gap-2 leading-relaxed text-white/90">
            <p>
              <strong className="font-bold text-marca">Ceará: IIE 2023 de 18,1</strong>, 5º entre as 27 UFs (Brasil:
              15,5).
            </p>
            <p>Ponto forte: só 15,3% dos alunos têm 2 anos ou mais de atraso (Brasil: 25,7%).</p>
            <p>
              Atenção: o índice caiu de 21,4, em 2021, para 18,1, e a parcela abaixo do básico no SAEB subiu de 75,2%
              para 77,7%.
            </p>
            <p className="pt-1 text-sm font-semibold text-white">Práticas para a aprendizagem:</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li className="rounded-full bg-white/10 px-3 py-1">Mapas de Foco · Itaú Social, SM-84</li>
              <li className="rounded-full bg-white/10 px-3 py-1">Observação de aula com devolutiva · MEC, GE-68</li>
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4 text-sm text-white/75">
        Exemplo de conversa, com os dados do IIE 2023.
        <Link
          href="/cadastro"
          className="rounded-full border border-white/70 px-5 py-2 font-semibold text-white transition-colors hover:bg-white hover:text-tinta-escura"
        >
          Experimente agora
        </Link>
      </figcaption>
    </figure>
  );
}

function Parceiros() {
  return (
    <section
      aria-labelledby="titulo-parceiros"
      className="border-t border-linha px-5 py-10 text-center sm:px-10 lg:px-14 lg:py-12"
    >
      <h2 id="titulo-parceiros" className="text-lg font-semibold text-grafite-suave">
        Instituições parceiras e apoiadoras do IIE Conselheiro
      </h2>
      <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
        {PARCEIROS.map((parceiro) => (
          <li key={parceiro.nome} className="flex h-14 items-center">
            {parceiro.logo ? (
              <Image
                src={parceiro.logo.src}
                width={parceiro.logo.largura}
                height={parceiro.logo.altura}
                alt={parceiro.nome}
                className="h-12 w-auto"
              />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-grafite">{parceiro.nome}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SobreIie() {
  return (
    <section
      id="iie"
      aria-labelledby="titulo-iie"
      className="grid scroll-mt-4 gap-12 border-t border-linha px-5 py-16 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16 lg:px-14 lg:py-24"
    >
      <div>
        <h2 id="titulo-iie" className={tituloSecao}>
          O que é o <span className="text-tinta">IIE</span>
        </h2>
        <p className="mt-6 max-w-[36rem] text-lg text-grafite-suave">
          O Índice de Inclusão Educacional é um indicador público, criado pela Metas Sociais a pedido do Instituto
          Natura. Ele responde a uma pergunta simples:
        </p>
        <blockquote className="mt-5 max-w-[34rem] text-2xl leading-snug font-bold sm:text-[1.75rem]">
          De cada 100 jovens de uma geração, quantos terminaram a educação básica{" "}
          <span className="marcado">no tempo certo e aprendendo o essencial?</span>
        </blockquote>
        <p className="mt-6 max-w-[36rem] text-grafite-suave">
          Conta como incluído quem concluiu o Ensino Médio até os 18 anos com pelo menos o nível básico, 300 pontos no
          SAEB, em Língua Portuguesa e em Matemática. Quem atrasou ou saiu da escola continua na conta: o índice
          acompanha a geração inteira, não só quem chegou ao fim.
        </p>
        <dl className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {DIMENSOES.map((dimensao) => (
            <div key={dimensao.nome} className="border-t-2 border-grafite pt-3">
              <dt className="text-lg font-bold">{dimensao.nome}</dt>
              <dd className="mt-1 text-grafite-suave">{dimensao.texto}</dd>
              <dd className="mt-1 text-sm font-semibold text-tinta">{dimensao.fonte}</dd>
            </div>
          ))}
        </dl>
      </div>

      <figure className="self-start rounded-[1.6rem] bg-tinta-clara p-6 sm:p-8 lg:sticky lg:top-6">
        <figcaption className="text-xl font-bold">IIE do Brasil, de 2015 a 2023</figcaption>
        <GraficoSerie />
        <ul className="mt-8 flex flex-col gap-4 border-t border-tinta/15 pt-6">
          <li>Depois do pico de 2019, o índice caiu em 2021 e de novo em 2023.</li>
          <li>
            Em 2023, o IIE do Paraná (<strong className="numeros">20,4</strong>), o maior do país, foi 3,6 vezes o do
            Amapá (<strong className="numeros">5,6</strong>), o menor.
          </li>
          <li>
            Cada ponto a mais de IIE se associa a <strong>0,83 ponto percentual</strong> a menos de pobreza aos 23 anos,
            segundo os estudos feitos com o índice.
          </li>
        </ul>
        <p className="mt-6 text-sm text-grafite-suave">
          Fontes: INEP (Censo Escolar e SAEB) e IBGE (PNAD Contínua). O IIE 2023 é preliminar e pode mudar com o Censo
          Escolar de 2024.
        </p>
      </figure>
    </section>
  );
}

/** Barras da série do Brasil. Uma série só: sem legenda; 2023 hachurado por ser preliminar. */
function GraficoSerie() {
  const descricao = SERIE.map((p) => `${p.ano}: ${virgula(p.iie)}${p.preliminar ? " (preliminar)" : ""}`).join("; ");
  return (
    <div role="img" aria-label={`IIE do Brasil. ${descricao}.`} className="mt-6">
      <div aria-hidden className="flex h-56 items-end gap-3 border-b border-grafite/45 sm:gap-6">
        {SERIE.map((p) => (
          <div key={p.ano} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="numeros text-sm font-bold">{virgula(p.iie)}</span>
            <span
              className={`w-full max-w-16 rounded-t-[4px] ${p.preliminar ? "hachurado" : "bg-tinta"}`}
              style={{ height: `calc((100% - 1.75rem) * ${p.iie / 20})` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-2 flex gap-3 sm:gap-6">
        {SERIE.map((p) => (
          <span key={p.ano} className="numeros flex-1 text-center text-sm leading-tight text-grafite-suave">
            {p.ano}
            {p.preliminar && <span className="block text-xs">preliminar</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function Problemas() {
  return (
    <section
      id="problemas"
      aria-labelledby="titulo-problemas"
      className="grid scroll-mt-4 gap-10 px-5 pt-4 pb-16 sm:px-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-14 lg:px-14 lg:pb-24"
    >
      <div className="lg:sticky lg:top-6 lg:self-start">
        <h2 id="titulo-problemas" className={tituloSecao}>
          O dado existe. <span className="text-tinta">Falta o caminho</span> até a decisão.
        </h2>
        <p className="mt-6 text-lg text-grafite-suave">
          A educação é uma das áreas com mais dados públicos no Brasil: Censo Escolar, SAEB, IDEB, PNAD. O que falta é
          ligar o número à decisão, e essa distância é maior onde há menos estrutura.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <ol className="margem rounded-[1.6rem] bg-tinta-clara py-1 pr-6 pl-12 sm:pr-8">
          {PROBLEMAS.map((problema) => (
            <li
              key={problema.titulo}
              className="grid gap-3 border-b border-tinta/15 py-6 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-10"
            >
              <div>
                <h3 className="text-xl leading-snug font-bold">
                  {problema.destaque ? <span className="marcado">{problema.titulo}</span> : problema.titulo}
                </h3>
                <p className="mt-1.5 text-grafite-suave">{problema.situacao}</p>
              </div>
              <p className="flex gap-2.5 font-semibold text-tinta-escura md:pt-1">
                <IconeLupa className="mt-0.5 size-5 shrink-0 text-tinta" />
                {problema.resposta}
              </p>
            </li>
          ))}
        </ol>
        <aside
          aria-labelledby="titulo-capacidade"
          className={`grid gap-6 rounded-[1.6rem] p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10 ${fundoEscuro}`}
        >
          <div>
            <h3 id="titulo-capacidade" className="text-xl font-bold">
              Quem mais precisa tem menos estrutura
            </h3>
            <p className="mt-2 text-white/80">
              O motivo mais citado pelas prefeituras para não usar IA é a falta de pessoas capacitadas (40%).
            </p>
            <p className="mt-4 text-xs text-white/65">Fonte: Cetic.br/NIC.br, TIC Governo 2025.</p>
          </div>
          <Barras
            titulo="Prefeituras que usaram IA nos últimos 12 meses, por porte do município"
            itens={IA_POR_PORTE.map((porte) => ({ ...porte, texto: `${porte.valor}%` }))}
            maximo={100}
          />
        </aside>
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="titulo-como"
      className={`mx-2 scroll-mt-4 rounded-[1.6rem] px-5 py-14 sm:mx-3 sm:px-10 lg:px-14 lg:py-20 ${fundoEscuro}`}
    >
      <h2 id="titulo-como" className={`${tituloSecao} max-w-3xl`}>
        Da pergunta à prática, <span className="text-marca">com fonte</span>
      </h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
        {PASSOS.map((passo) => (
          <li
            key={passo.titulo}
            className="relative border-t-2 border-white/25 pt-6 before:absolute before:-top-[7px] before:left-0 before:size-3 before:rounded-full before:bg-marca md:pr-10"
          >
            <h3 className="text-xl font-bold">{passo.titulo}</h3>
            <p className="mt-2 text-white/80">{passo.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Barras horizontais sobre fundo escuro: uma série, valor escrito ao lado do rótulo. */
function Barras({
  titulo,
  itens,
  maximo,
}: {
  titulo: string;
  itens: { rotulo: string; valor: number; texto: string }[];
  maximo: number;
}) {
  return (
    <figure>
      <figcaption className="text-sm text-white/75">{titulo}</figcaption>
      <ul className="mt-4 flex flex-col gap-5">
        {itens.map((item) => (
          <li key={item.rotulo}>
            <div className="flex items-baseline justify-between gap-4">
              <span>{item.rotulo}</span>
              <span className="numeros text-lg font-bold">{item.texto}</span>
            </div>
            <div aria-hidden className="mt-2 h-3 rounded-r-[4px] bg-white/10">
              <div
                className="h-full rounded-r-[4px] bg-marca"
                style={{ width: `max(4px, ${(item.valor / maximo) * 100}%)` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Vantagens() {
  return (
    <section
      id="vantagens"
      aria-labelledby="titulo-vantagens"
      className="scroll-mt-4 px-5 py-16 sm:px-10 lg:px-14 lg:py-24"
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-14">
        <h2 id="titulo-vantagens" className={tituloSecao}>
          Ganhos para a <span className="text-tinta">gestão pública</span> da educação
        </h2>
        <p className="max-w-[36rem] text-lg text-grafite-suave">
          Para secretarias estaduais e municipais. Hoje o IIE vem por estado: a secretaria municipal parte do resultado do
          seu estado e do catálogo de práticas, que inclui as de gestão municipal.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-4">
        <article className="pautado grid gap-6 rounded-[1.6rem] bg-tinta-clara py-8 pr-6 pl-12 sm:pr-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <div>
            <h3 className="text-2xl font-bold">Esforço e orçamento onde mais pesam</h3>
            <p className="mt-2 max-w-[38rem] text-grafite-suave">
              O IIE se decompõe em evasão, retenção e aprendizagem. O ganho potencial de cada parte mostra onde a mesma
              energia rende mais pontos.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <p className="numeros text-lg font-bold text-tinta sm:text-2xl">
              <span className="whitespace-nowrap">IIE =</span>{" "}
              <span className="whitespace-nowrap">(100 − F2 − P1) × A1 ÷ 100</span>
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <Termo sigla="P1">evasão: fora da escola sem o Ensino Médio</Termo>
              <Termo sigla="F2">retenção: 2 anos ou mais de atraso</Termo>
              <Termo sigla="A1">aprendizagem: básico em Português e Matemática</Termo>
            </dl>
          </div>
        </article>
        <ul className="grid gap-x-8 gap-y-7 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {VANTAGENS.map((vantagem) => (
            <li key={vantagem.titulo} className="border-t-2 border-grafite pt-3">
              <h3 className="text-lg leading-snug font-bold">{vantagem.titulo}</h3>
              <p className="mt-1.5 text-grafite-suave">{vantagem.texto}</p>
            </li>
          ))}
        </ul>
        <article
          className={`grid gap-8 rounded-[1.6rem] p-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14 lg:p-9 ${fundoEscuro}`}
        >
          <div>
            <h3 className="text-2xl font-bold">Expectativa realista de resultado</h3>
            <p className="mt-2 text-white/80">
              O IIE mede o fim do Ensino Médio, então uma ação demora a aparecer no índice. O Conselheiro diz quando
              esperar o resultado e o que acompanhar enquanto isso: frequência, reprovação, avaliações diagnósticas.
            </p>
          </div>
          <LinhaDoTempo />
        </article>
      </div>
    </section>
  );
}

function Termo({ sigla, children }: { sigla: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="font-bold text-tinta">{sigla}</dt>
      <dd className="text-grafite-suave">{children}</dd>
    </div>
  );
}

/** Em quantos anos uma ação em cada etapa aparece no IIE (escala de 0 a 11 anos). */
function LinhaDoTempo() {
  return (
    <figure className="self-center">
      <figcaption className="text-sm text-white/75">Anos até a ação aparecer no IIE</figcaption>
      <ul className="mt-4 flex flex-col gap-4">
        {PRAZOS.map((prazo) => (
          <li key={prazo.etapa} className="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4">
            <span className="text-sm font-semibold">{prazo.etapa}</span>
            <div className="relative h-7 rounded-[4px] bg-white/10">
              <div
                className="absolute inset-y-0 grid place-items-center rounded-[4px] bg-marca text-xs font-bold text-grafite"
                style={{ left: `${(prazo.de / 11) * 100}%`, width: `${((prazo.ate - prazo.de) / 11) * 100}%` }}
              >
                <span className="numeros">
                  {prazo.de} a {prazo.ate} anos
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Convite() {
  return (
    <section aria-labelledby="titulo-convite" className="mx-2 rounded-[1.6rem] bg-marca px-5 py-14 sm:mx-3 sm:px-10 lg:px-14 lg:py-16">
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
        <div>
          <h2 id="titulo-convite" className={`${tituloSecao} max-w-3xl`}>
            Comece pela pergunta mais simples: como está o seu estado?
          </h2>
          <p className="mt-5 max-w-xl text-lg">Crie a sua conta e converse com o Conselheiro logo em seguida.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/cadastro" className={botaoTinta}>
            Criar conta
          </Link>
          <Link href="/entrar" className={`${botao} border-2 border-grafite hover:bg-grafite hover:text-white`}>
            Já tenho conta
          </Link>
        </div>
      </div>
    </section>
  );
}

function Creditos() {
  return (
    <div className="flex flex-col gap-4 px-5 py-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">
      <Marca />
      <Rodape className="lg:text-right" />
    </div>
  );
}
