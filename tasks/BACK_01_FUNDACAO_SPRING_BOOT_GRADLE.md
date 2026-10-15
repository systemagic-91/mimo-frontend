# BACK_01 - Fundação Spring Boot com Gradle

**Prioridade:** 1 - bloqueia a implementação integrada do backend.

## Contexto Motivador

O repositório contém apenas o frontend Vite/React. O contrato [BACKEND_API_CONTRACT.md](../BACKEND_API_CONTRACT.md) define Java 21, Spring Boot 3, Gradle com Groovy DSL (`build.gradle`), PostgreSQL, Flyway, Lombok, MapStruct e Springdoc/OpenAPI, mas não existe ainda projeto backend executável.

## Objetivo

Criar uma aplicação backend inicial compilável, com configuração local, teste de contexto e dependências obrigatórias alinhadas ao contrato.

## Proposta de solução

- Criar módulo de backend em diretório acordado (`C:\Users\rayan\Git\mimo-backend`); preservar o frontend atual.
- Criar `build.gradle` em Groovy DSL, wrapper Gradle (`gradlew`, `gradlew.bat`, `gradle/wrapper`) e toolchain Java 21.
- Criar docker compose para subir banco de dados
- Configurar Spring Boot 3.x e dependências Web MVC, Validation, Data JPA, Security Resource Server, PostgreSQL, Flyway, Lombok, MapStruct, `lombok-mapstruct-binding`, Springdoc, Actuator e Testcontainers conforme o contrato.
- Separar dependências de compilação/teste e configurar annotation processors para Lombok e MapStruct.
- Criar `LumaApplication`, pacotes iniciais por domínio, `application.yml` e perfis `local`, `test` e `prod`; segredos devem vir do ambiente.
- Configurar `ddl-auto: validate`, `open-in-view: false`, timezone UTC, CORS parametrizável, health endpoint e documentação OpenAPI.
- Adicionar teste de contexto que inicialize a aplicação com banco de teste substituível e tarefa CI para `./gradlew clean test`.

## Pontos de atenção

- O arquivo exigido é `build.gradle`, não `build.gradle.kts`; o código da aplicação é Java, não Kotlin.
- Compatibilizar versão Springdoc com Spring Boot 3 e manter versões estáveis centralizadas.
- Não incluir segredos, credenciais reais ou dados demo em arquivos versionados.
- Decidir se o backend viverá como subdiretório deste repo ou em repo próprio antes de configurar CI e build raiz.

## Critérios de aceite

- [x] `./gradlew clean test` compila e executa localmente com Java 21.
- [x] Wrapper versionado permite build sem Gradle global instalado.
- [x] Lombok e MapStruct geram código no build; Springdoc publica `/v3/api-docs` e Swagger UI.
- [x] Perfis local/test/prod não dependem de credenciais commitadas.
- [x] Actuator health responde e não expõe endpoints sensíveis publicamente.
- [x] Teste de contexto passa e `ddl-auto` não cria schema automaticamente.

## Observações de dependência

Não depende de outra task. É pré-requisito estrutural para BACK_02 a BACK_10. O frontend pode avançar em paralelo com FRONT_11 usando o contrato existente.
