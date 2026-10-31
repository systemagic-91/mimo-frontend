# BACK_02 - Modelo de dados e migrations PostgreSQL

**Prioridade:** 2 - base persistente dos domínios.

## Contexto Motivador

O estado atual (`Db`) é salvo integralmente em `localStorage`, sem isolamento multiusuário, constraints ou consistência transacional. O contrato especifica entidades para usuários, vendedoras, peças, eventos, consignações, itens, configurações, sessões, sequências, auditoria e idempotência.

## Objetivo

Definir e versionar o schema PostgreSQL por Flyway e implementar entidades/repositories JPA com relações e invariantes alinhadas ao contrato.

## Proposta de solução

- Criar migrations incrementais `V1__...sql` para tabelas, constraints, índices e FKs; não usar `ddl-auto=create`.
- Modelar UUIDs, timestamps UTC, enums persistidos por string, valores como `BIGINT` em centavos e `@Version` nas entidades sujeitas a concorrência.
- Criar entidades `User`, `RefreshToken`, `Seller`, `Piece`, `PieceEvent`, `Consignment`, `ConsignmentItem`, `Settings`, `CodeSequence`, `AuditLog` e `IdempotencyKey` conforme o contrato.
- Snapshot de tipo, código, preço e taxa de comissão no item de consignação para preservar histórico.
- Garantir unicidade de código de peça/lote e integridade para não consignar uma peça em mais de um lote aberto.
- Mapear entidades/DTOs com MapStruct; manter DTOs externos independentes das entidades JPA.
- Criar repositories com consultas por domínio e os locks necessários, incluindo busca de peças para atualização.

## Pontos de atenção

- Não usar `@Data` em entidades JPA; evitar `equals/hashCode/toString` que percorra relações lazy.
- Restrições parciais PostgreSQL para unicidade condicional precisam ser decididas e cobertas por migration/teste.
- Definir estratégia de UUID e convenção de nomes snake_case.
- Não colocar dados de demonstração de produção na migration; bootstrap de owner deve ser seguro.

## Critérios de aceite

- [x] Flyway cria todo o schema em PostgreSQL limpo e valida em banco existente.
- [x] Todas as entidades persistem e recuperam relações sem serialização acidental de relações lazy.
- [x] Constraints impedem códigos duplicados, FKs inválidas e estados/valores fora das regras estruturais.
- [x] Há índice para consultas de status, vencimento, histórico e vendas descritas no contrato.
- [x] Valores monetários persistidos em centavos e comissão histórica preservada por snapshot.
- [x] ~~Testes de repository rodam com PostgreSQL via Testcontainers.~~ Substituído em 2026-10-30/31: sem Testcontainers nem testes integrados; as migrations são validadas no CI contra um PostgreSQL limpo (BACK_10).

## Observações de dependência

Depende de BACK_01. Pode ser desenvolvido em paralelo com o desenho dos controllers, mas BACK_03 a BACK_10 dependem dos nomes e constraints finais deste schema. Compartilhar cedo enums/IDs para reduzir conflitos.
