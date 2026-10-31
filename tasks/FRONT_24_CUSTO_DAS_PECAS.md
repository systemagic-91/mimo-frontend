# FRONT_24 - Custo das peças e margem

**Prioridade:** 24 - interface da BACK_23.

## Contexto Motivador

O backend guarda o custo da fábrica e o custo do banho de cada peça, visíveis só para owner (BACK_23, pronta). As telas não têm onde informar nem exibir esses valores. Os tipos já foram atualizados em `src/lib/api/types.ts`: `PieceDto`, `ReceivePieceRequest`, `LabelPieceRequest`, `UpdatePieceCostsRequest` e `TurnoverReportResponse`.

## Objetivo

Permitir que o owner registre e acompanhe custos e margem, sem expor nada disso ao staff.

## Contrato da API (estado em 2026-10-31)

Detalhes na seção 2 (peças) e na seção 6 (giro) do `BACKEND_API_CONTRACT.md`.

- `PieceResponse` traz `factoryCostCents`, `bathCostCents` e `totalCostCents`:
  - o total é a soma dos custos informados e fica `null` quando nenhum foi informado;
  - **para staff os três vêm sempre `null`**;
  - `0` é um custo válido e diferente de `null` ("não informado").
- `POST /pieces/receive` aceita `factoryCostCents` e `POST /pieces/label` aceita `bathCostCents`:
  - valores inteiros em centavos, `>= 0`;
  - **só owner**: se staff enviar um valor (até `0`), recebe `403 FORBIDDEN` e nada é salvo. `null` equivale a não enviar;
  - sem `bathCostCents`, a etiquetagem mantém os custos já gravados.
- `PATCH /pieces/{id}/costs` (owner):
  - campo **ausente** não muda o custo; campo com `null` limpa;
  - é preciso enviar ao menos um campo; valor negativo, não inteiro ou campo desconhecido: `400 VALIDATION_ERROR`;
  - resposta `200 PieceResponse`.
- `GET /reports/turnover`:
  - cada linha ganha `commissionCents` (pelo snapshot de comissão), `totalCostCents` e `marginCents` (venda − fábrica − banho − comissão);
  - `marginCents` só existe quando **os dois custos** estão informados; senão é `null`. Pode ser negativa;
  - o resumo ganha `marginCents` (soma das peças completas, `null` se nenhuma) e `piecesWithoutFullCost`.
- Dashboard, estoque parado e consignações não trazem custo.

## Proposta de solução

- Cliente e hook:
  - `piecesApi.updateCosts(id, input)` e `useUpdatePieceCostsMutation`, com invalidação da peça, da lista e dos relatórios;
  - incluir os campos opcionais nos inputs de `useReceivePieceMutation` e `useLabelPieceMutation`.
- **Recebimento (Estoque):** campo opcional "Custo da fábrica (R$)", só para owner.
- **Etiquetagem:** campo opcional "Custo do banho (R$)", só para owner.
- **Detalhe da peça (owner):**
  - custos da fábrica e do banho e o total, com "não informado" para `null`;
  - edição pelo `PATCH`, enviando só os campos alterados, e `null` quando o owner apagar um valor.
- **Relatório de giro (owner):**
  - colunas "Comissão", "Custo" e "Margem" e o total de margem, também no CSV;
  - com `piecesWithoutFullCost > 0`, mostrar algo como "margem de 12 de 15 vendas; 3 sem os dois custos".
- Converter reais para centavos com `moneyToCents`.

## Pontos de atenção

- Decidir o que mostrar pelo **papel do usuário** (`user.role === "owner"`), e não pela presença de `null`: `null` também significa "não informado" para o owner.
- Nunca mandar campo de custo para staff, nem `0`, nem vazio: o backend responde `403`. Para owner, campo vazio vira `null` ou não é enviado, nunca `0`.
- Esconder no front é só conforto visual; quem garante a regra é o backend.
- Margem parcial não existe: com só um custo informado, a linha mostra o custo total, mas a margem fica "—".

## Critérios de aceite

- [ ] Owner informa e edita os custos nos três pontos (recebimento, etiquetagem e detalhe), inclusive limpando um valor.
- [ ] Staff não vê nenhum campo, coluna ou valor de custo e nunca envia campos de custo.
- [ ] O relatório e o CSV mostram comissão, custo e margem coerentes com a API, incluindo peças sem custo e com custo parcial.
- [ ] Testes com MSW cobrem a visibilidade por papel, o `PATCH` (ausente × `null`) e a conversão de valores.

## Observações de dependência

Depende de BACK_23 (pronta) e das telas migradas na FRONT_13 (estoque/etiquetagem) e na FRONT_16 (relatórios).
