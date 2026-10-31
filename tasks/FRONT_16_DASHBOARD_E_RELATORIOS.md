# FRONT_16 - Dashboard e relatórios

**Prioridade:** 16 - substitui agregações locais por consultas oficiais.

## Contexto Motivador

`Dashboard.tsx` calcula KPIs, etapas e atrasos a partir do estado local; `Relatorios.tsx` filtra datas no navegador e exporta CSV calculado localmente. Esses valores deixam de representar a base real quando as mutations forem migradas.

O backend (BACK_09) está pronto e os hooks já existem: `useDashboardQuery`, `useTurnoverReportQuery`, `useOverdueReportQuery` e `useStalePiecesReportQuery`.

## Objetivo

Consumir o dashboard e os relatórios do servidor, preservando as visualizações e a exportação CSV com os filtros corretos.

## Contrato da API (estado em 2026-10-31)

Detalhes nas seções 5 e 6 do `BACKEND_API_CONTRACT.md`. **Tudo é só para owner** (staff recebe `403`). Os relatórios não têm paginação.

- `GET /dashboard`:
  - `kpis`: `activeInHand`, `activeInHandValueCents`, `avgTurnoverDays` (`null` sem vendas nos últimos 90 dias), `staleCount`, `staleValueCents` e `overdueSellers`;
  - `stageCounts`, sempre com as seis chaves em minúsculas (`fabrica`, `banho_ouro`, `etiquetada`, `consignacao`, `vendida`, `devolvida`);
  - `openConsignments` (até 200 lotes abertos, no mesmo formato de `GET /consignments`) e `overdueSellers` (as mesmas linhas do relatório de inadimplência).
- `GET /reports/turnover?from=YYYY-MM-DD&to=YYYY-MM-DD`:
  - datas locais da loja, inclusivas, com no máximo 366 dias;
  - `from > to` ou período longo: `400 VALIDATION_ERROR` em `fields.period`; data ausente ou mal formada: `400 INVALID_REQUEST`;
  - linhas: `code`, `type`, `valueCents`, `soldAt`, `sellerId`, `sellerName` e `daysToSell`;
  - resumo: `soldCount` e `soldValueCents`;
  - as colunas de custo e margem (`commissionCents`, `totalCostCents`, `marginCents`, `summary.marginCents`, `summary.piecesWithoutFullCost`) ficam para a FRONT_24.
- `GET /reports/overdue`: uma linha por vendedora com lote vencido (`sellerId`, `sellerName`, `phone`, `lateLots`, `piecesInHand`, `valueAtRiskCents` e `maxOverdueDays`), do maior atraso para o menor.
- `GET /reports/stale-pieces?days=60`:
  - `days` vai de 1 a 3650 (padrão 60);
  - linhas `id`, `code`, `type`, `valueCents` e `daysStopped`; resumo `count` e `valueCents`.
- Todo "dias" conta dias de calendário no fuso da loja.

## Proposta de solução

- Dashboard com uma só chamada a `useDashboardQuery`, sem requests extras para dados que já vêm nela.
- Relatórios com os três hooks:
  - período do giro vindo dos filtros da tela;
  - `days` do estoque parado ajustável quando a tela permitir.
- Calcular "hoje" e os atalhos de período ("mês atual" etc.) no fuso de `settings.timezone` e enviar só `YYYY-MM-DD`; validar `from <= to` e o limite de 366 dias antes de chamar.
- Converter centavos para moeda só na apresentação (`centsToMoney`); mostrar "—" quando `avgTurnoverDays` for `null`.
- Manter o CSV no cliente sobre as linhas recebidas, com BOM, separador, escaping e proteção contra fórmula.
- No detalhe de peça a partir dos relatórios, usar `GET /pieces/{id}` (o relatório de estoque parado traz o `id`).
- Loading, erro com retry, resultado vazio e feedback de filtros.

## Pontos de atenção

- O relatório atual monta ISO com o fuso do navegador e fim às 23:59:59; agora a API recebe só a data local e usa intervalo semiaberto.
- O CSV precisa de escaping de vírgula, aspas e quebra de linha, de BOM e de proteção contra injeção de fórmula.
- A home (`/`) já manda staff para o estoque (`HomeRedirect`) e `/relatorios` é `RequireRole owner`: as queries não podem disparar para staff.

## Critérios de aceite

- [ ] O dashboard apresenta os valores da API e todos os componentes recebem os campos esperados.
- [ ] O relatório de giro refaz a consulta ao mudar o período e respeita os limites no fuso da loja.
- [ ] Inadimplência e estoque parado vêm do backend, com as colunas atuais preservadas.
- [ ] O CSV exportado corresponde às linhas exibidas e abre corretamente no Excel.
- [ ] Staff não dispara consultas de dashboard/relatórios e recebe UX adequada se acessar a rota.
- [ ] Testes cobrem filtros, export, estados de carregamento e erro e conversão de centavos.

## Observações de dependência

Depende de FRONT_11 e BACK_09 (pronto). As colunas de custo e margem entram na FRONT_24. Atualizações por mutation são invalidadas pelos hooks das FRONT_13/15.
