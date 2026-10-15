# BACK_04 - Contratos HTTP, OpenAPI e erros compartilhados

**Prioridade:** 4 - habilita integração paralela dos domínios e do frontend.

## Contexto Motivador

O contrato define JSON, paginação, erros RFC 7807, request ID, versionamento `/api/v1` e Springdoc, mas esses padrões ainda não existem em código. Sem eles, endpoints de domínios diferentes tendem a divergir e o frontend precisa de tratamentos especiais.

## Objetivo

Criar padrões comuns para controllers REST, validação, erros, paginação, OpenAPI e correlação de requisições.

## Proposta de solução

- Implementar `@RestControllerAdvice` usando `ProblemDetail` e códigos estáveis (`code`, `fields`, `requestId`).
- Padronizar conversão de `MethodArgumentNotValidException`, `ConstraintViolationException`, JSON inválido, entidade ausente, conflito de estado e falha inesperada.
- Criar DTOs comuns de paginação e parâmetros de página ordenados, com máximo 200 itens e whitelist de ordenação por endpoint.
- Criar filtro/interceptor para correlation/request ID, propagando header e MDC nos logs.
- Configurar Springdoc/OpenAPI com título, versão, esquemas JWT, tags por domínio e exemplos; documentar respostas de erro, paginação e autenticação.
- Definir CORS para origem do frontend por configuração; expor `/v3/api-docs` e `/swagger-ui/index.html` conforme ambiente.
- Adicionar contrato de `Idempotency-Key` e armazenamento/replay com fingerprint/status; preparar serviço compartilhado para mutations críticas.

## Pontos de atenção

- Não registrar corpo de login/upload nem dados pessoais nos logs.
- `ProblemDetail` padrão do Spring precisa de propriedades adicionais sem quebrar RFC 7807.
- Repetir uma chave idempotente com payload diferente deve falhar como conflito; chave escopada por usuário/endpoint.
- Evitar que `sort` seja interpolado diretamente em SQL.
- A decisão de endpoints públicos do Swagger em produção deve seguir política operacional.

## Critérios de aceite

- [x] Erros de validação e negócio seguem o mesmo shape e códigos HTTP documentados.
- [x] Cada resposta/log tem request ID correlacionável sem vazar segredos.
- [x] Paginação valida limites e ordenações inválidas retornam `400` padronizado.
- [x] OpenAPI está acessível e descreve schemas, autenticação, endpoints e erros.
- [x] Springdoc usa dependência já incluída no `build.gradle` e configura esquema Bearer.
- [x] Idempotência diferencia retry idêntico de reutilização conflitante.
- [x] Testes de controller cobrem `ProblemDetail`, paginação e headers.

## Observações de dependência

Depende de BACK_01; persistência de idempotência depende de BACK_02. Pode ser feita em paralelo com BACK_03 e os domínios após acordar DTOs básicos. FRONT_11 consome este padrão.
