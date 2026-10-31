# BACK_27 - Prazo de pagamento no lote

**Prioridade:** 27 - dá base real ao card "Prazos de pagamento" da página da vendedora.

## Contexto Motivador

A loja combina com cada vendedora um prazo para repassar o dinheiro das vendas: 30, 60 ou 90 dias (`settings.paymentTerms`). Hoje esse prazo não é guardado em lugar nenhum: `POST /consignments` não recebe prazo, e o card "Prazos de pagamento" da página da vendedora faz uma estimativa no navegador, repetindo o mesmo valor para os três prazos.

**Decisões de 2026-10-31:**

- O lote passa a **guardar o prazo de pagamento** escolhido na criação.
- O prazo conta a partir da **data de cada venda**: cada peça vendida vence em `data da venda + prazo`.
- O valor que a vendedora deve à loja por peça é **venda − comissão** (comissão pelo snapshot do item). Ex.: peça de R$ 100 com 30% → deve R$ 70.
- **Não haverá controle de pagamento recebido** por enquanto: o sistema mostra quanto vence e quando, mas não marca como pago.

## Objetivo

Registrar o prazo de pagamento de cada lote e oferecer ao owner a agenda do que cada vendedora deve repassar à loja.

## Proposta de solução

- **Migration:** `consignments.payment_term_days INTEGER NULL CHECK (payment_term_days > 0)`. Lotes antigos ficam `NULL` ("prazo não informado").
- **Criação do lote:**
  - `POST /consignments` passa a exigir `paymentTermDays`, que precisa estar em `settings.paymentTerms` no momento da criação; senão, `400 VALIDATION_ERROR` em `fields.paymentTermDays`;
  - o valor fica guardado no lote (snapshot): mudar as configurações depois não altera lotes existentes.
- **Respostas:**
  - `paymentTermDays` aparece em `ConsignmentResponse`, `ConsignmentDetails` e na listagem;
  - nos itens vendidos de `ConsignmentDetails`, incluir `paymentDueDate` (data local da loja = dia da venda + prazo) e `amountDueCents` (venda − comissão). Para itens não vendidos ou de lote sem prazo, os dois ficam `null`.
- **Agenda por vendedora:** `GET /sellers/{id}/payment-schedule?from=YYYY-MM-DD&to=YYYY-MM-DD`, só owner.
  - Considera as vendas da vendedora no período (datas locais da loja, como em `/commission`).
  - Responde grupos por prazo: `{ groups: [{ paymentTermDays, soldCount, amountDueCents, firstDueDate, lastDueDate }], totalDueCents }`.
  - Vendas de lotes sem prazo vão para um grupo com `paymentTermDays: null`.
- **Auditoria:** `paymentTermDays` entra no estado de `CONSIGNMENT_CREATED`.
- Atualizar o `BACKEND_API_CONTRACT.md` (seções de consignações e vendedoras).

## Pontos de atenção

- A conta usa a **mesma comissão do snapshot** e o mesmo arredondamento (`ROUND`, meio para cima) dos relatórios de comissão e de margem (`PieceCosts.commission`).
- A data de vencimento é um **dia** no fuso da loja (`settings.timezone`): a venda feita às 23h30 conta como venda daquele dia.
- Venda com data retroativa (`soldAt` informado) usa a data informada.
- Peça devolvida não gera valor a pagar.
- Sem controle de pagamento recebido, "atrasado" não pode ser calculado com certeza. A rota mostra só vencimentos; um controle de recebimento seria uma task futura.

## Critérios de aceite

- [ ] Lote novo exige um prazo permitido e o guarda; lotes antigos aparecem com prazo `null`.
- [ ] Itens vendidos mostram a data de vencimento do pagamento e o valor devido (venda − comissão).
- [ ] A agenda da vendedora agrupa as vendas do período por prazo, com totais e datas corretos no fuso da loja.
- [ ] Mudar `settings.paymentTerms` não altera lotes existentes.
- [ ] Testes unitários (JUnit 5 + Mockito) cobrem validação do prazo, cálculo da data e do valor devido e o agrupamento.

## Observações de dependência

Depende de BACK_06 e BACK_08. A FRONT_15 consome (campo de prazo no wizard e card na página da vendedora).
