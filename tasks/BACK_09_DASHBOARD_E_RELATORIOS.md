# BACK_09 - Dashboard e relatórios

**Prioridade:** 9 - leitura agregada para gestão e operação.

## Contexto Motivador

Dashboard, KPIs e relatórios são calculados no navegador percorrendo o banco local. A aplicação real precisa que os mesmos resultados sejam agregados a partir dos dados persistidos e estejam protegidos para `owner`.

## Objetivo

Implementar endpoints agregados com cálculos consistentes de giro, estoque parado, itens em posse, atrasos, comissões e relatórios CSV/JSON.

## Proposta de solução

- Implementar `GET /api/v1/dashboard` com KPIs, contagem por etapa, lotes abertos e vendedores atrasados.
- Implementar `GET /reports/turnover?from&to`, `/reports/overdue` e `/reports/stale-pieces?days=60` segundo contratos existentes.
- Usar projeções/queries agregadas JPA ou SQL otimizado; evitar carregar todas as entidades e relações para memória.
- Definir regras: giro entre último etiquetamento e venda; estoque parado desde último evento de etiquetagem; atraso conforme instante/timezone; valor em risco somente itens ainda com vendedora.
- Restringir dashboard/relatórios a owner; suportar paginação em conjuntos grandes.
- Retornar valores em centavos e resumo suficiente para exportação CSV do frontend.

## Pontos de atenção

- O frontend calcula dias de atraso com arredondamentos diferentes em áreas diferentes; definir uma única regra e timezone.
- O contrato atual usa datas inclusivas por dia, mas o código de tela gera timestamps locais. Converter `LocalDate` para limites do fuso da loja e intervalo semiaberto `[from, to+1d)`.
- Giro precisa usar a etiquetagem mais recente após devolução, não necessariamente o primeiro evento histórico.
- KPIs vazios devem ter valores nulos/zero definidos e documentados.
- **Decidido em 2026-10-31:** todo "dias" conta dias de calendário no fuso da loja (classe `CalendarDays`); o giro médio do dashboard usa as vendas dos últimos 90 dias; os relatórios não são paginados (o CSV precisa de tudo) e o giro aceita no máximo 366 dias de período.

## Custos e margem

Se a BACK_23 já estiver pronta, o relatório de giro inclui `totalCostCents` e `marginCents` por linha e `summary.marginCents` (somente peças com custo informado). Caso contrário, esses campos entram junto com a BACK_23.

## Critérios de aceite

- [x] Dashboard entrega todos os campos usados por `Dashboard.tsx` e `PieceTracker`.
- [ ] Os três relatórios reproduzem dados de casos de referência/fixtures do seed atual. (Validados com um cenário controlado contra PostgreSQL real; a comparação com o seed do `localStorage` fica para a FRONT_16, ao trocar as telas para a API. Os números podem diferir de propósito, por causa da regra única de dias.)
- [x] Limites de período, virada de mês, timezone e arredondamentos têm testes determinísticos.
- [x] Staff recebe `403` em dashboard/relatórios.
- [x] Queries têm plano de execução/índices adequados e paginação onde aplicável.
- [x] Export CSV atual pode consumir os resultados sem cálculo de negócio no browser.

## Observações de dependência

Depende de BACK_02, BACK_05, BACK_06 e BACK_08 (consignações e vendas). Pode ser construída em paralelo com a integração das telas do frontend usando os contratos; validação ponta a ponta requer domínios disponíveis.
