# Catálogo de práticas: método e revisão

> Reconstruído em 2026-10-13 (P1, Tarefa 6) a partir dos três referenciais em [`boas-praticas/`](../../boas-praticas/). Arquivo: [`catalogo_praticas.csv`](catalogo_praticas.csv), com 541 práticas.

## Por que foi reconstruído

O inventário de 2026-09-11 numerou as práticas na ordem de aparição em cada documento, mas não foi salvo. Sobraram 147 **âncoras**: os IDs usados na [matriz](matriz_indicador_pratica.csv) e no [doc 09](../09_indicadores_iie_e_praticas_de_gestao.md), com as linhas em que cada prática está. A reconstrução precisava manter essas âncoras, para que nenhum vínculo, pacote ou pré-condição mudasse de significado.

## Método

- **Execução:** um agente por série (GE, GE-SEC, SM, PE), lendo o documento inteiro.
- **Calibragem:** entre duas âncoras consecutivas `X-a` e `X-b`, precisa haver exatamente `b − a − 1` práticas. Isso fixou a granularidade.
- **Conferência:** `python -m dados.conferir_catalogo`. Resultado: **0 erros**; 147 âncoras nas linhas certas; totais 279 / 93 / 117 / 52, iguais aos do inventário original.
- **Textos:** `nome` e `descricao` são paráfrases. Nenhuma descrição copia mais de 15 palavras seguidas do original (conferido por script).
- **`alavancas`:** classificação nova, nos mesmos termos da sessão de 2026-09-11 (acesso, fluxo, aprendizagem, equidade, dados, estruturantes).

## Regra de cada série

| Série | Documento | Regra que fecha com as âncoras |
|---|---|---|
| GE (279) | MEC, gestão escolar | Seção "Papéis e responsabilidades" (L853–1770), em ordem. Conta como prática a expectativa geral de cada dimensão, o "Resultado" de cada subdimensão e cada item de Responsabilidades e de Expectativas de entrega. Com essa regra, sem ajustes, o total dá exatamente 279. As declarações de resultado começam com "Resultado esperado:", "Expectativa geral da dimensão:" ou "Entrega esperada:", para facilitar filtrar |
| GE-SEC (93) | MEC, papel da Secretaria | Uma prática por seção nos capítulos 1–5; um item por prática nos quadros de atribuições; um passo por prática nos seis passos da política e no fluxo de acompanhamento; uma conduta por prática nas visitas; uma estratégia numerada por prática na seção 6.3 |
| SM (117) | Itaú Social | Um item de lista por prática onde as âncoras caem em listas; uma subseção ou recomendação distinta por prática no resto |
| PE (52) | TPE | Um item numerado por prática (premissas, "o que evitar", passos), mais os quadros "na prática" e as considerações finais (PE-52) |

## Pontos para o especialista decidir

**Avisos de ordem (GE-SEC).** O PDF tem quadros em duas colunas. Por isso, três pares ficam fora da ordem das linhas: 17/18, 49/50 e 88/89. O par 49/50 já estava invertido nas âncoras originais.

**Divisões plausíveis, mas não únicas.** Em cada caso abaixo, outra divisão também fecharia a conta:
- **GE-35/36 e GE-162/163:** a âncora cobre dois itens. A contagem obrigou a separá-los, e o nome da âncora lembra mais o primeiro deles.
- **GE-SEC-01:** escolhido o Marco Local de Gestão Escolar (L98–118). Alternativas: L314–328 ou L144–147.
- **GE-SEC-52 a 62:** combinação de condutas de visita, seções 6.2.4 a 6.2.7 e boas práticas da seção 6.2.6.
- **GE-SEC-80 a 83:** seguem a ordem das linhas (5.4, 5.2, 5.5, 5.3), não a numeração do PDF.
- **Trechos fora do catálogo:**
  - revisão periódica das rubricas (L2153–2161);
  - adaptação aos marcos locais (L2163–2179);
  - visão geral da seção 6.2.1 (L2479–2549).
- **SM-01 a SM-04:** o trecho "mesclar a leitura com dados da rede" (L366–372) ficou de fora.
- **SM-25 e SM-85:** ficam dentro do trecho da prática anterior (SM-24 e SM-84), porque não havia linha livre.
- **SM-58 a SM-71:** "priorizar o básico" (L1421–1424) conta como prática; a alternativa era "ouvir a comunidade" (L1523–1525).
- **SM-110:** a Meta 1 do exemplo ficou dentro dela.
- **PE-03 a PE-06:** a divisão de L53–91.
- **PE-23:** é o parágrafo de abertura da etapa 2; a alternativa era L276–278.
- **PE-38 a PE-47:** a seção 3.3 foi dividida em duas.
- **PE-52:** são as considerações finais, que têm tom de resumo.

## Amostra para revisão (10%, sorteio fixo, semente 2026)

| ID | Linhas | Nome | Revisão (ok / ajustar) |
|---|---|---|---|
| GE-02 | L863–865 | Escola orientada por visão de futuro | |
| GE-06 | L875–877 | Pensamento sistêmico e antecipatório | |
| GE-40 | L1001–1002 | Parcerias com a rede de proteção | |
| GE-42 | L1008–1019 | Liderança pedagógica com equidade | |
| GE-46 | L1034–1035 | Trabalho colaborativo docente | |
| GE-51 | L1049–1050 | Devolutiva formativa sistemática | |
| GE-53 | L1052 | Desenvolver novas lideranças | |
| GE-57 | L1062–1064 | Comunidades de prática | |
| GE-61 | L1079–1080 | Coerência objetivos–práticas | |
| GE-108 | L1223–1224 | Liderança distribuída formalizada | |
| GE-115 | L1244–1245 | Bem-estar e permanência da equipe | |
| GE-123 | L1262–1263 | Legitimidade da direção na mediação | |
| GE-129 | L1282–1284 | Fóruns, visitas cruzadas e mentoria | |
| GE-148 | L1334 | Rotina de mentoria | |
| GE-161 | L1380–1383 | Notificação compulsória de violências | |
| GE-164 | L1392 | Relações de confiança | |
| GE-175 | L1425–1428 | Comunidade na gestão dos recursos | |
| GE-179 | L1438–1439 | Conselho Escolar atuante | |
| GE-183 | L1448–1450 | Comunidade informada e ouvida | |
| GE-193 | L1477–1478 | Transparência instituída | |
| GE-204 | L1521 | Distribuição de professores e turmas | |
| GE-216 | L1551–1553 | Planejamento financeiro participativo | |
| GE-226 | L1577–1578 | Criatividade diante da infraestrutura | |
| GE-231 | L1608–1611 | Decisões apoiadas em evidências | |
| GE-252 | L1674 | Sistematização e revisão de dados | |
| GE-258 | L1694–1695 | Diversificar experiências de aprendizagem | |
| GE-263 | L1710–1712 | Uso documentado de ferramentas e IA | |
| GE-276 | L1760–1762 | Auditar IA na gestão | |
| GE-SEC-19 | L2388–2391 | Condições institucionais para a equipe de acompanhamento | |
| GE-SEC-37 | L2614–2664 | Alinhar as dimensões do acompanhamento | |
| GE-SEC-38 | L2666–2715 | Núcleo prioriza vulneráveis | |
| GE-SEC-40 | L2725–2744 | Normatização e fluxo do acompanhamento | |
| GE-SEC-59 | L2997–3004 | Normatização da função e estrutura de carreira | |
| GE-SEC-74 | L3210–3218 | Comunidades de aprendizagem entre escolas | |
| GE-SEC-83 | L3299–3309 | Simplificação e padronização de processos administrativos | |
| GE-SEC-91 | L3371–3376 | Sistema de registro e monitoramento das visitas | |
| GE-SEC-92 | L3379–3386 | Relatórios consolidados e devolutivas às escolas | |
| SM-04 | L347–362 | Compartilhar as dificuldades com franqueza | |
| SM-12 | L484–485 | Assessoria a gestores escolares | |
| SM-47 | L1092–1099 | Dosar a valorização da pós-graduação | |
| SM-48 | L1101–1118 | Conter o excesso de gratificações | |
| SM-52 | L1217–1231 | Começar pelas tarefas que dão suporte às demais | |
| SM-55 | L1301–1316 | Aprovar o protocolo municipal o quanto antes | |
| SM-60 | L1377–1380 | Arranjo curricular para recompor 2020 | |
| SM-71 | L1504–1525 | Criar uma atmosfera de acolhimento | |
| SM-75 | L1572–1574 | Apoio financeiro aos vulneráveis | |
| SM-91 | L1858–1875 | Desenho da recuperação | |
| SM-109 | L2382–2391 | Definir três ou quatro objetivos estratégicos | |
| SM-115 | L2560–2584 | Monitoramento contínuo do plano | |
| PE-08 | L99–109 | Causa-raiz da baixa aprendizagem | |
| PE-28 | L311–317 | Metas SMART construídas com quem executa | |
| PE-32 | L352–377 | Visão sistêmica | |
| PE-33 | L384–387 | Coerência entre políticas | |
| PE-52 | L576–587 | Planejar no início da gestão e adaptar ao contexto | |
