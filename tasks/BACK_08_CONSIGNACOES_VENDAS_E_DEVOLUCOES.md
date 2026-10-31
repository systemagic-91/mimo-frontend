# BACK_08 - Consignações, vendas e devoluções

**Prioridade:** 8 - fluxo operacional mais crítico e transacional.

## Contexto Motivador

A criação de lote hoje aceita qualquer vendedor existente, filtra silenciosamente peças etiquetadas, gera código pela contagem e muda diversas estruturas locais. Venda/devolução também atualiza item, peça e eventos sem transação distribuída nem proteção de concorrência.

## Objetivo

Implementar ciclo de vida completo da consignação com validação de estoque, snapshots, locks, idempotência e consistência atômica.

## Proposta de solução

- Criar `GET /consignments`, `GET /consignments/{id}`, `GET /sellers/{sellerId}/consignments` e `POST /consignments`.
- Criar ações `POST /consignments/{id}/items/{pieceId}/sold` e `/returned`.
- **Pré-requisito:** liberar `GET /settings` para `staff` (só leitura; `PATCH` continua exclusivo de owner). O wizard de consignação, usado também pelo staff, precisa do prazo padrão e dos termos de pagamento. Ajustar a regra de rota em `SecurityConfiguration` e o `@PreAuthorize` do `SettingsApplicationService.get`.
- Envolver cada operação que altera mais de um agregado em `@Transactional`.
- Em criação: bloquear a vendedora ativa e todas as peças em ordem determinística, conferir que IDs recebidos correspondem exatamente às peças encontradas e que todas estão `ETIQUETADA`; abortar tudo se alguma validação falhar.
- Reservar código anual `C-YYYY-NNN` via sequence atômica; gravar snapshots de dados/preço/comissão, lote, itens, estado/localização da peça, eventos e audit trail.
- Em venda/devolução: lock item/peça/lote; validar estado; alterar item, peça e timeline; quitar lote quando não sobrar item `COM_VENDEDORA`.
- Tornar ações idempotentes com `Idempotency-Key` ou resposta estável para ação já realizada.

## Pontos de atenção

- Lote `QUITADA` significa que não há itens em posse, inclusive quando todos foram devolvidos; manter essa regra alinhada à UI.
- Lote atrasado é status visual calculado a partir de `dueAt` e timezone, não status persistido divergente.
- Se uma peça aparecer em dois lotes por corrupção/importação, bloquear operação e alertar, sem escolher uma silenciosamente.
- Definir data `dueAt` em timezone da loja e regra para vencimento no dia atual.
- **Decidido em 2026-10-31:** o request envia `dueDate` (data local); o lote vence no fim desse dia no fuso da loja e pode vencer hoje. Venda/devolução repetida em item que já saiu da vendedora responde `409 ITEM_NOT_WITH_SELLER`. `soldAt`/`returnedAt` retroativos são aceitos entre a entrega e agora.
- **Decidido em 2026-10-30:** o snapshot da comissão é capturado na **entrega** (criação do lote). Mudar a taxa da vendedora depois não afeta peças que já estão com ela.
- O romaneio continua sendo impresso pelo navegador (`window.print()`); não há PDF no servidor.

## Critérios de aceite

- [x] Criação com vendedora inativa, lista vazia, peça inválida/duplicada/indisponível falha com erro de domínio claro.
- [x] Criação atualiza lote, itens, peças e eventos integralmente ou não altera nenhum registro.
- [x] Venda e devolução só aceitam item ainda com a vendedora e sincronizam estados/histórico.
- [x] Última venda/devolução quita o lote; operações repetidas não duplicam eventos/comissão.
- [x] Requisições concorrentes não consignam a mesma peça duas vezes nem geram código duplicado.
- [x] Testes unitários (JUnit 5 + Mockito) cobrem validações, rollback por exceção, retry idempotente e respostas de conflito.

## Observações de dependência

Depende de BACK_01, BACK_02, BACK_04, BACK_05 (peças/eventos) e BACK_06 (vendedoras/comissão); padrões de erro/idempotência de BACK_04 também são necessários. FRONT_15 integra os fluxos. Domínios independentes de dashboard podem ser feitos após esta task.
