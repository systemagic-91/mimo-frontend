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

- [x] O dashboard apresenta os valores da API e todos os componentes recebem os campos esperados.
- [x] O relatório de giro refaz a consulta ao mudar o período e respeita os limites no fuso da loja.
- [x] Inadimplência e estoque parado vêm do backend, com as colunas atuais preservadas.
- [x] O CSV exportado corresponde às linhas exibidas e abre corretamente no Excel.
- [x] Staff não dispara consultas de dashboard/relatórios e recebe UX adequada se acessar a rota.
- [x] Testes cobrem filtros, export, estados de carregamento e erro e conversão de centavos.

## Implementação (2026-11-21)

- **CSV** (`src/lib/csv.ts`): `buildCsv` (separador `;`, BOM, CRLF, aspas em `;`, `,`, aspas e quebra de linha, e apóstrofo antes de texto que começa com `=`, `+`, `-`, `@`, tab ou CR) e `downloadCsv`. Valores em reais saem como "84,90" (`centsToCsvDecimal`). O `exportCsv` antigo de `format.ts` saiu.
- **Dashboard** (`src/pages/Dashboard/`): uma só chamada a `GET /dashboard`, que só dispara para owner. KPIs, ciclo da peça (`stageCounts`) e lotes em aberto vêm da resposta, com centavos convertidos só na tela e "—" quando `avgTurnoverDays` é `null`. A data do cabeçalho e as datas de devolução usam o fuso da loja.
- **Relatórios** (`src/pages/Relatorios/`), uma aba por relatório; cada aba só consulta a API quando está aberta:
  - **giro:** período em datas locais da loja, com atalhos "Mês atual", "Mês anterior" e "Últimos 90 dias". A tela valida `from <= to` e o limite de 366 dias (contando os dois dias, como o backend) antes de consultar. Mostra o resumo da API (quantidade e valor vendido);
  - **inadimplência:** linhas do backend, agora com o telefone na tabela (já estava no CSV);
  - **peças paradas:** dias ajustáveis (30, 60, 90, 180 ou 365), resumo da API e detalhe da peça por `GET /pieces/{id}` ao clicar na linha;
  - o CSV de cada aba sai das linhas recebidas; o nome do arquivo do giro leva o período.
- **Erros:** `src/lib/report-errors.ts` (403, período inválido, dias fora da faixa, rede e servidor).
- **Testes:** `csv.test.ts`, `store-time.test.ts` (contagem de dias), `Dashboard.test.tsx` (valores e centavos, "—", navegação, erro com retry e nenhuma chamada para staff) e `Relatorios.test.tsx` (período no fuso da loja, atalho que refaz a consulta, período inválido sem chamada, CSV do giro e da inadimplência, vazio, erro com retry, troca de dias e detalhe da peça).
- **Verificação contra o Railway** (só leitura, 14 checks): formato do dashboard, giro com 366 dias aceito e com 367 ou `from > to` recusado, inadimplência, peças paradas com 60/90/365 dias e `days=0` recusado, KPI de parados igual ao relatório de 60 dias e detalhe da peça por id. Produção ainda não tem vendas, então as linhas do giro não foram conferidas com dados reais.
- **Limitações:** não foi testado em navegador real nem aberto no Excel; fica para a FRONT_18. As colunas de custo e margem entram na FRONT_24.

## Observações de dependência

Depende de FRONT_11 e BACK_09 (pronto). As colunas de custo e margem entram na FRONT_24. Atualizações por mutation são invalidadas pelos hooks das FRONT_13/15.
