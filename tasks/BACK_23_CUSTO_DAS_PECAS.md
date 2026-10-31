# BACK_23 - Custo das peças e margem

**Prioridade:** 23 - permite acompanhar o lucro por peça.

## Contexto Motivador

Hoje a peça tem um único valor, `valueCents`, que é o **preço de venda**: a comissão e o valor em posse são calculados sobre ele. Não há como saber quanto a peça custou nem qual foi a margem.

**Decisão de 2026-10-30:** registrar o custo separado em duas partes, ambas opcionais e visíveis só para owner:

- **custo da fábrica** (`factoryCostCents`), informado no recebimento;
- **custo do banho** (`bathCostCents`), informado na etiquetagem.

O custo total é a soma dos dois.

## Objetivo

Guardar os custos das peças com segurança de acesso e expor custo e margem nos relatórios do owner.

## Proposta de solução

- Migration: `pieces.factory_cost_cents BIGINT NULL CHECK (>= 0)` e `pieces.bath_cost_cents BIGINT NULL CHECK (>= 0)`.
- Entrada:
  - `ReceivePieceRequest` aceita `factoryCostCents` opcional;
  - `LabelPieceRequest` aceita `bathCostCents` opcional;
  - nova rota `PATCH /pieces/{id}/costs` (owner, com `Idempotency-Key`) para informar ou corrigir custos depois, aceitando `null` para limpar.
- Saída: `PieceResponse` ganha `factoryCostCents`, `bathCostCents` e `totalCostCents` (soma; `null` se nenhum custo foi informado). Para staff, os três campos vêm sempre `null`.
- Staff que enviar campo de custo recebe `403 FORBIDDEN`. A peça não é salva sem o custo de forma silenciosa.
- Relatório de giro (BACK_09): `totalCostCents` e `marginCents` por linha, onde margem = preço de venda − custo total − comissão (do snapshot); `summary.marginCents` soma só as peças com custo.
- Auditoria `PIECE_COSTS_UPDATED` quando os custos mudarem, com os valores antes e depois.

## Pontos de atenção

- Custo é informação sensível do negócio: nunca enviar para staff, nem no detalhe, nem na lista, nem nos relatórios.
- Peças antigas não terão custo. Relatórios e telas devem tratar `null` como "não informado", e não como zero.
- O snapshot do item de consignação não precisa guardar o custo; o custo da peça não muda com a consignação.
- Os eventos da timeline não precisam mostrar custo.

## Decisões (2026-10-31)

1. **Margem só com os dois custos.** `totalCostCents` soma o que foi informado, mas `marginCents` fica `null` enquanto faltar o custo da fábrica ou o do banho. O resumo soma só as peças completas e informa quantas ficaram de fora (`piecesWithoutFullCost`).
2. **`PATCH /pieces/{id}/costs`: campo ausente não muda, `null` limpa.** É preciso enviar ao menos um campo; campos desconhecidos são recusados.
3. **`null` no recebimento e na etiquetagem equivale a não enviar.** Só um valor de custo enviado por staff dá `403`, e a checagem acontece antes de qualquer gravação (nem a chave de idempotência é consumida).
4. **Staff que etiqueta mantém os custos já gravados** pelo owner.
5. **Comissão da margem com o mesmo arredondamento** (`ROUND` meio para cima) dos relatórios de comissão.
6. **Auditoria com antes e depois:** `PIECE_COSTS_UPDATED` grava `before_state` e `after_state`, só quando algum custo muda, inclusive no recebimento e na etiquetagem.

## Critérios de aceite

- [x] Owner informa o custo da fábrica no recebimento, o do banho na etiquetagem, e corrige os dois depois.
- [x] Staff nunca recebe custos e recebe `403` ao tentar enviá-los.
- [x] `totalCostCents` e a margem do relatório tratam corretamente custos parciais ou ausentes.
- [x] Testes unitários (JUnit 5 + Mockito) cobrem a visibilidade por papel, o cálculo do total e da margem e a validação de valores negativos.

## Observações de dependência

Depende de BACK_05. A parte de margem no relatório depende da BACK_09 (ou é feita junto com ela). FRONT_24 consome estes campos.
