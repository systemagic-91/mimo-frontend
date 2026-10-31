# BACK_26 - Valor total das peças filtradas

**Prioridade:** 26 - pré-requisito do card de valor da tela de estoque (FRONT_13).

## Contexto Motivador

A tela de estoque mostra a quantidade e o **valor total** das peças que batem com a busca e os filtros. Com a paginação de `GET /pieces`, o front só recebe as peças da página atual e não consegue somar o valor de todas as filtradas. Hoje a resposta tem só `pagination.total` (quantidade).

**Decisão de 2026-10-31:** a API passa a devolver a soma, em vez de o front buscar todas as páginas ou de o card perder o valor.

## Objetivo

Devolver em `GET /pieces` o valor total (preço de venda) de todas as peças que batem com os filtros, independentemente da página.

## Proposta de solução

- `GET /pieces` passa a responder `{ items, pagination, summary: { totalValueCents } }`:
  - `summary.totalValueCents` é a soma de `value_cents` de **todas** as peças que batem com `q` e `status`, não só as da página;
  - sem peças, `0`;
  - a quantidade continua em `pagination.total`.
- A soma usa exatamente os mesmos filtros da busca paginada (uma consulta `SUM` com o mesmo `WHERE`), para os dois números nunca divergirem.
- Criar um envelope próprio para essa rota (por exemplo, `PieceListResponse`), sem mudar o `PageEnvelope` genérico das outras listagens.
- Atualizar o `BACKEND_API_CONTRACT.md` (seção `GET /pieces`) e o tipo `PageEnvelope<PieceDto>` usado em `piecesApi.list` no front.

## Pontos de atenção

- É o **preço de venda** (`valueCents`). Não somar custo, que é da BACK_23 e só para owner.
- Owner e staff veem a soma; o valor de venda não é informação restrita.
- Peças vendidas também entram quando o filtro de status as inclui. O front escolhe o filtro (por exemplo, só `ETIQUETADA` para "valor em estoque").

## Critérios de aceite

- [x] `summary.totalValueCents` é igual à soma das peças filtradas, em qualquer página e com qualquer `pageSize`.
- [x] Busca e filtro de status afetam a soma da mesma forma que a lista.
- [x] Testes unitários (JUnit 5 + Mockito) cobrem a montagem da resposta, e a consulta é validada contra PostgreSQL de verdade.

## Verificação (2026-10-31)

- 190 testes do backend passando (1 novo: a soma vem do repositório com os mesmos filtros da lista).
- Contra PostgreSQL real: 8/8 verificações (sem filtro, segunda página, status, busca por tipo e por código sem diferenciar maiúsculas, busca + status, resultado vazio = 0 e soma igual à do banco).

## Observações de dependência

Depende de BACK_05. A FRONT_13 consome o campo.
