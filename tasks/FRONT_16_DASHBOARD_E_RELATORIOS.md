# FRONT_16 - Dashboard e relatórios

**Prioridade:** 16 - substitui agregações locais por consultas oficiais.

## Contexto Motivador

`Dashboard.tsx` calcula KPIs, etapas e atrasos a partir do estado local; `Relatorios.tsx` filtra datas no navegador e exporta CSV calculado localmente. Esses valores deixam de representar a base real ao migrar as mutations.

## Objetivo

Consumir dashboard e relatórios server-side, preservando visualizações e exportação CSV com filtros corretos.

## Proposta de solução

- Buscar `GET /dashboard` em uma query agregada para KPIs, stage counts, lotes abertos e inadimplência.
- Buscar `GET /reports/turnover`, `/overdue` e `/stale-pieces` usando query params do contrato.
- Manter download CSV client-side sobre as linhas retornadas, preservando BOM, separador e escaping, salvo volume que justifique exportação server-side.
- Converter `valueCents` para moeda apenas na camada de apresentação.
- Adaptar seleção/detalhe de peça para usar `GET /pieces/{id}` e manter navegação para consignação.
- Mostrar loading, erros, retry, resultados vazios e feedback de filtros; validar `from <= to`.

## Pontos de atenção

- O relatório atual cria ISO com timezone implícito do browser e fim às 23:59:59; o contrato deve receber datas locais da loja e backend deve usar intervalo semiaberto.
- Exports CSV precisam proteger escaping de vírgula, aspas, quebra de linha, BOM e injeção de fórmula em planilha.
- Dashboard `/` redireciona staff para estoque, portanto a query não deve ser carregada para staff.
- Evitar múltiplos requests redundantes para dados já contidos em `/dashboard`.

## Critérios de aceite

- [ ] Dashboard apresenta valores da API e todos os componentes recebem os campos esperados.
- [ ] Relatório de giro altera consulta ao mudar período e inclui limites corretos na timezone definida.
- [ ] Inadimplência e estoque parado são calculados pelo backend, com colunas existentes preservadas.
- [ ] CSV exportado corresponde às linhas exibidas e mantém formato aceito pelo Excel.
- [ ] Staff não dispara consulta de dashboard/relatórios e recebe UX adequada se acessar rota diretamente.
- [ ] Testes cobrem filtros, export, estados de carregamento/erro e conversão de centavos.

## Observações de dependência

Depende de FRONT_11 e BACK_09. Pode ser desenvolvida em paralelo com outras migrações de tela com mocks. Atualizações por mutation são invalidadas por FRONT_13/15.
