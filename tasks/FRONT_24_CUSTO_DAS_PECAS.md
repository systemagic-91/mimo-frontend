# FRONT_24 - Custo das peças e margem

**Prioridade:** 24 - interface da BACK_23.

## Contexto Motivador

O backend passa a guardar o custo da fábrica e o custo do banho de cada peça, visíveis só para owner (BACK_23). As telas não têm onde informar nem exibir esses valores.

## Objetivo

Permitir que o owner registre e acompanhe custos e margem, sem expor nada disso ao staff.

## Proposta de solução

- Recebimento (Estoque): campo opcional "Custo da fábrica (R$)", visível só para owner.
- Etiquetagem: campo opcional "Custo do banho (R$)", visível só para owner.
- Detalhe da peça: custos da fábrica, do banho e total, com a opção de editar via `PATCH /pieces/{id}/costs` (owner).
- Relatório de giro: colunas "Custo" e "Margem" e total de margem, incluídas no CSV exportado.
- Converter reais para centavos com o mapper único (`moneyToCents`) e exibir "não informado" quando o valor for `null`.

## Pontos de atenção

- Esconder os campos no front é só conforto visual: quem garante a regra é o backend, que nunca manda os custos para o staff.
- Não enviar campos de custo vazios como `0`; vazio significa "não informado" (`null`).
- Peças sem custo ficam fora da soma da margem; deixar isso claro no relatório (ex.: "margem de 12 de 15 peças").

## Critérios de aceite

- [ ] Owner informa e edita os custos nos três pontos (recebimento, etiquetagem e detalhe).
- [ ] Staff não vê nenhum campo, coluna ou valor de custo.
- [ ] O relatório e o CSV mostram custo e margem coerentes com a API.
- [ ] Testes com MSW cobrem a visibilidade por papel e a conversão de valores.

## Observações de dependência

Depende de BACK_23 e das telas migradas na FRONT_13 (estoque/etiquetagem) e na FRONT_16 (relatórios).
