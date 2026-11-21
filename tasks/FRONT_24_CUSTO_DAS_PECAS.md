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

- [x] Owner informa e edita os custos nos três pontos (recebimento, etiquetagem e detalhe), inclusive limpando um valor.
- [x] Staff não vê nenhum campo, coluna ou valor de custo e nunca envia campos de custo.
- [x] O relatório e o CSV mostram comissão, custo e margem coerentes com a API, incluindo peças sem custo e com custo parcial.
- [x] Testes com MSW cobrem a visibilidade por papel, o `PATCH` (ausente × `null`) e a conversão de valores.

## Implementação (2026-11-21)

- **API:** `piecesApi.updateCosts` e `useUpdatePieceCostsMutation`, que grava a peça devolvida no cache do detalhe e invalida peças e relatórios. Os inputs de recebimento e etiquetagem já aceitavam os custos pelos tipos.
- **Papel:** o hook `useIsOwner` (`src/hooks/`) decide o que aparece; Dashboard e página da vendedora passaram a usá-lo também.
- **Valores** (`parseCostToCents` em `src/lib/piece-errors.ts`): vazio é `null` ("não informado"), zero é custo válido, negativo ou com mais de 2 casas é recusado na tela. Campo compartilhado em `src/components/cost-field.tsx`.
- **Recebimento (Estoque):** "Custo da fábrica (R$, opcional)" só para owner. O campo só vai no corpo quando o owner informa um valor (inclusive `0`); vazio não é enviado; staff nunca envia.
- **Etiquetagem:** "Custo do banho (R$, opcional)" só para owner, com a mesma regra, e o valor aparece na confirmação. Sem o campo, a etiquetagem mantém os custos já gravados.
- **Detalhe da peça** (`src/components/piece-costs-section.tsx`, só owner): fábrica, banho e total, com "não informado" para `null`. "Editar custos" manda só o que mudou e `null` quando o owner apaga um valor; sem mudança, não chama a API.
- **Giro:** para owner, colunas "Comissão", "Custo" e "Margem" (margem negativa em destaque, "—" quando a API manda `null`), a margem total e, com `piecesWithoutFullCost > 0`, "margem de X de Y vendas; Z sem os dois custos". O CSV ganha as mesmas três colunas (vazias quando `null`).
- **CSV:** a proteção contra fórmula deixou de marcar texto que é só um número, como "-25,00" (margem negativa); antes o Excel mostraria como texto.
- **Testes:** `parseCostToCents`, `piece-costs.test.tsx` (corpo do `PATCH` ausente × `null`, cache e invalidação), recebimento e etiquetagem para owner e staff, detalhe (exibição, envio só do campo alterado, `null` ao limpar, nada sem mudança, nada para staff) e giro com custo completo, parcial, ausente e margem negativa, inclusive no CSV. As fixtures ganharam `setCurrentUser`.
- **Verificação contra o Railway** (17 checks), só na peça de teste LU-0055 (vendida): custo parcial deixa a margem `null` e conta em `piecesWithoutFullCost`; com os dois custos a margem do giro bate (100 − 30 − 20 − 25 = 25); campo ausente não muda o outro custo; `null` limpa; `0` é válido; corpo vazio, negativo, não inteiro e campo desconhecido dão `400`; recebimento e etiquetagem com custo negativo são recusados sem criar peça. A LU-0055 ficou com fábrica R$ 0,30 e banho R$ 0,20.
- **Staff (verificado em 2026-11-21, durante a FRONT_17, com a conta de teste `staff@email.com`):** `PATCH /pieces/{id}/costs` responde `403 FORBIDDEN` sem mudar nada, e os custos chegam `null` para staff.
- **Limitações:** não foi testado em navegador real.

## Observações de dependência

Depende de BACK_23 (pronta) e das telas migradas na FRONT_13 (estoque/etiquetagem) e na FRONT_16 (relatórios).
