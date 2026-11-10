# Prova técnica do n8n 2.46.7: resultado

Rodada em 2026-11-10 com o workflow `prova_tecnica.json` (id `CwWKZufkyB3N3fWP`), que ficou desativado depois.

**Configuração testada:**
- AI Agent 3.1 com streaming;
- `claude-opus-5-5` com pensamento adaptativo, esforço `medium` e cache de 5 min;
- Postgres Chat Memory em `agente.memoria`;
- uma ferramenta, `consultar_iie`, recebendo `p_ufs` do corpo do webhook.

**As três perguntas:**
1. "Como está o Ceará?", com acesso ao CE.
2. Uma continuação na mesma conversa.
3. "Como está o Ceará?", com acesso só a PE.

## Os 6 pontos

| Ponto | Resultado |
|---|---|
| 1. Versão do n8n | ✅ 2.46.7 |
| 2. Cache do prompt | ⏳ conferir no Console da Anthropic (Usage). O n8n soma os tokens de cache em `promptTokens`, então não dá para ver daqui. O prompt tem cerca de 1.250 tokens, acima do mínimo do Opus 5.5 (512) |
| 3. Pensamento adaptativo no Opus 5.5 | ✅ sem erro 400 nas 5 chamadas ao modelo |
| 4. Streaming | ⚠️ funciona **só quando não há ferramenta**. Depois de uma chamada de ferramenta, a resposta final chega toda de uma vez no fim (veja abaixo) |
| 5. Passos intermediários | ✅ nos dados de execução (`GET /executions?includeData=true`): entrada e saída da ferramenta |
| 6. Latência | Até o primeiro texto: 9,8 s (P1) / 2,4 s (P2) / 6,3 s (P3). Tempo total: 9,9 s / 8,1 s / 6,3 s. As consultas ao banco levaram de 80 a 100 ms, e a memória menos de 35 ms |

**O que mais se confirmou:**
- **Os números estão corretos.** CE 21,2, Brasil 19,0, 7º de 27. A série de 2013 a 2019 confere com o banco.
- **A memória funciona.** A pergunta 2 respondeu sem chamar a ferramenta, usando os números da pergunta 1.
- **A recusa por UF funciona.** Na pergunta 3, a ferramenta falhou com `territorio_sem_acesso`. O stream emitiu um `error`, e o agente continuou e respondeu sem os números.
- **O leitor do site aguenta os streams reais.** `web/src/lib/ndjson.ts` montou as três respostas sem marcar erro.

**Tokens e custo:**
- 7.458 tokens de entrada (com os de cache somados) e 895 de saída;
- custo máximo, sem contar nenhuma leitura de cache: cerca de **US$ 0,05** para as três perguntas.

## O que muda na P2

1. **A resposta não chega aos poucos depois de uma ferramenta.** Na P1, os 105 pedaços de texto chegaram entre 9,81 s e 9,93 s. A comunidade do n8n descreve o streaming do Agent v3 depois de ferramentas como limitado.
   - **No site:** mostrar "Consultando os dados do IIE…" durante a fase da ferramenta. O stream já sinaliza essa fase: `begin` → itens vazios → `end`.
   - **No n8n:** testar o AI Agent 2.2 com streaming, que custa centavos. Se ele transmitir depois da ferramenta, usá-lo.
2. **O hint do erro não chega ao agente.** A ferramenta devolve ao modelo só `{"error": "territorio_sem_acesso: Ceará"}`. O hint com os estados liberados vai para o stream, que o site ignora, e não para o modelo. Por isso, na P3 o agente disse que "o sistema não informou a lista". Correção: incluir as UFs liberadas no bloco `<contexto>` do texto do agente, assim: `UFs liberadas: ' + $json.body.ufs_permitidas.join(', ')`. A segurança não muda, porque o filtro continua no SQL.
3. **Cada resposta com ferramenta começa com 7 itens vazios**, que são os pedaços da chamada da ferramenta. O site já ignora esses itens.

## Pré-requisito de rede (homologação)

O contêiner `supabase_iie-db-1` foi ligado à rede `easypanel` à mão, com o comando abaixo, para que o n8n alcance o banco pelo host `iie-supabase-db`:

```sh
docker network connect --alias iie-supabase-db easypanel supabase_iie-db-1
```

A ligação se perde quando o contêiner é recriado, por exemplo num novo deploy ou numa atualização do Supabase. Nesse caso, rode o comando de novo. Na produção, a rede deve ser declarada no próprio compose.
