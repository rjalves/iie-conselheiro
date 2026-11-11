---
name: IIE Conselheiro
description: Agente de IA que leva o IIE da secretaria de educação à decisão de gestão, com dado e fonte.
colors:
  tinta: "#1d3a8a"
  tinta-escura: "#152b66"
  tinta-clara: "#e8edf8"
  marca: "#ffe066"
  grafite: "#1e2228"
  grafite-suave: "#5a6170"
  papel: "#f6f7f9"
  linha: "#dde1e8"
  folha: "#ffffff"
  erro: "#b42318"
  erro-fundo: "#fdecea"
  sucesso: "#1f7a4d"
  sucesso-fundo: "#e7f4ec"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 4.4rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 4.5vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  title-lg:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  lead:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  caption:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  barra: "4px"
  md: "6px"
  balao: "8px"
  painel: "20px"
  cartao: "25.6px"
  folha: "28px"
  pilula: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  margem-caderno: "36px"
  pauta: "28px"
  gutter-mobile: "20px"
  gutter-tablet: "40px"
  gutter-desktop: "56px"
  secao: "96px"
components:
  button-primary:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.folha}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.tinta-escura}"
  button-primary-pilula:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.folha}"
    rounded: "{rounded.pilula}"
    padding: "14px 28px"
  button-secondary:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.tinta-clara}"
  button-danger:
    backgroundColor: "{colors.erro}"
    textColor: "{colors.folha}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-quiet:
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  pilula-contorno:
    textColor: "{colors.grafite}"
    rounded: "{rounded.pilula}"
    padding: "6px 16px"
  pilula-contorno-hover:
    backgroundColor: "{colors.grafite}"
    textColor: "{colors.folha}"
  input:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  etiqueta-pergunta:
    backgroundColor: "{colors.tinta-clara}"
    textColor: "{colors.tinta-escura}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  aviso-info:
    backgroundColor: "{colors.tinta-clara}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  aviso-erro:
    backgroundColor: "{colors.erro-fundo}"
    textColor: "{colors.erro}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  aviso-sucesso:
    backgroundColor: "{colors.sucesso-fundo}"
    textColor: "{colors.sucesso}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  cartao-pautado:
    backgroundColor: "{colors.tinta-clara}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.cartao}"
    padding: "24px 24px 24px 48px"
  cartao-marca:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.cartao}"
    padding: "24px"
  painel-tinta-escura:
    backgroundColor: "{colors.tinta-escura}"
    textColor: "{colors.folha}"
    rounded: "{rounded.cartao}"
    padding: "28px"
  folha:
    backgroundColor: "{colors.folha}"
    rounded: "{rounded.folha}"
  balao-pergunta:
    backgroundColor: "{colors.tinta-clara}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.balao}"
    padding: "12px 16px"
  barra-lateral:
    backgroundColor: "{colors.tinta-escura}"
    textColor: "{colors.folha}"
    width: "288px"
---

# Design System: IIE Conselheiro

## Overview

**Creative North Star: "O Caderno do Gestor"**

O IIE Conselheiro se apresenta como o caderno de quem estuda o próprio território: folha branca, caneta azul e marca-texto amarelo. O gestor lê relatório, não mensageiro; por isso o texto corre em linhas de leitura confortável, os números vêm em algarismos tabulares e o que importa aparece sublinhado com marca-texto, como faria quem estuda um documento com atenção. Os materiais vêm todos do mesmo estojo: a tinta azul escreve (títulos destacados, botões, gráficos), o marca-texto destaca (o trecho que decide, o dado principal, a seleção de texto) e a pauta e a margem do caderno organizam os cartões claros.

O sistema é de serviço público. Uma família tipográfica de alta legibilidade (Atkinson Hyperlegible Next), foco sempre visível em tinta e contraste conferido valem para todas as telas. A densidade é média: as telas de entrada e a página de apresentação respiram, com uma folha branca arredondada sobre fundo azul-claro; o chat é sóbrio, com papel cinza-claro, barra lateral em tinta escura e respostas em texto corrido de até 72 caracteres por linha.

Rejeições confirmadas na direção visual de origem (P3): rótulos em maiúsculas, setas nos botões, cartões iguais com sombra e animações de entrada em tudo. A paleta evita o creme com terracota e o escuro com neon. O usuário pediu para manter as cores atuais.

**Key Characteristics:**
- Caneta azul (tinta), marca-texto amarelo (marca) e grafite sobre folha branca ou papel cinza-claro.
- Negrito vira marca-texto: o destaque é uma faixa amarela atrás da palavra, não cor nem tamanho.
- Cartões claros com pauta fina e margem de caderno em tinta translúcida.
- A geração em 100 pontos como elemento marcante ("de cada 100 jovens…").
- Uma família tipográfica, pesos 400, 600 e 700, algarismos tabulares nos números.
- Profundidade quase nula: tons de superfície fazem o trabalho; sombra só na folha e no botão principal.

## Colors

Caderno escolar: uma tinta azul com dois tons de apoio, um marca-texto amarelo, grafite para o texto e cinzas-azulados frios para papel e linhas.

### Primary
- **Tinta (caneta azul)** (#1d3a8a): a cor que escreve. Botão principal, links, palavra destacada nos títulos ("O que é o **IIE**"), barras dos gráficos, pontos da grade em cartão claro, cursor de texto, contorno de foco e as linhas da pauta e da margem (a 22% e 6,5% de opacidade).
- **Tinta escura** (#152b66): fundo dos painéis escuros (painel de entrada, barra lateral do chat, cartões de conversa e de prazos), hover do botão principal e cor do tema do navegador. Nos painéis grandes leva dois gradientes radiais suaves de tinta mais clara e mais funda, que dão volume sem sombra.
- **Tinta clara** (#e8edf8): fundo azul-claro das telas de entrada e da página de apresentação, cartões pautados, balão da pergunta do usuário, etiquetas de pergunta, aviso informativo, hover dos botões secundários e fundo do código nas respostas.

### Secondary
- **Marca-texto** (#ffe066): o destaque. Faixa atrás do trecho decisivo de um título e do negrito das respostas, seleção de texto, pontos cheios da grade no painel escuro, cartões de número (27 UFs, três referenciais), barras horizontais sobre fundo escuro, faixa de convite final e indicador de "abrindo" na barra lateral. Texto sobre marca-texto é sempre grafite.

### Neutral
- **Grafite** (#1e2228): texto principal, contorno das pílulas e dos botões de contorno, filetes de 2px que abrem itens de lista e linha de base dos gráficos (a 45%).
- **Grafite suave** (#5a6170): texto de apoio, legendas, fontes, rodapé e placeholder (a 70-80%).
- **Papel** (#f6f7f9): fundo do corpo do site e do chat; fundo de campo desabilitado.
- **Linha** (#dde1e8): bordas de campos, divisórias entre seções, cabeçalho e pé do chat, filetes das tabelas nas respostas, barra de rolagem.
- **Folha** (#ffffff): a folha arredondada das telas de entrada e da apresentação, campos, cabeçalho do chat e alguns botões.

### Status
- **Erro** (#b42318) sobre **fundo de erro** (#fdecea): mensagens de campo, aviso de erro, botão de perigo (hover #8f1c13).
- **Sucesso** (#1f7a4d) sobre **fundo de sucesso** (#e7f4ec): aviso de sucesso.

### Named Rules
**The Marca-texto Rule.** O amarelo destaca, não decora. Ele marca o trecho que decide (uma expressão por título, o negrito da resposta, o dado principal) ou preenche um cartão de número; nunca vira cor de texto sobre fundo claro, e o texto sobre ele é sempre grafite.

**The Uma Tinta Rule.** Só existe um azul, em três tons (tinta, tinta escura, tinta clara) e em opacidades sobre branco. Nenhum segundo matiz de destaque entra no sistema; verde e vermelho servem apenas a sucesso e erro.

## Typography

**Display Font:** Atkinson Hyperlegible Next (com system-ui, Segoe UI, Arial, sans-serif)
**Body Font:** Atkinson Hyperlegible Next (a mesma família)

**Character:** Uma família só, desenhada para legibilidade, em três pesos (400, 600, 700). A hierarquia vem do tamanho, do peso e do aperto do espaçamento nos títulos grandes, não de troca de fonte.

### Hierarchy
- **Display** (700, 2,6rem no celular a 4,4rem no desktop, entrelinha 1,04, espaçamento -0,03em): o título de abertura da apresentação, com um trecho em tinta sobre marca-texto.
- **Headline** (700, 2,25rem a 3,4rem, entrelinha 1,06, -0,025em): títulos de seção da apresentação; uma expressão em tinta (ou em marca-texto sobre fundo escuro).
- **Numeral** (700, 3rem a 3,75rem, algarismos tabulares, espaçamento apertado): os números grandes dos cartões (27, 541).
- **Title large** (700, 1,5rem): títulos de cartão grande e de blocos escuros.
- **Title** (700, 1,25rem, entrelinha 1,375): títulos de cartão, de item de lista e frases de destaque dentro dos cartões; também o título da conversa vazia no chat (1,875rem).
- **Body** (400, 17px, entrelinha 1,55): texto corrido. Nas respostas do agente, máximo de 72ch por linha. Parágrafos com `text-wrap: pretty`, títulos h1 e h2 com `balance`.
- **Lead** (400, 1,125rem): o parágrafo de abertura logo abaixo de um título, em grafite suave, até cerca de 36rem de largura.
- **Label** (600, 0,875rem): rótulos de campo (no tamanho do corpo), fontes de dados em tinta, botões de contorno, etiquetas. Sempre em caixa normal.
- **Caption** (400, 0,75rem, entrelinha folgada): rodapé de autoria, avisos discretos e fontes sobre fundo escuro.

### Named Rules
**The Caixa Normal Rule.** Nenhum rótulo, botão ou título vai em maiúsculas nem com espaçamento aberto. Hierarquia é tamanho e peso.

**The Algarismo Tabular Rule.** Todo número que se compara (gráficos, cartões de número, fórmulas, tabelas das respostas, contador de perguntas) usa algarismos tabulares e vírgula decimal (15,5).

## Layout

Duas molduras. **A folha sobre a mesa**, nas telas de entrada e na apresentação: fundo tinta clara, com respiro de 8px no celular a 24px no desktop, e por cima uma folha branca arredondada de até 1152px (entrada) ou 1280px (apresentação). Nas telas de entrada, a folha se divide em painel escuro com a geração em 100 pontos (5 partes) e formulário (6 partes, até 448px); no celular, o painel vira uma faixa compacta acima do formulário, e no desktop acompanha a rolagem. **A mesa de trabalho**, no chat: altura da tela, barra lateral em tinta escura de 288px à esquerda (gaveta no celular, abaixo de 768px), coluna de conversa de até 768px centralizada sobre papel, campo de pergunta fixo embaixo.

Na apresentação, as margens internas sobem de 20px a 40px e 56px; seções têm 64px de altura de respiro no celular e 96px no desktop, separadas por um filete de linha ou por um bloco de cor recuado 8-12px das bordas da folha. Grades de cartões usam vãos de 12px a 16px; listas de texto, 28-32px. Colunas são assimétricas (por exemplo 0,85 : 1,6, ou 1 : 1,04), nunca três colunas iguais de cartões; colunas laterais ficam presas no topo ao rolar (sticky a 24px). Pontos de quebra seguem os padrões do Tailwind (640, 768, 1024, 1280px).

## Elevation & Depth

O sistema é plano e tonal. A profundidade vem do contraste entre superfícies (tinta clara, folha branca, tinta escura com gradiente radial) e não de sombras. Há duas sombras no sistema, ambas tingidas de tinta escura, nunca pretas.

### Shadow Vocabulary
- **Folha** (`box-shadow: 0 32px 72px -32px rgb(21 43 102 / 0.45), 0 2px 8px rgb(21 43 102 / 0.06)`): a folha branca das telas de entrada e da apresentação, para que ela pouse sobre a mesa azul-clara.
- **Botão de tinta** (`box-shadow: 0 10px 22px -12px rgb(29 58 138 / 0.75)`): só o botão principal; some quando ele está desabilitado.

### Named Rules
**The Uma Folha Rule.** Apenas a folha e o botão principal têm sombra. Cartões dentro da folha se separam por cor, nunca por sombra.

## Shapes

Cantos generosos e encaixados: a folha tem 28px, os cartões dentro dela 25,6px, os painéis internos 20px; elementos de trabalho (campos, botões do app, avisos, etiquetas) têm 6px; o balão da pergunta, 8px; barras de gráfico, 4px só na ponta. Pílulas totalmente arredondadas servem à apresentação (botões, pílulas de contorno, siglas dos referenciais em círculo). Bordas são finas (1px em linha) nos campos e grossas (2px em grafite) nos botões e pílulas de contorno e nos filetes que abrem itens de lista. A geração é sempre um quadrado de 10 por 10 círculos.

## Components

### Buttons
Diretos e sem ornamento: texto em semibold, sem ícone de seta.
- **Shape:** no app (formulários, chat, administração), cantos discretos ({rounded.md}); na apresentação, pílula ({rounded.pilula}) com 14px por 28px.
- **Principal:** tinta com texto branco e a sombra de tinta; hover em tinta escura.
- **Secundário:** contorno de 1px em tinta, texto tinta; hover em tinta clara.
- **Perigo:** fundo erro, texto branco; hover num vermelho mais fundo.
- **Discreto:** só texto tinta; hover em tinta clara.
- **Contorno grafite (apresentação):** borda de 2px em grafite que se enche de grafite no hover, com texto branco. A versão menor, com borda de 1px e texto de 14px, é a pílula de navegação dentro dos cartões ("Entenda o IIE").
- **Sobre fundo escuro:** contorno branco a 70% que se enche de branco no hover, com texto tinta escura.
- **Foco:** em todos os interativos, contorno de 3px em tinta afastado 2px.
- **Desabilitado:** 60% de opacidade e cursor de bloqueio.

### Chips
- **Etiqueta de pergunta:** fundo tinta clara, texto tinta escura em 14px, cantos de 6px. Lista sugestões do que perguntar.
- **Prática citada (fundo escuro):** pílula em branco a 10%, texto em 14px, "nome · fonte, código".
- **Avaliação da resposta:** botões pequenos de 36px de altura com borda linha; o ativo ganha borda tinta, fundo tinta clara e texto tinta em semibold.

### Cards / Containers
- **Cartão pautado:** fundo tinta clara com a margem de caderno a 36px da esquerda e pauta de 28px, cantos de 25,6px, recuo esquerdo de 48px para o texto ficar à direita da margem. Leva a grade da geração, listas de problemas e a fórmula do IIE. A versão só com margem (sem pauta) serve a listas longas.
- **Cartão de marca-texto:** fundo marca, texto grafite, 24px de recuo; para números de destaque e referenciais.
- **Painel de tinta escura:** tinta escura com os dois gradientes radiais, texto branco (apoio a 80%, legendas a 75%, fontes a 65%), divisórias brancas a 15%. Para o exemplo de conversa, dados de contexto e linhas do tempo.
- **Cartão de série:** fundo tinta clara simples, para o gráfico de barras.
- **Item de lista com filete:** sem fundo, aberto por um filete de 2px em grafite (ou branco a 25% sobre escuro, com um ponto de marca-texto no início).

### Inputs / Fields
- **Style:** fundo branco, borda de 1px em linha, cantos de 6px, 10px por 12px; placeholder em grafite suave a 70%; cursor de texto em tinta. O campo de pergunta do chat cresce com o conteúdo até 192px.
- **Focus:** o contorno de foco global, 3px em tinta.
- **Error / Disabled:** borda erro e mensagem em semibold erro abaixo do campo; desabilitado em fundo papel.

### Navigation
- **Barra lateral do chat:** tinta escura, texto branco. "Nova conversa" é um botão branco com texto tinta escura. Conversas em linhas de 6px de canto: hover em branco a 10%, atual em branco a 15%. Grupos com título em 12px semibold branco a 60%. No celular vira gaveta sobre um véu grafite a 40%.
- **Cabeçalho da apresentação:** marca à esquerda, âncoras em grafite suave que escurecem e ganham sublinhado afastado 8px no hover, "Entrar" como link tinta e "Criar conta" como pílula de contorno.
- **Marca:** lupa em traço de 2,2 com ponto de marca-texto no centro, mais "IIE Conselheiro" em bold 18px, em tinta (ou branco sobre escuro).

### Respostas do agente
Texto corrido de até 72ch, blocos espaçados em 0,85em. O negrito vira marca-texto (faixa amarela entre 52% e 94% da altura da linha, que acompanha a quebra). Itálico em grafite suave, links tinta sublinhados, tabelas com filete de linha e algarismos tabulares, código em tinta clara. A pergunta do usuário fica num balão tinta clara alinhado à direita, até 75-85% da largura.

### A geração em 100 pontos
Dez por dez círculos: os cheios são os jovens incluídos, os vazios só têm contorno. No painel escuro, cheios em marca-texto e vazios em branco a 35%, de 8px a 16px conforme a tela; em cartão claro, cheios em tinta e vazios em tinta a 35%, 12px. Os cheios entram um a um, 45ms de intervalo, 320ms cada, uma vez só ao abrir a tela. Sempre com `aria-label` lendo o dado por extenso e com ano e fonte escritos ao lado.

### Gráficos
Uma série por gráfico, sem legenda: o valor vai escrito sobre a barra ou ao lado do rótulo. Barras verticais em tinta sobre cartão claro; barras horizontais em marca-texto sobre trilho branco a 10% no fundo escuro. Dado preliminar é tinta hachurada a 45° com contorno de 2px, nunca uma cor diferente. Todo gráfico tem leitura por extenso no `aria-label` e a fonte escrita embaixo.

### Rodapé
Em 12px, grafite suave: "Criação e Desenvolvimento: Educacional.ia - Roberto Alves" e "Todos os direitos reservados - contato@educacional.ia.br", com o e-mail sublinhado. Na apresentação, o rodapé leva só a marca e essas duas linhas; o crédito do IIE (indicador público criado pela Metas Sociais a pedido do Instituto Natura) fica na seção "O que é o IIE".

## Do's and Don'ts

### Do:
- **Do** destacar com marca-texto (#ffe066) atrás do texto, uma expressão por título, e usar negrito nas respostas só para o que o gestor deve sublinhar.
- **Do** usar a tinta (#1d3a8a) para a palavra-chave dos títulos, os botões principais e as barras dos gráficos.
- **Do** separar cartões por cor de superfície (tinta clara, marca-texto, tinta escura), com cantos de 25,6px, e combinar cartões de tipos diferentes numa mesma grade.
- **Do** usar a pauta e a margem de caderno nos cartões claros que levam lista ou dado.
- **Do** manter o foco visível em 3px de tinta com 2px de folga em todo elemento interativo.
- **Do** escrever a fonte e o ano de todo número, e marcar o dado preliminar com hachura.
- **Do** usar algarismos tabulares e vírgula decimal em todo número comparável.
- **Do** manter "Criação e Desenvolvimento: Educacional.ia - Roberto Alves" e contato@educacional.ia.br no pé de todas as telas.

### Don't:
- **Don't** escrever rótulos, botões ou títulos em maiúsculas ou com espaçamento aberto.
- **Don't** pôr setas nos botões.
- **Don't** montar fileiras de cartões iguais com sombra; a sombra é só da folha e do botão principal.
- **Don't** animar a entrada de tudo; a única entrada animada é a dos pontos da grade, uma vez, e toda animação para com `prefers-reduced-motion`.
- **Don't** trocar as cores atuais nem acrescentar um segundo matiz de destaque; o sistema não usa creme com terracota nem escuro com neon.
- **Don't** usar o marca-texto como cor de texto sobre fundo claro, nem pôr texto branco sobre ele.
- **Don't** atribuir a autoria do site a Lupa Social ou ao Instituto Natura.
