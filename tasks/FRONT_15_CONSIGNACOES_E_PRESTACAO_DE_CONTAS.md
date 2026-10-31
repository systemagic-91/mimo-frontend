# FRONT_15 - Consignações e prestação de contas

**Prioridade:** 15 - conecta a principal movimentação entre estoque e vendedoras.

## Contexto Motivador

As telas de consignação usam `db.sellers`, `db.pieces` e `db.consignments` em memória. A criação seleciona peças etiquetadas e a confirmação é síncrona; venda e devolução não aguardam o servidor nem tratam conflito. A tela da vendedora também calcula estatísticas, comissões e vencimentos no navegador.

O backend (BACK_06 e BACK_08) está pronto e os hooks já existem: `useConsignmentsQuery`, `useConsignmentQuery`, `useSellerConsignmentsQuery`, `useCreateConsignmentMutation`, `useMarkItemSoldMutation`, `useMarkItemReturnedMutation`, `useSellerQuery`, `useSellerStatsQuery` e `useSellerCommissionQuery`.

## Objetivo

Migrar a lista de vendedoras e lotes, o wizard de nova consignação, o histórico, as ações de venda e devolução e as informações financeiras para a API.

## Contrato da API (estado em 2026-10-31)

Detalhes nas seções 3 e 4 do `BACKEND_API_CONTRACT.md`. Consignações aceitam owner e staff.

- `GET /consignments`:
  - query `status` (`aberta`/`quitada`), `sellerId`, `overdue` (`true`/`false`), paginação e `sort` (`code`, `deliveredAt`, `dueAt`, `status`, `createdAt`; padrão `deliveredAt,desc`);
  - cada item traz o **status visual** (`em_dia`, `atrasada` ou `quitada`), `dueInDays` (0 = vence hoje, negativo = atrasado), `seller`, `piecesInHand` e `valueInHandCents`.
- `GET /consignments/{id}`:
  - lote com `status` persistido (`ABERTA`/`QUITADA`), `late`, `seller` e `items`;
  - cada item: `codeSnapshot`, `typeSnapshot`, `valueCentsSnapshot`, `commissionRateSnapshot`, `status` (`COM_VENDEDORA`/`VENDIDA`/`DEVOLVIDA`), `soldAt` e `returnedAt`.
- `POST /consignments`:
  - corpo `{ sellerId, pieceIds, dueDate, note? }`. `dueDate` é uma **data local da loja** (`YYYY-MM-DD`), entre hoje e hoje + 365 dias; `pieceIds` tem de 1 a 200 peças, sem repetição;
  - resposta `201 ConsignmentDetails`, com o código oficial `C-AAAA-NNN`;
  - erros:
    - `422 EMPTY_ITEMS`, `422 DUE_DATE_IN_PAST` e `422 SELLER_INACTIVE`;
    - `400 VALIDATION_ERROR` (`fields.pieceIds` ou `fields.dueDate`);
    - `404 SELLER_NOT_FOUND` e `404 PIECE_NOT_FOUND` (`fields.pieceIds`);
    - `409 PIECE_NOT_AVAILABLE`: a mensagem cita os códigos e `fields.pieceIds` lista os IDs;
    - `409 PIECE_STATE_INCONSISTENT`.
- `POST /consignments/{id}/items/{pieceId}/sold` e `/returned`:
  - corpo opcional `{ soldAt | returnedAt, note }`; a data precisa estar entre a entrega e agora (`400 VALIDATION_ERROR`);
  - resposta `200 ConsignmentDetails` atualizado. O lote vira `QUITADA` sozinho quando não resta peça com a vendedora;
  - erros: `409 ITEM_NOT_WITH_SELLER` (item já vendido ou devolvido, por exemplo, duas pessoas clicando: avisar e recarregar o lote), `404 CONSIGNMENT_NOT_FOUND` e `404 CONSIGNMENT_ITEM_NOT_FOUND`.
- Vendedora:
  - `GET /sellers/{id}` e `GET /sellers/{id}/consignments` aceitam owner e staff. O histórico vem **sem os itens**; os itens de cada lote vêm de `GET /consignments/{id}`;
  - `GET /sellers/{id}/stats` e `GET /sellers/{id}/commission?from&to` são **só para owner** (staff recebe `403`);
  - a comissão usa `from`/`to` como datas locais da loja e o snapshot de comissão de cada item.
- `GET /settings` (owner e staff): `defaultConsignmentDays` para sugerir o vencimento e `timezone` da loja.

## Proposta de solução

- **Lista (`/consignacao`):** `useSellersQuery` para a tabela operacional (os agregados já vêm prontos) e `useConsignmentsQuery` onde a tela mostra lotes.
- **Wizard:**
  - vendedoras ativas (`status: "ativa"`) e peças etiquetadas (`usePiecesQuery({ status: "etiquetada" })`), com busca e paginação e seleção estável por UUID;
  - vencimento sugerido = hoje no fuso da loja + `defaultConsignmentDays`, enviado como `YYYY-MM-DD`;
  - prazo de pagamento obrigatório entre as opções de `settings.paymentTerms` (`paymentTermDays`, BACK_27);
  - gerar a `Idempotency-Key` uma vez por confirmação e reutilizá-la no retry (`consignmentsApi.create` já aceita a chave);
  - só confirmar e navegar depois do `201`.
- **Romaneio:** imprimir com `window.print()` a partir do `ConsignmentDetails` devolvido, usando os snapshots.
- **Venda e devolução:**
  - desabilitar o item durante o request e usar a resposta para atualizar o lote;
  - deixar as invalidações dos hooks atualizarem estoque, vendedoras e dashboard;
  - em `409 ITEM_NOT_WITH_SELLER`, avisar e recarregar.
- **Página da vendedora:**
  - histórico com `useSellerConsignmentsQuery`;
  - itens carregados ao expandir o lote (`useConsignmentQuery`);
  - cards de estatística e comissão só para owner. Para staff, não fazer as chamadas de `stats`/`commission` e esconder os cards;
  - períodos da comissão ("mês atual" etc.) calculados no fuso da loja.
- Em conflito de peça indisponível, destacar as peças de `fields.pieceIds`, recarregar a lista e pedir nova seleção.

## Decisões (2026-10-31)

1. **Prazo de pagamento no lote (BACK_27):**
   - o wizard ganha o campo obrigatório "Prazo de pagamento", com as opções de `settings.paymentTerms`;
   - o card "Prazos de pagamento" da vendedora passa a usar `GET /sellers/{id}/payment-schedule` (só owner) e mostra, por prazo, quantas vendas houve no período, quanto a vendedora deve repassar (venda − comissão) e as datas de vencimento;
   - o detalhe do lote mostra o prazo e, nos itens vendidos, a data de vencimento do pagamento e o valor devido;
   - lotes antigos aparecem como "prazo não informado". Não há controle de pagamento recebido;
   - **a fórmula local atual do card deve ser removida**;
   - a agenda filtra pela **data da venda** (o mesmo período do card de comissão). Staff vê a data de vencimento dos itens, mas `amountDueCents` vem `null` e a agenda é só owner.
2. **Data opcional na venda e na devolução:**
   - o botão continua registrando o momento atual, mas há um campo opcional de data para prestações de contas atrasadas;
   - a data fica entre o dia da entrega do lote e hoje (no fuso da loja);
   - **hoje:** não enviar data (o servidor usa o horário atual);
   - **dia anterior:** enviar `soldAt`/`returnedAt` como 23:59:59 daquele dia no fuso da loja, que sempre fica entre a entrega e agora;
   - acrescentar o parâmetro de data em `consignmentsApi.markSold`/`markReturned` (hoje só enviam `note`);
   - erro `400 VALIDATION_ERROR` em `fields.soldAt`/`fields.returnedAt` aparece junto ao campo.

## Pontos de atenção

- As ações atualizam muitos caches: consignações, peças, vendedoras, dashboard e relatórios. Os hooks já invalidam esse conjunto; não duplicar.
- O estado "quitado" e o "atrasado" vêm da API; não recalcular no front.
- Cliques nos botões de item não podem abrir ou fechar o accordion pai.
- "Hoje" e os períodos usam o fuso de `settings.timezone`, não o do navegador.

## Critérios de aceite

- [ ] O wizard valida vendedora, ao menos uma peça e data antes do envio.
- [ ] O lote criado tem código, snapshots, vencimento e itens iguais aos devolvidos pelo servidor; o retry não cria lote duplicado.
- [ ] Venda e devolução aguardam o resultado, evitam double-submit e refletem os estados persistidos; a data opcional registra prestações de contas atrasadas no dia certo.
- [ ] O lote guarda o prazo de pagamento escolhido e o card da vendedora mostra os valores e vencimentos da API, sem cálculo local.
- [ ] Conflitos `409` recuperam a seleção ou a lista; `401`/`403` e falha de rede recebem o tratamento padrão.
- [ ] Staff usa lista, wizard, histórico e ações, sem ver nem chamar stats/comissão.
- [ ] Dashboard, lista de vendedoras e detalhe atualizam sem reload depois das ações.
- [ ] A impressão gera o romaneio do lote efetivamente criado.
- [ ] Testes cobrem criação, retry, ação de item, conflito e invalidação de cache.

## Observações de dependência

Depende de FRONT_11 e dos endpoints BACK_05, BACK_06 e BACK_08 (prontos). O prazo de pagamento (campo do wizard, detalhe do lote e card da vendedora) usa a BACK_27 (pronta). Tipos já disponíveis: `CreateConsignmentRequest.paymentTermDays`, `paymentTermDays` nos lotes, `paymentDueDate`/`amountDueCents` nos itens e `PaymentScheduleResponse`; falta o cliente/hook `sellersApi.paymentSchedule`. Pode ser feita em paralelo com FRONT_13, FRONT_14 e FRONT_16.
