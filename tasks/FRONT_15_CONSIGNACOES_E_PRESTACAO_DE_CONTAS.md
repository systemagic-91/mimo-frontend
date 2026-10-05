# FRONT_15 - Consignações e prestação de contas

**Prioridade:** 15 - conecta a principal movimentação entre estoque e vendedoras.

## Contexto Motivador

As telas de consignação usam `db.sellers`, `db.pieces` e `db.consignments` em memória. A criação seleciona peças etiquetadas e a confirmação é síncrona; venda/devolução não aguardam servidor nem tratam conflito. A tela de vendedora também calcula estatísticas, comissões e vencimentos no browser.

## Objetivo

Migrar listagem de vendedoras/lotes, wizard de nova consignação, histórico, ações de venda/devolução e informações financeiras para API.

## Proposta de solução

- Usar `GET /sellers` para tabela operacional e `GET /sellers/{id}/consignments`, `/stats` e `/commission` na página detalhada.
- Buscar apenas peças etiquetadas e vendedoras ativas no wizard, com busca/paginação e seleção estável por UUID.
- Criar lote por `POST /consignments` com `Idempotency-Key`; exibir o código oficial retornado e só navegar/confirmar sucesso após resposta.
- Registrar venda/devolução nos endpoints de ação; desabilitar o item durante request e atualizar lote, estoque e estatísticas via invalidação.
- Usar `GET /settings` para prazo padrão e termos de pagamento; converter datas de input ao timezone/contrato.
- Adaptar impressão local para usar o lote criado pelo backend e seus snapshots; conservar `window.print()` salvo requisito futuro de PDF.
- Mostrar conflitos de peça indisponível e solicitar atualização/reseleção em vez de fingir criação.

## Pontos de atenção

- As rotas podem atualizar muitos caches distintos; consolidar invalidação de consignments, pieces, sellers e dashboard.
- A regra de lote quitado deve seguir estado retornado pela API.
- Relógio e datas do período de comissão atualmente usam timezone do browser; alinhar a `ZoneId` da loja.
- Garantir que cliques em botões de item não disparem toggle do accordion pai.
- A tela do seller contém fórmula local de prazos de comissão; substituir por valores consistentes da API ou definir explicitamente regra de negócio.

## Critérios de aceite

- [ ] Wizard valida vendedora, ao menos uma peça e data antes do envio.
- [ ] Lote criado tem código, snapshots, prazo e itens iguais aos retornados pelo servidor.
- [ ] Venda/devolução aguardam resultado, evitam double-submit e refletem os estados persistidos.
- [ ] Conflitos `409` recuperam seleção/listagem; `401` e falha de rede recebem tratamento padrão.
- [ ] Dashboard/lista de sellers/detalhe atualizam sem reload após ações.
- [ ] Impressão gera relatório do lote efetivamente criado.
- [ ] Testes cobrem criação, retry, ação de item e atualização/invalidação de cache.

## Observações de dependência

Depende de FRONT_11 e dos endpoints BACK_06 (seller/settings), BACK_08 (consignações) e BACK_05 (peças disponíveis). Pode ser desenvolvida em paralelo com FRONT_13/14/16 com MSW; integração real requer contratos prontos.
