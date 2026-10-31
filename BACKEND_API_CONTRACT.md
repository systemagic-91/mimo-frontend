# Contrato de backend: Spring Boot + Java

## Objetivo

Este documento transforma o protótipo frontend Mimo/Luma em um contrato de implementação para um backend em **Spring Boot 3.x, Java 21, PostgreSQL e REST**. O frontend começou mantendo todo o estado em `localStorage` (`luma_db_v1`), com as regras em `src/lib/domain.ts`; o backend substitui essa camada por persistência, autenticação, autorização e transações reais.

O backend vive em um repositório próprio (`mimo-backend`, pacote `br.com.luma`). Este contrato reflete o que já está implementado lá e o que ainda falta.

**Última revisão:** 2026-10-30, alinhada ao backend após BACK_01 a BACK_06 e às decisões de produto da mesma data.

Legenda usada nos endpoints: ✅ implementado · ⏳ pendente (task indicada).

## Stack

- Java 21 LTS.
- Spring Boot 3.5.
- Gradle com Groovy DSL, usando o arquivo `build.gradle` (não `build.gradle.kts`).
- Spring Web MVC.
- Spring Data JPA/Hibernate.
- Lombok para reduzir boilerplate em entidades e classes Java, evitando `@Data` em entidades JPA.
- MapStruct para mapeamento explícito entre entidades e DTOs, com geração em tempo de compilação.
- Springdoc/OpenAPI para gerar e servir a especificação e a interface Swagger UI.
- PostgreSQL 16+.
- Flyway para migrations versionadas.
- Spring Security OAuth2 Resource Server + JWT (HS256) para access token.
- Refresh tokens opacos, persistidos como hash e revogáveis no banco.
- Bean Validation (`jakarta.validation`).
- Spring Boot Actuator: `health` público e sem detalhes; `metrics` e `prometheus` só para owner (Micrometer, com métricas de negócio `luma.*`). Tracing com Micrometer Tracing + bridge OpenTelemetry, sem exportador: `traceId`/`spanId` em toda linha de log e `X-Trace-Id` em toda resposta. Logs em JSON no perfil `prod`. Detalhes em `TRACING.md`, `METRICAS.md` e `RUNBOOK.md` no backend (BACK_10).
- **Testes:** JUnit 5 + Mockito para testes unitários; testes de contexto com MockMvc usam H2 em memória. **O projeto não usa Testcontainers nem testes integrados automatizados**, e os testes não exigem Docker nem PostgreSQL. As migrations são validadas no CI contra um PostgreSQL limpo (BACK_10).
- Fotos das peças guardadas no próprio PostgreSQL (`bytea`) e servidas pelo backend (BACK_07). Sem S3 ou outro storage externo.
- Hospedagem: frontend na Vercel; backend e PostgreSQL no Railway. A Vercel faz proxy de `/api/*` para o Railway, então o navegador enxerga front e API na mesma origem.
- Valores monetários persistidos em `long` centavos. A API usa `valueCents`.

### `build.gradle` (Groovy DSL)

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.5.0'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'br.com.luma'
version = '0.0.1-SNAPSHOT'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.9'
    implementation 'org.mapstruct:mapstruct:1.6.3'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    compileOnly 'org.projectlombok:lombok:1.18.38'
    annotationProcessor 'org.projectlombok:lombok:1.18.38'
    annotationProcessor 'org.mapstruct:mapstruct-processor:1.6.3'
    annotationProcessor 'org.projectlombok:lombok-mapstruct-binding:0.2.0'

    runtimeOnly 'org.postgresql:postgresql'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testRuntimeOnly 'com.h2database:h2'

    testCompileOnly 'org.projectlombok:lombok:1.18.38'
    testAnnotationProcessor 'org.projectlombok:lombok:1.18.38'
    testAnnotationProcessor 'org.mapstruct:mapstruct-processor:1.6.3'
    testAnnotationProcessor 'org.projectlombok:lombok-mapstruct-binding:0.2.0'
}

tasks.withType(Test).configureEach {
    useJUnitPlatform()
}
```

Lombok, MapStruct e Springdoc fazem parte da stack obrigatória. Configure os mappers MapStruct com `componentModel = "spring"` (via `MapStructConfiguration`) para injeção pelo Spring. O Lombok não deve gerar `equals`, `hashCode` ou `toString` que percorram relações lazy de entidades JPA; prefira anotações pontuais como `@Getter`, `@Setter` e `@NoArgsConstructor`. Springdoc publica o JSON OpenAPI em `/v3/api-docs` e a Swagger UI em `/swagger-ui/index.html`; em produção, proteger ou desabilitar a interface conforme a política de acesso.

## Convenções da API

- Base URL: `/api/v1`.
- JSON UTF-8; upload de foto usa `multipart/form-data`.
- Datas no JSON: ISO-8601 em UTC, por exemplo `2026-09-18T15:00:00Z`.
- Banco: `Instant` para eventos/timestamps (`TIMESTAMPTZ`, Hibernate em UTC); `LocalDate` para filtros de dia; `ZoneId` configurado em `settings.timezone`.
- Valores monetários: inteiros em centavos. `6490` representa R$ 64,90.
- IDs: UUID (`UUID` em Java), nunca IDs sequenciais expostos.
- Respostas de lista: `items` e `pagination` (`page`, `pageSize`, `total`, `totalPages`).
- Paginação: `page` começa em 1; `pageSize` padrão 50, mínimo 1 e máximo 200. Valores fora disso retornam `400 INVALID_PAGINATION`.
- Ordenação: `sort=campo,asc` ou `sort=campo,desc`, podendo repetir o parâmetro. Somente campos permitidos por endpoint; campo desconhecido ou repetido retorna `400 INVALID_PAGINATION`. Um único `sort=campo,desc` funciona normalmente (até a BACK_08 ele retornava 400 por engano).
- **`Idempotency-Key` é obrigatório** em toda mutation de domínio (peças, vendedoras, configurações, usuários e, quando implementadas, consignações e uploads). Chave ausente, vazia ou com mais de 160 caracteres retorna `400`. Rotas `/auth/*` não usam a chave.
  - A chave é escopada por usuário e operação. Repetir a mesma chave com o mesmo payload (JSON canônico) devolve o status e o corpo salvos, por 24 horas (`IDEMPOTENCY_TTL`).
  - Mesma chave com payload diferente: `409 IDEMPOTENCY_KEY_REUSED`. Requisição concorrente com a mesma chave ainda em execução: `409 IDEMPOTENCY_IN_PROGRESS`.
- Enums no JSON:
  - `role` e `status` de vendedora: minúsculos (`owner`, `staff`, `ativa`, `inativa`). Na entrada, aceitam qualquer caixa.
  - `PieceStage`, `ConsignmentStatus` e `ConsignmentItemStatus`: maiúsculos (`FABRICA`, `BANHO_OURO`, `ABERTA`, `COM_VENDEDORA`...). O frontend converte em `src/lib/api/mappers.ts`.
- Toda resposta inclui `X-Request-Id`. O cliente pode enviar o próprio valor (1 a 64 caracteres: letras, dígitos, `.`, `_`, `-`); valores inválidos são substituídos por `req_<uuid>`. O ID também vai para o MDC de logging.
- Toda resposta inclui também `X-Trace-Id` (32 caracteres hexadecimais, gerado pelo tracing). Ele aparece em toda linha de log da requisição e serve para encontrá-la nos logs do Railway.
- O servidor é a fonte de verdade para códigos, timestamps, status e cálculos.
- Nunca registrar tokens, senhas ou conteúdo de fotos nos logs.

### Resposta de erro

Um `@RestControllerAdvice` (`ApiExceptionHandler`) converte exceções em `ProblemDetail` (RFC 7807) com `Content-Type: application/problem+json`:

```json
{
  "type": "https://api.luma.com.br/problems/piece-not-available",
  "title": "Conflict",
  "status": 409,
  "detail": "Estas peças não estão disponíveis no estoque: LU-0003.",
  "instance": "/api/v1/consignments",
  "code": "PIECE_NOT_AVAILABLE",
  "fields": {
    "pieceIds": ["uuid"]
  },
  "requestId": "req_5b2c..."
}
```

- `type` é derivado do `code` (minúsculo, `_` vira `-`).
- `title` é a frase padrão do status HTTP.
- `fields` só aparece em erros de campo e nunca ecoa o valor enviado.
- Erros internos nunca incluem stack trace, mensagem de exceção ou senha.

| Status | Uso                                                                 | Códigos em uso                                                                                                                                                                                     |
| -----: | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  `400` | JSON inválido, Bean Validation, paginação, idempotência mal formada | `INVALID_REQUEST`, `VALIDATION_ERROR`, `INVALID_PAGINATION`, `INVALID_IDEMPOTENCY_KEY`, `INVALID_IDEMPOTENCY_SCOPE`, `INVALID_IDEMPOTENCY_PAYLOAD`, `PASSWORD_UNCHANGED`                           |
|  `401` | Não autenticado ou credencial inválida                              | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `INVALID_ACCESS_TOKEN`                                                                                                          |
|  `403` | Sem permissão ou usuário inativo                                    | `FORBIDDEN`, `USER_INACTIVE`                                                                                                                                                                       |
|  `404` | Recurso inexistente                                                 | `NOT_FOUND`, `PIECE_NOT_FOUND`, `SELLER_NOT_FOUND`, `PHOTO_NOT_FOUND`, `CONSIGNMENT_NOT_FOUND`, `CONSIGNMENT_ITEM_NOT_FOUND`                                                                       |
|  `409` | Conflito de estado, concorrência ou idempotência                    | `CONFLICT` (lock otimista/integridade), `INVALID_PIECE_TRANSITION`, `PIECE_NOT_AVAILABLE`, `ITEM_NOT_WITH_SELLER`, `PIECE_STATE_INCONSISTENT`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS` |
|  `413` | Arquivo maior que o limite                                          | `PHOTO_TOO_LARGE`                                                                                                                                                                                  |
|  `415` | `Content-Type` não aceito pelo endpoint                             | `UNSUPPORTED_MEDIA_TYPE`                                                                                                                                                                           |
|  `422` | Regra de negócio                                                    | `INVALID_INITIAL_STAGE`, `SELLER_INACTIVE`, `EMPTY_ITEMS`, `DUE_DATE_IN_PAST`, `LAST_OWNER`, `CANNOT_DEACTIVATE_SELF`, `CANNOT_CHANGE_OWN_ROLE`, `CANNOT_RESET_OWN_PASSWORD`                     |
|  `429` | Rate limit                                                          | `RATE_LIMITED`                                                                                                                                                                                     |
|  `500` | Erro inesperado                                                     | `INTERNAL_ERROR`                                                                                                                                                                                   |

Códigos da BACK_19 fora da tabela: `403 PASSWORD_CHANGE_REQUIRED`, `409 EMAIL_ALREADY_USED` e `404 USER_NOT_FOUND`.

## Organização do projeto Java

```text
src/main/java/br/com/luma/
  LumaApplication.java
  config/                 # Security, CORS, JWT, OpenAPI, Clock, MapStruct
  shared/                 # enums, ProblemDetail, paginação, idempotência, auditoria, exceções
  auth/                   # controller, service, JWT, user, refresh token
  piece/                  # entity, repository, service, controller, dto, mapper
  seller/
  setting/
  consignment/            # entidades, repositories e mappers (service/controller na BACK_08)
  dashboard/              # BACK_09
  report/                 # BACK_09
  upload/                 # fotos das peças (BACK_07)
src/main/resources/
  application.yml
  application-local.yml
  application-prod.yml
  application-test.yml
  db/migration/V1__create_initial_schema.sql
  db/migration/V2__add_user_auth_version.sql
  db/migration/V3__seed_default_store_settings.sql
  db/migration/V4__require_active_seller_for_consignment.sql
  db/migration/V5__store_piece_photos.sql
```

Fluxo: `Controller -> ApplicationService -> Repository`. Controllers recebem DTOs, services aplicam regras/transações e entities não são serializadas diretamente.

## Segurança Spring Security

### Regras

- Públicos: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/photos/{photoId}`, `/actuator/health`, `POST /api/v1/auth/logout`, `/v3/api-docs/**` e Swagger UI. Nas três rotas públicas de sessão o header `Authorization` é ignorado, para que um access token vencido não atrapalhe o logout.
- `/actuator/metrics/**` e `/actuator/prometheus`: só owner (staff `403`, anônimo `401`).
- Todas as outras rotas exigem JWT válido.
- `owner`: dashboard, relatórios, configurações, usuários e custos das peças, além dos fluxos operacionais. Pode haver mais de um owner.
- `staff`: estoque, etiquetagem, consignações, consulta de vendedoras (lista, detalhe e histórico) e **leitura** de `GET /settings`. Não acessa dashboard, relatórios, usuários, custos, mutations de vendedora/configurações nem stats/comissão.
- Usuário com `mustChangePassword = true` só acessa `GET /auth/me`, `POST /auth/change-password` e `POST /auth/logout`; o resto retorna `403 PASSWORD_CHANGE_REQUIRED` (BACK_19). Login e refresh continuam funcionando, e o refresh mantém o bloqueio.
- A autorização é repetida no service com `@PreAuthorize`, além das regras por rota.
- Senha com BCrypt; nunca texto puro.
- Access token JWT HS256 com 15 minutos por padrão. Claims: `sub` (id do usuário), `email`, `roles`, `authVersion` e `mustChangePassword`. Toda mudança de `mustChangePassword` incrementa o `authVersion`, então o claim nunca fica desatualizado; o bloqueio da troca obrigatória lê o claim, sem consulta extra ao banco.
  - O `AuthTokenValidator` rejeita o token se o usuário estiver inativo ou se `authVersion` não bater com o banco. Trocar a senha incrementa `authVersion` e invalida na hora todos os access tokens.
- Refresh token opaco (32 bytes aleatórios), com validade de 30 dias e salvo apenas como hash SHA-256.
  - É rotacionado a cada uso.
  - É revogado no logout e na troca de senha.
  - Reutilizar um token já revogado revoga todas as sessões ativas do usuário.
- Rate limit de login: 5 tentativas a cada 15 minutos por IP **e** por e-mail (`LOGIN_MAX_ATTEMPTS`, `LOGIN_RATE_LIMIT_WINDOW`); um login certo zera os dois contadores. O limite por e-mail barra força bruta numa conta mesmo que alguém invente IPs no `X-Forwarded-For` chamando o Railway direto. Efeito colateral aceito: 5 erros num e-mail bloqueiam aquele e-mail por 15 minutos. Rate limit de upload de foto por usuário: 30 a cada minuto (`UPLOAD_MAX_PER_WINDOW`, `UPLOAD_RATE_LIMIT_WINDOW`).
  - `server.forward-headers-strategy: framework` (BACK_21): `getRemoteAddr()` devolve o primeiro IP de `X-Forwarded-For`, ou seja, o IP real atrás da Vercel e do Railway. É esse IP que vai para o rate limit e a auditoria.
- CORS restrito às origens de `CORS_ALLOWED_ORIGINS` (padrão local `http://localhost:5173`). Com o proxy da Vercel em produção e o proxy do Vite em desenvolvimento (FRONT_22), o navegador não faz chamadas cross-origin; o CORS fica só como proteção para acessos diretos.
  - Headers permitidos: `Authorization`, `Content-Type`, `Idempotency-Key` e `X-Request-Id`.
  - Headers expostos: `Location`, `X-Request-Id` e `X-Trace-Id`.
- **Sessão (BACK_21):**
  - o refresh token viaja só no cookie `luma_refresh` (`HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age` = `JWT_REFRESH_TOKEN_TTL`) e nunca no corpo;
  - o access token continua no corpo e em memória no frontend;
  - a Vercel faz proxy de `/api/*` para o Railway (rewrite em `vercel.json`), e o Vite faz o mesmo em desenvolvimento (FRONT_22). Assim front e API ficam na mesma origem e o cookie é "do próprio site", inclusive no Safari;
  - proteção contra CSRF em `/auth/refresh` e `/auth/logout`: `SameSite=Strict` + `403` quando o header `Origin` existe e não está em `CORS_ALLOWED_ORIGINS`. Pedido sem `Origin` (curl, Postman) é aceito, porque navegadores sempre mandam `Origin` em `POST`. Origem estrangeira costuma ser barrada antes pelo próprio CORS (`403` sem corpo); quando o pedido parece da mesma origem, o backend responde `403 ORIGIN_NOT_ALLOWED`;
  - nome, `Secure` e `SameSite` do cookie são configuráveis (`REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_SECURE`, `REFRESH_COOKIE_SAME_SITE`); o padrão é o seguro;
  - explicação em linguagem simples: `SESSAO_E_COOKIES.md`.
- Primeiro owner: provisionado uma única vez pelas variáveis `BOOTSTRAP_OWNER_*` (ver README do backend). Não existe usuário ou senha padrão versionados.

Configuração atual (resumida):

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http, ...) throws Exception {
    return http
        .csrf(AbstractHttpConfigurer::disable) // reavaliar se o refresh migrar para cookie
        .cors(Customizer.withDefaults())
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .exceptionHandling(...) // 401 UNAUTHENTICATED e 403 FORBIDDEN em ProblemDetail
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health", "/actuator/health/**",
                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
            .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
            .requestMatchers("/api/v1/dashboard/**", "/api/v1/reports/**", "/api/v1/settings/**").hasRole("OWNER") // GET /settings passa a aceitar STAFF (BACK_08)
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(...)))
        .build();
}
```

`@EnableMethodSecurity` está ativo; services usam `@PreAuthorize("hasRole('OWNER')")` ou `hasAnyRole('OWNER', 'STAFF')`.

## Modelos JPA e banco

### `users`

`id UUID PK`, `name`, `email` (único por `lower(email)`), `password_hash`, `role`, `active`, `auth_version`, `must_change_password` (V6, `BOOLEAN NOT NULL DEFAULT false`), `created_at`, `updated_at`.

```java
public enum Role { OWNER, STAFF }
```

### `refresh_tokens`

`id UUID PK`, `user_id FK`, `token_hash UNIQUE`, `expires_at`, `revoked_at`, `created_at`, `replaced_by_id`.

### `sellers`

`id UUID PK`, `name`, `phone`, `commission_rate`, `status` (`ATIVA`/`INATIVA`), `created_at`, `updated_at`, `version`.

`commission_rate` é inteiro percentual. Não apagar vendedoras com histórico; usar `INATIVA`. Um trigger (V4) impede criar consignação ou trocar o `seller_id` de uma consignação para vendedora `INATIVA`.

### `pieces`

`id UUID PK`, `code UNIQUE`, `type`, `value_cents BIGINT > 0`, `status`, `current_location`, `photo_id UUID NULL FK -> piece_photos(id)`, `note`, `created_at`, `updated_at`, `version BIGINT`.

A V5 (BACK_07) trocou a antiga `photo_url` por `photo_id`. Uma mesma foto pode ser ligada a mais de uma peça.

Mudanças decididas:

- **BACK_23:** custos opcionais, visíveis só para owner: `factory_cost_cents BIGINT NULL CHECK (>= 0)` (custo da fábrica) e `bath_cost_cents BIGINT NULL CHECK (>= 0)` (custo do banho). O custo total é a soma dos dois e não é persistido.

`value_cents` continua sendo o **preço de venda**: é a base da comissão e do valor em posse.

```java
public enum PieceStage {
    FABRICA, BANHO_OURO, ETIQUETADA, CONSIGNACAO, VENDIDA, DEVOLVIDA
}
```

`version` é `@Version` para controle otimista, além de locks pessimistas (`findByIdForUpdate`, `findAllForUpdate`) nas operações de escrita.

### `piece_events`

`id UUID PK`, `piece_id FK`, `stage`, `occurred_at`, `note`, `actor_user_id FK`. Eventos são imutáveis (trigger rejeita `UPDATE`/`DELETE`) e ordenados por `occurred_at`, com desempate por `id`. Um evento novo nunca recebe horário anterior ao último evento da peça (no mínimo, +1 ms).

### `consignments`

`id UUID PK`, `code UNIQUE`, `seller_id FK`, `delivered_at`, `due_at` (`>= delivered_at`), `status` (`ABERTA`/`QUITADA`), `note`, `created_by FK`, `created_at`, `updated_at`, `version`.

### `consignment_items`

`id UUID PK`, `consignment_id FK`, `piece_id FK`, `code_snapshot`, `type_snapshot`, `value_cents_snapshot`, `commission_rate_snapshot`, `status` (`COM_VENDEDORA`/`VENDIDA`/`DEVOLVIDA`), `sold_at`, `returned_at`, `created_at`, `updated_at`, `version`.

O índice único parcial `uk_consignment_items_active_piece` impede a mesma peça em dois itens `COM_VENDEDORA`. Uma constraint garante coerência entre `status`, `sold_at` e `returned_at`. O snapshot da comissão é capturado **na entrega** (criação do lote) e preserva o cálculo histórico: mudar a taxa da vendedora só afeta lotes novos.

### `settings`

Linha única (`singleton_key = true`): `id`, `commission_min`, `commission_max`, `commission_step`, `default_commission_rate`, `payment_terms` (`jsonb`), `default_consignment_days`, `timezone`, `updated_at`, `updated_by`, `version`.

A migration V3 cria os valores padrão:

- comissão de 25% a 40%, em passos de 5, com padrão de 30%;
- prazos de pagamento `[30, 60, 90]`;
- 30 dias de consignação;
- fuso `America/Sao_Paulo`.

### Tabelas auxiliares

- `code_sequences(scope, sequence_year, next_value)` com chave única `(scope, sequence_year)`, para geração atômica via `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`. Peças usam `scope = 'PIECE'` e `sequence_year = 0`; lotes usam `scope = 'CONSIGNMENT'` com o ano corrente no fuso da loja (o contador recomeça a cada ano).
- `audit_logs` com ator, ação, `entity_type`, `entity_id`, `before_state`/`after_state` (JSON), IP e timestamp.
- `idempotency_keys` com usuário, chave escopada (`operação:chave`), fingerprint SHA-256, status e corpo da resposta, `created_at` e `expires_at`.
- `piece_photos` (V5): `id UUID PK`, `content BYTEA`, `content_type` (`image/jpeg`, `image/png` ou `image/webp`), `width` e `height` (1 a 2000), `size_bytes` (até 1 MB), `created_by FK`, `created_at`. Todo dia às 4h (horário de Brasília) um job apaga as fotos criadas há mais de 24 horas que nenhuma peça usa (`PHOTO_CLEANUP_CRON`, `PHOTO_CLEANUP_ZONE`).

### Índices e constraints

```sql
CREATE UNIQUE INDEX uk_users_email_lower ON users (lower(email));
CREATE INDEX ix_refresh_tokens_user_expiry ON refresh_tokens(user_id, expires_at);
CREATE INDEX ix_sellers_status_name ON sellers(status, lower(name));
-- pieces.code: CONSTRAINT uk_pieces_code UNIQUE (code)
CREATE INDEX ix_pieces_status_updated ON pieces(status, updated_at);
CREATE INDEX ix_piece_events_piece_time ON piece_events(piece_id, occurred_at, id);
-- consignments.code: CONSTRAINT uk_consignments_code UNIQUE (code)
CREATE INDEX ix_consignments_seller_delivered ON consignments(seller_id, delivered_at DESC);
CREATE INDEX ix_consignments_status_due ON consignments(status, due_at);
CREATE UNIQUE INDEX uk_consignment_items_active_piece ON consignment_items(piece_id)
    WHERE status = 'COM_VENDEDORA';
CREATE INDEX ix_items_piece_status ON consignment_items(piece_id, status);
CREATE INDEX ix_items_status_sold_at ON consignment_items(status, sold_at);
CREATE INDEX ix_items_consignment_status ON consignment_items(consignment_id, status);
CREATE INDEX ix_audit_logs_entity_time ON audit_logs(entity_type, entity_id, occurred_at DESC);
CREATE INDEX ix_audit_logs_actor_time ON audit_logs(actor_user_id, occurred_at DESC);
CREATE INDEX ix_idempotency_expiry ON idempotency_keys(expires_at);
```

Todas as alterações de schema devem ser migrations Flyway. `ddl-auto` fica em `validate`; nunca usar `create` ou `update`.

## DTOs Java

Exemplo de request (recebimento):

```java
public record ReceivePieceRequest(
    @NotBlank @Pattern(regexp = "(?:Brinco|Colar|Pulseira|Anel|Pingente|Tornozeleira)")
    @Size(max = 80) String type,
    @Positive long valueCents,
    @NotNull PieceStage stage,
    @Size(max = 500) String note,
    @PositiveOrZero Long factoryCostCents   // BACK_23: opcional, só owner
) {}
```

Exemplo de resposta:

```java
public record PieceResponse(
    UUID id,
    String code,
    String type,
    long valueCents,
    PieceStage status,
    String currentLocation,
    String photoUrl,          // derivado de photo_id -> "/api/v1/photos/{photoId}"; null sem foto
    String note,
    Instant createdAt,
    Instant updatedAt,
    long version,
    Long factoryCostCents,    // BACK_23: null para staff
    Long bathCostCents,       // BACK_23: null para staff
    Long totalCostCents       // BACK_23: null para staff ou sem custo informado
) {}
```

Usar DTOs separados para request e response. Não expor entidades JPA, `passwordHash`, tokens, campos internos ou relações lazy diretamente no JSON.

## Catálogo de endpoints

Todas as rotas abaixo têm o prefixo `/api/v1`.

### 1. Autenticação ✅

#### `POST /auth/login` (público) ✅

Request:

```json
{ "email": "owner@example.com", "password": "..." }
```

O e-mail é normalizado (trim + minúsculas). Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Sócia(o) 1",
    "email": "owner@example.com",
    "role": "owner",
    "active": true,
    "createdAt": "2026-09-01T12:00:00Z",
    "updatedAt": "2026-09-01T12:00:00Z"
  },
  "session": {
    "loggedAt": "2026-09-18T15:00:00Z",
    "expiresAt": "2026-09-18T15:15:00Z"
  },
  "accessToken": "jwt"
}
```

Junto, o header `Set-Cookie: luma_refresh=<token>; Path=/api/v1/auth; Max-Age=2592000; Expires=...; Secure; HttpOnly; SameSite=Strict`. O refresh token não aparece no corpo (BACK_21).

Erros:

- `401 INVALID_CREDENTIALS`: e-mail inexistente ou senha errada. A resposta é genérica, e o e-mail inexistente também passa por uma verificação BCrypt (com hash fictício), para não revelar se a conta existe.
- `403 USER_INACTIVE`.
- `429 RATE_LIMITED`.

#### `POST /auth/refresh` (público) ✅

Sem corpo: lê o cookie `luma_refresh` e confere o header `Origin`. Revoga o token anterior e responde no mesmo formato do login, com o refresh novo no cookie. Sem cookie, ou com token inválido, responde `401` e apaga o cookie (`Max-Age=0`). Token desconhecido, expirado, revogado ou de usuário inativo retorna `401 INVALID_REFRESH_TOKEN`; reutilizar um token revogado também revoga todas as sessões do usuário.

#### `POST /auth/logout` ✅

Público e sem corpo: confere o `Origin`, lê o cookie, revoga o token (se existir) e apaga o cookie (`Max-Age=0`). Funciona mesmo com o access token vencido ou sem cookie. Resposta `204`.

#### `GET /auth/me` ✅

Retorna `{ "user": {...}, "session": { "loggedAt", "expiresAt" } }` a partir do access token atual. O frontend usa esta rota no bootstrap da sessão.

#### `POST /auth/change-password` ✅

Request:

- `currentPassword`;
- `newPassword`, com 12 a 72 caracteres e diferente da atual.

Resposta `204`. Incrementa `authVersion`, revoga todos os refresh tokens (o que invalida as sessões anteriores na hora, inclusive a atual) e zera `mustChangePassword`. Depois da troca, o frontend manda a pessoa para o login, onde ela entra com a senha nova.

A resposta também apaga o cookie `luma_refresh`.

Erros: `401 INVALID_CREDENTIALS` (senha atual errada) e `400 PASSWORD_UNCHANGED`.

### 2. Peças e estoque ✅

Acesso owner/staff em todas as rotas. Campos de custo só aparecem e só podem ser enviados por owner (BACK_23).

#### `GET /pieces` ✅

Query:

- `q` (até 120 caracteres): pesquisa parcial, sem diferenciar maiúsculas, no código e no tipo.
- `status`: um `PieceStage` em maiúsculas.
- `page`, `pageSize` e `sort`. O `sort` aceita apenas `code`, `type`, `valueCents`, `status`, `currentLocation`, `createdAt` e `updatedAt`.

Retorna `items` (`PieceResponse`) e `pagination`.

A resposta **não** inclui o valor total filtrado (`totalValueCents`). Se a tela de estoque precisar dele, adicionar ao endpoint junto com a FRONT_13.

#### `GET /pieces/{pieceId}` ✅

Retorna `PieceResponse`. Os eventos ficam na rota separada abaixo. Peça inexistente: `404 PIECE_NOT_FOUND`.

#### `GET /pieces/{pieceId}/events` ✅

Retorna a lista (não paginada) de eventos em ordem crescente de `occurredAt`, com desempate por `id`: `id`, `pieceId`, `stage`, `occurredAt`, `note` e `actorUserId`.

#### `GET /pieces/next-code` ✅

Somente pré-visualização. Retorna `{ "code": "LU-0813" }`. O código definitivo é sempre gerado no service transacional, então o valor pode mudar até a peça ser salva.

#### `POST /pieces/receive` ✅

Exige `Idempotency-Key`. Cria uma peça recebida da fábrica ou encaminhada ao banho.

```json
{
  "type": "Brinco",
  "valueCents": 8490,
  "stage": "FABRICA",
  "note": "Lote do fornecedor"
}
```

Regras:

- Aceita só os tipos `Brinco`, `Colar`, `Pulseira`, `Anel`, `Pingente` ou `Tornozeleira`; outros retornam `400 VALIDATION_ERROR`.
- Aceita só os estágios `FABRICA` ou `BANHO_OURO`; outros retornam `422 INVALID_INITIAL_STAGE`.
- Gera o código `LU-XXXX`, a peça e o evento inicial.
- Localização inicial: `Fábrica` ou `No banho de ouro`.
- Para `BANHO_OURO`, registra também o evento `FABRICA` 1 ms antes.

Response `201`: `{ "piece": { ... }, "events": [ ... ] }`.

BACK_23: aceita `factoryCostCents` opcional. Se um staff enviar esse campo, a resposta é `403 FORBIDDEN`.

#### `POST /pieces/label` ✅

Exige `Idempotency-Key`. Request:

```json
{
  "sourcePieceId": "uuid",
  "type": "Brinco",
  "valueCents": 8490,
  "photoId": "uuid",
  "note": "Dourado",
  "backFromBath": true,
  "bathCostCents": 1200
}
```

`photoId` é opcional e é o ID devolvido por `POST /uploads/piece-photo`: só fotos enviadas ao próprio backend podem ser ligadas à peça (o antigo `photoUrl` de texto livre não existe mais). `bathCostCents` é opcional e só para owner (BACK_23).

**Decisão implementada:** `sourcePieceId` aponta para uma peça existente em `BANHO_OURO`. O service trava essa peça e a atualiza:

- mantém o código;
- grava o tipo e o valor enviados;
- muda o status para `ETIQUETADA` e a localização para `Estoque`;
- liga a foto (`photoId`) e grava `note` quando enviados;
- adiciona o evento `ETIQUETADA`.

Response `200`: `PieceResponse`.

Erros:

- `backFromBath: false` ou peça fora de `BANHO_OURO`: `409 INVALID_PIECE_TRANSITION`.
- Peça inexistente: `404 PIECE_NOT_FOUND`.
- `photoId` inexistente: `404 PHOTO_NOT_FOUND` (a peça não é alterada).

O frontend ainda cria uma peça nova localmente e precisa migrar para este fluxo na FRONT_13. Nunca deixar duas peças independentes para o mesmo item físico.

#### `PATCH /pieces/{pieceId}/costs` ⏳ (BACK_23)

Acesso owner; exige `Idempotency-Key`. Request: `{ "factoryCostCents": 3000, "bathCostCents": 1200 }`. Os dois campos são opcionais e aceitam `null` para limpar o valor. Serve para informar ou corrigir custos depois do recebimento. Response `200`: `PieceResponse`. Grava auditoria `PIECE_COSTS_UPDATED`.

### 3. Vendedoras ✅

#### `GET /sellers` ✅

Acesso owner/staff. Query:

- `status`: `ativa` ou `inativa`, em qualquer caixa.
- `q` (até 120 caracteres): pesquisa no nome e no telefone.
- `page`, `pageSize` e `sort`. O `sort` aceita `name`, `phone`, `commissionRate`, `status`, `createdAt` e `updatedAt`.

Vendedoras inativas continuam listadas. A resposta traz os dados e os agregados da tela de consignação:

```json
{
  "items": [
    {
      "seller": {
        "id": "uuid",
        "name": "Ana Ribeiro",
        "phone": "(11) 98888-0001",
        "commissionRate": 30,
        "status": "ativa",
        "createdAt": "2026-09-01T12:00:00Z",
        "updatedAt": "2026-09-01T12:00:00Z"
      },
      "piecesInHand": 2,
      "valueInHandCents": 18890,
      "nextDueAt": "2026-09-23T12:00:00Z",
      "nextDueDays": 5,
      "late": false,
      "openLots": 1
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "total": 1, "totalPages": 1 }
}
```

- `nextDueDays` é a diferença em dias de calendário no fuso da loja (negativo quando já venceu).
- `late` é `true` quando `nextDueAt` é anterior ao instante atual.

#### `POST /sellers` ✅

Acesso owner; exige `Idempotency-Key`. Request: `name`, `phone`, `commissionRate`. Cria a vendedora como `ativa`, com `name` e `phone` sem espaços nas pontas. A comissão precisa respeitar a faixa e o passo de `settings`; se não respeitar, retorna `400 VALIDATION_ERROR` com `fields.commissionRate`. Response `201`: `SellerResponse`. Grava auditoria `SELLER_CREATED`.

#### `GET /sellers/{sellerId}` ✅

Acesso owner/staff. Retorna `SellerResponse`. Vendedora inexistente: `404 SELLER_NOT_FOUND`.

#### `PATCH /sellers/{sellerId}` ✅

Acesso owner; exige `Idempotency-Key`. Aceita `name`, `phone`, `commissionRate` e `status` (`ativa`/`inativa`). A UI usa a mesma operação para editar e para ativar/inativar.

Regras:

- É preciso enviar pelo menos um campo.
- Nome vazio, status desconhecido ou comissão fora da faixa retornam `400 VALIDATION_ERROR`.
- Inativar não apaga os lotes existentes.
- Grava auditoria `SELLER_UPDATED`.

#### `GET /sellers/{sellerId}/stats` ✅

Acesso owner. Retorna `inHand`, `inHandValueCents`, `totalSoldCount`, `totalSoldValueCents` e `totalCommissionCents`.

#### `GET /sellers/{sellerId}/commission?from=YYYY-MM-DD&to=YYYY-MM-DD` ✅

Acesso owner. `from` e `to` são datas locais inclusivas no fuso da loja; o backend consulta o intervalo semiaberto `[from 00:00, to+1 00:00)`. Período inválido (`from > to`) retorna `400 VALIDATION_ERROR` com `fields.period`.

Retorna `soldCount`, `soldValueCents` e `commissionCents`, calculados com o `commissionRateSnapshot` de cada item vendido, não com a taxa atual da vendedora.

#### `GET /sellers/{sellerId}/consignments` ✅

Acesso owner/staff. Histórico do mais recente para o mais antigo (`deliveredAt` desc). Aceita `status` (`aberta`/`quitada`, em qualquer caixa) e paginação. Os campos de `sort` aceitos são `code`, `deliveredAt`, `dueAt`, `status` e `createdAt`.

Cada item retorna `ConsignmentResponse`: `id`, `code`, `sellerId`, `deliveredAt`, `dueAt`, `status`, `note`, `createdById` e `version`. Os itens do lote vêm de `GET /consignments/{id}`.

### 4. Consignações ✅ (BACK_08)

Acesso owner/staff em todas as rotas. Toda mutation exige `Idempotency-Key`: repetir a mesma chave com o mesmo payload devolve a resposta salva, sem duplicar lote, evento ou comissão.

O romaneio do lote continua sendo impresso pelo navegador (`window.print()`, com a opção "Salvar como PDF"). Não há PDF gerado no servidor.

**Vencimento:** o request envia `dueDate`, uma data local da loja (`YYYY-MM-DD`). O backend grava `dueAt` como o último instante desse dia no fuso de `settings.timezone` (ex.: `2026-11-30` em `America/Sao_Paulo` vira `2026-12-01T02:59:59.999999Z`). O lote só fica **atrasado** a partir do dia seguinte. Vencer hoje é permitido; vencer no passado não.

**Atraso** é calculado na leitura (`status = ABERTA` e agora `> dueAt`); nunca é persistido.

#### `GET /consignments` ✅

Query opcional:

- `status`: `aberta` ou `quitada` (qualquer caixa);
- `sellerId`;
- `overdue`: `true` só os atrasados, `false` só os não atrasados;
- paginação; `sort` aceita `code`, `deliveredAt`, `dueAt`, `status` e `createdAt` (padrão `deliveredAt,desc`).

Cada item (`ConsignmentListItem` no front):

```json
{
  "id": "uuid",
  "code": "C-2026-001",
  "sellerId": "uuid",
  "deliveredAt": "2026-10-30T15:00:00Z",
  "dueAt": "2026-12-01T02:59:59.999999Z",
  "dueInDays": 31,
  "status": "em_dia",
  "note": "Lote de outubro",
  "createdById": "uuid",
  "version": 0,
  "seller": {
    "id": "uuid",
    "name": "Ana",
    "phone": "...",
    "commissionRate": 30,
    "status": "ativa"
  },
  "piecesInHand": 2,
  "valueInHandCents": 20000
}
```

Aqui `status` é o **status visual**: `em_dia`, `atrasada` ou `quitada`. `dueInDays` são os dias de calendário até o vencimento (0 = vence hoje, negativo = atrasado), pela regra única de dias da seção 6.

#### `GET /consignments/{consignmentId}` ✅

Retorna `ConsignmentDetails`: os campos do lote com `status` persistido (`ABERTA`/`QUITADA`), `late` (boolean), `seller` e `items` (ordenados por código). Cada item tem `id`, `consignmentId`, `pieceId`, `codeSnapshot`, `typeSnapshot`, `valueCentsSnapshot`, `commissionRateSnapshot`, `status` (`COM_VENDEDORA`/`VENDIDA`/`DEVOLVIDA`), `soldAt`, `returnedAt` e `version`. Lote inexistente: `404 CONSIGNMENT_NOT_FOUND`.

#### `POST /consignments` ✅

Request:

```json
{
  "sellerId": "uuid",
  "pieceIds": ["uuid", "uuid"],
  "dueDate": "2026-11-30",
  "note": "Condições do lote"
}
```

`pieceIds` aceita até 200 peças. Tudo acontece em uma única transação:

1. valida a lista (não vazia, sem repetição) e o vencimento (hoje ou depois, no máximo 365 dias);
2. trava a vendedora (`FOR UPDATE`) e exige `ATIVA`;
3. trava as peças em ordem de ID (evita deadlock) e exige que todas existam e estejam `ETIQUETADA`;
4. confere que nenhuma delas tem item `COM_VENDEDORA` em outro lote (se tiver, os dados estão corrompidos: nada é alterado e o caso é logado);
5. reserva o código `C-YYYY-NNN` em `code_sequences`;
6. cria o lote `ABERTA` e um item por peça com snapshot de código, tipo, preço e **comissão da vendedora no momento da entrega**;
7. move as peças para `CONSIGNACAO`, com localização `Com: {nome da vendedora}`;
8. cria um evento `CONSIGNACAO` por peça e a auditoria `CONSIGNMENT_CREATED`.

Response `201`: `ConsignmentDetails`. Qualquer falha desfaz tudo.

Erros:

- `422 EMPTY_ITEMS`: lista vazia;
- `400 VALIDATION_ERROR`: peça repetida (`fields.pieceIds`) ou vencimento acima de 365 dias (`fields.dueDate`);
- `422 DUE_DATE_IN_PAST`: vencimento antes de hoje;
- `404 SELLER_NOT_FOUND` e `422 SELLER_INACTIVE`;
- `404 PIECE_NOT_FOUND`: alguma peça não existe (`fields.pieceIds` lista as ausentes);
- `409 PIECE_NOT_AVAILABLE`: alguma peça não está `ETIQUETADA` (a mensagem cita os códigos; `fields.pieceIds` lista os IDs);
- `409 PIECE_STATE_INCONSISTENT`: peça em estoque mas ainda ativa em outro lote.

Duas criações simultâneas com a mesma peça: uma recebe `201` e a outra `409 PIECE_NOT_AVAILABLE` (verificado manualmente contra PostgreSQL real durante a BACK_08).

#### `POST /consignments/{consignmentId}/items/{pieceId}/sold` ✅

Body opcional: `{ "soldAt": "2026-10-29T15:00:00Z", "note": "Pix" }`. Sem `soldAt`, usa o horário do servidor. Uma data informada precisa estar entre a entrega do lote e agora; caso contrário, `400 VALIDATION_ERROR` com `fields.soldAt`.

Em transação, trava lote, item e peça e:

1. exige o item `COM_VENDEDORA`;
2. marca o item `VENDIDA` com `soldAt`;
3. move a peça para `VENDIDA`, com localização `Vendida`;
4. cria o evento `VENDIDA` (com `note`, se enviada);
5. quita o lote se não restar item com a vendedora;
6. audita `CONSIGNMENT_ITEM_SOLD`.

Response `200`: `ConsignmentDetails` atualizado.

#### `POST /consignments/{consignmentId}/items/{pieceId}/returned` ✅

Body opcional: `{ "returnedAt": "...", "note": "..." }`, com as mesmas regras de data. Marca o item `DEVOLVIDA`, volta a peça para `ETIQUETADA` em `Estoque`, cria os eventos `DEVOLVIDA` e `ETIQUETADA` (nessa ordem), quita o lote se necessário e audita `CONSIGNMENT_ITEM_RETURNED`. Response `200`: `ConsignmentDetails`.

Erros das duas ações:

- `404 CONSIGNMENT_NOT_FOUND`: lote inexistente;
- `404 CONSIGNMENT_ITEM_NOT_FOUND`: a peça não faz parte do lote;
- `409 ITEM_NOT_WITH_SELLER`: o item já foi vendido ou devolvido (ex.: duas pessoas clicando ao mesmo tempo); a mensagem diz qual. O front deve avisar e recarregar o lote;
- `409 PIECE_STATE_INCONSISTENT`: item com a vendedora, mas peça fora de `CONSIGNACAO`.

### 5. Dashboard ✅ (BACK_09)

#### `GET /dashboard` ✅

Acesso owner (staff recebe `403 FORBIDDEN`). Endpoint agregado:

```json
{
  "kpis": {
    "activeInHand": 5,
    "activeInHandValueCents": 41200,
    "avgTurnoverDays": 18,
    "staleCount": 2,
    "staleValueCents": 23390,
    "overdueSellers": 1
  },
  "stageCounts": {
    "fabrica": 2,
    "banho_ouro": 2,
    "etiquetada": 5,
    "consignacao": 5,
    "vendida": 4,
    "devolvida": 0
  },
  "openConsignments": [],
  "overdueSellers": []
}
```

Regras:

- **Itens em posse (`activeInHand`, `activeInHandValueCents`):** itens `COM_VENDEDORA` em lotes abertos, somando o preço do snapshot.
- **Giro médio (`avgTurnoverDays`):** média, arredondada para o inteiro mais próximo (0,5 sobe), dos dias para vender das vendas dos **últimos 90 dias** (desde 00:00 de hoje − 90 no fuso da loja). `null` quando não houve venda no período.
- **Estoque parado (`staleCount`, `staleValueCents`):** mesmas regras de `GET /reports/stale-pieces?days=60`.
- **`overdueSellers` (KPI):** quantidade de vendedoras em `GET /reports/overdue`; a lista `overdueSellers` traz as mesmas linhas desse relatório.
- **`openConsignments`:** os lotes `ABERTA` no formato de `GET /consignments`, do vencimento mais próximo para o mais distante, até 200 lotes.
- **`stageCounts`:** quantidade de peças por etapa, sempre com as seis chaves (zero quando não há peças). As chaves são minúsculas porque o frontend (`DashboardResponse`) as indexa assim.

Valores vazios: contagens e somas são `0`; só `avgTurnoverDays` pode ser `null`.

### 6. Relatórios ✅ (BACK_09)

Todos exigem `OWNER` (staff recebe `403 FORBIDDEN`) e respondem JSON **sem paginação**: o front recebe todas as linhas de uma vez e monta o CSV localmente, sem cálculo de negócio no navegador.

Datas `YYYY-MM-DD` são locais no fuso da loja e viram o intervalo semiaberto `[from 00:00, to+1d 00:00)`.

**Regra única de dias:** todo "dias" (`daysToSell`, `daysStopped`, `maxOverdueDays` e `dueInDays` em `GET /consignments`) conta **dias de calendário no fuso da loja**, não blocos de 24 horas. Etiquetada às 23h30 do dia 1 e vendida às 0h10 do dia 2 = 1 dia; etiquetada e vendida no mesmo dia = 0. Valores que seriam negativos viram 0, exceto `dueInDays`, que fica negativo quando o lote está atrasado.

#### `GET /reports/turnover?from=YYYY-MM-DD&to=YYYY-MM-DD` ✅

Vendas no intervalo, em ordem de venda. O período tem no máximo 366 dias; `from > to` ou período maior retornam `400 VALIDATION_ERROR` com `fields.period`. Sem `from` ou `to`, ou com data fora do formato, `400 INVALID_REQUEST`.

- Por item: `code`, `type`, `valueCents` (snapshot do lote), `soldAt`, `sellerId`, `sellerName` e `daysToSell`.
- `daysToSell` conta a partir da **etiquetagem mais recente antes da venda**: uma peça devolvida e vendida de novo conta a partir da volta ao estoque, não da primeira etiquetagem.
- Resumo: `summary.soldCount` e `summary.soldValueCents`.

BACK_23: cada linha ganha `totalCostCents` e `marginCents` (preço − custo − comissão), ambos `null` quando a peça não tem custo informado. O resumo ganha `summary.marginCents`, somando só as peças com custo.

#### `GET /reports/overdue` ✅

Uma linha por vendedora com lote `ABERTA` vencido: `sellerId`, `sellerName`, `phone`, `lateLots`, `piecesInHand` e `valueAtRiskCents` (só itens ainda `COM_VENDEDORA` nos lotes vencidos) e `maxOverdueDays` (dias desde o vencimento mais antigo; o lote que vence hoje ainda não está atrasado, então o mínimo é 1). Ordenado do maior atraso para o menor.

#### `GET /reports/stale-pieces?days=60` ✅

Peças `ETIQUETADA` cuja etiquetagem mais recente foi há pelo menos `days` dias (limite inclusivo: com `days=60`, uma peça etiquetada há exatamente 60 dias entra). `days` é opcional (padrão 60) e aceita de 1 a 3650; fora disso, `400 VALIDATION_ERROR` com `fields.days`.

Cada linha: `id`, `code`, `type`, `valueCents` e `daysStopped`, da mais parada para a menos. Resumo: `summary.count` e `summary.valueCents`.

### 7. Configurações ✅

#### `GET /settings` ✅

Acesso owner e staff (staff só lê; o wizard de consignação precisa do prazo padrão e dos termos de pagamento). Retorna:

- `id`;
- `commissionMin`, `commissionMax`, `commissionStep` e `defaultCommissionRate`;
- `paymentTerms`;
- `defaultConsignmentDays` e `timezone`;
- `updatedAt` e `updatedById`.

A faixa de comissão vem nesta resposta. Não existe rota separada `/settings/commission-ranges`.

#### `PATCH /settings` ✅

Acesso owner; exige `Idempotency-Key`. Request (**todos os campos obrigatórios**):

```json
{
  "defaultCommissionRate": 30,
  "paymentTerms": [30, 60, 90],
  "defaultConsignmentDays": 30,
  "timezone": "America/Sao_Paulo"
}
```

Validações (todas retornam `400 VALIDATION_ERROR` com o campo em `fields`):

- `defaultCommissionRate`: entre o mínimo e o máximo, respeitando o passo.
- `paymentTerms`: lista não vazia, sem repetição e só com valores de 30, 60 e 90. É salva ordenada.
- `defaultConsignmentDays`: maior ou igual a 1.
- `timezone`: um ID IANA válido.

A faixa de comissão (25 a 40, passo 5) e as opções de prazo (30/60/90) são fixas nesta versão. Response `200`: `SettingsResponse`. Grava auditoria `SETTINGS_UPDATED`.

### 8. Fotos ✅ (BACK_07)

As fotos ficam no próprio PostgreSQL (tabela `piece_photos`, coluna `bytea`). O front já reduz cada imagem para 320 px, então cada foto tem de 20 a 40 KB.

#### `POST /uploads/piece-photo` ✅

Acesso owner/staff; `multipart/form-data`, campo `file`; exige `Idempotency-Key`.

- Aceitar só JPEG, PNG ou WebP, identificados pela assinatura dos bytes (não pela extensão nem pelo `Content-Type` enviado). Rejeitar SVG e outros formatos.
- Tamanho máximo de 1 MB e dimensões máximas de 2000×2000 px.
- Nunca usar o nome do arquivo enviado; o ID é um UUID aleatório.
- Rate limit por usuário: 30 envios por minuto.
- A idempotência compara o hash SHA-256 do arquivo: repetir a chave com o mesmo arquivo devolve a mesma resposta; com outro arquivo, `409 IDEMPOTENCY_KEY_REUSED`.

Response `201`:

```json
{
  "photoId": "uuid",
  "photoUrl": "/api/v1/photos/uuid",
  "width": 320,
  "height": 240
}
```

Erros:

- `400 VALIDATION_ERROR` com `fields.file`: arquivo vazio, formato não suportado ou dimensões acima de 2000×2000 px;
- `400 INVALID_REQUEST`: campo `file` ausente ou multipart malformado;
- `413 PHOTO_TOO_LARGE`: arquivo acima de 1 MB;
- `415 UNSUPPORTED_MEDIA_TYPE`: corpo que não é `multipart/form-data`;
- `429 RATE_LIMITED`.

#### `GET /photos/{photoId}` ✅

Pública: uma tag `<img>` não envia o token. A segurança vem do ID aleatório, que ninguém consegue adivinhar. Devolve os bytes com:

- o `Content-Type` salvo;
- `Cache-Control: public, max-age=31536000, immutable`, porque uma foto nunca muda (foto nova = ID novo);
- `X-Content-Type-Options: nosniff`.

Foto inexistente: `404 PHOTO_NOT_FOUND`. ID que não é UUID: `400 INVALID_REQUEST`.

### 9. Usuários ✅ (BACK_19)

Todas as rotas exigem `OWNER` (staff `403`), e as mutations exigem `Idempotency-Key`. Não há e-mail: o owner cria a conta com uma senha temporária e a entrega pessoalmente. Na primeira entrada, o sistema obriga a pessoa a trocar essa senha. Não existe exclusão de usuário; contas saem de uso pela desativação.

A senha temporária é **digitada pelo owner** e nunca devolvida pela API, gravada na auditoria ou nos logs. Ela também fica fora do fingerprint da idempotência (um SHA-256 sem sal guardado no banco): repetir a mesma chave com outra senha devolve a primeira resposta, em vez de `409`.

`UserResponse`: `id`, `name`, `email`, `role` (`owner` | `staff`), `active`, `mustChangePassword`, `createdAt`, `updatedAt`. O mesmo formato vale para `user` no login, no refresh e em `/auth/me`.

#### `GET /users` ✅

Lista paginada (`PageEnvelope<UserResponse>`). Query: `q` (parte do nome ou do e-mail, sem diferenciar maiúsculas, até 120 caracteres), `role` (`owner` | `staff`), `active` (`true` | `false`), `page`, `pageSize`, `sort` (`name`, `email`, `role`, `active`, `createdAt`, `updatedAt`). `role` inválido: `400 VALIDATION_ERROR`.

#### `POST /users` ✅

Request: `{ "name", "email", "role": "owner" | "staff", "temporaryPassword" }`. O e-mail é gravado em minúsculas e a senha temporária tem de 12 a 72 caracteres. Cria o usuário ativo e com `mustChangePassword = true`. Response `201`: `UserResponse`. Grava auditoria `USER_CREATED`.

Erros: `409 EMAIL_ALREADY_USED` (sem diferenciar maiúsculas) e `400 VALIDATION_ERROR`.

#### `PATCH /users/{userId}` ✅

Aceita `name`, `email`, `role` e `active` (ao menos um). Response `200`: `UserResponse`. Grava auditoria `USER_UPDATED`.

- Desativar o usuário ou mudar o papel dele incrementa `authVersion` e revoga os refresh tokens: ele é deslogado na hora.
- Mudar nome ou e-mail não desloga. Reativar também não (a pessoa entra de novo pelo login).
- O owner pode editar o próprio nome e e-mail, mas não o próprio papel nem desativar a própria conta.

Erros:

- `422 LAST_OWNER`: a operação deixaria a loja sem nenhum owner ativo. Os owners ativos são travados (`FOR UPDATE`) antes da contagem, então dois owners desativando um ao outro ao mesmo tempo não zeram a loja.
- `422 CANNOT_DEACTIVATE_SELF`: o owner tentou desativar a própria conta.
- `422 CANNOT_CHANGE_OWN_ROLE`: o owner tentou mudar o próprio papel.
- `409 EMAIL_ALREADY_USED`.
- `404 USER_NOT_FOUND`.
- `400 VALIDATION_ERROR` (nenhum campo, nome vazio, e-mail inválido).

#### `POST /users/{userId}/reset-password` ✅

Request: `{ "temporaryPassword" }` (12 a 72 caracteres). Grava a nova senha, liga `mustChangePassword`, incrementa `authVersion` e revoga os refresh tokens. Response `200`: `UserResponse` atualizado (sem a senha). Grava auditoria `USER_PASSWORD_RESET`. Funciona também para usuário inativo, que continua inativo.

Erros: `422 CANNOT_RESET_OWN_PASSWORD` (o owner deve usar `POST /auth/change-password`) e `404 USER_NOT_FOUND`.

## Regras transacionais e de domínio

1. Código de peça `LU-XXXX`: sequence atômica (`code_sequences`, escopo `PIECE`); nunca contar registros.
2. Código de lote `C-YYYY-NNN`: sequence por ano; nunca contar registros.
3. Transições: `FABRICA -> BANHO_OURO -> ETIQUETADA -> CONSIGNACAO -> VENDIDA`.
4. Devolução: `CONSIGNACAO -> DEVOLVIDA -> ETIQUETADA`.
5. Eventos são imutáveis; toda mudança gera evento.
6. Criação de consignação atualiza lote, itens, peças e eventos atomicamente.
7. Venda/devolução atualiza item, peça e eventos atomicamente.
8. Lote fica `QUITADA` quando não restar item `COM_VENDEDORA`, inclusive quando todos foram devolvidos.
9. Comissão histórica usa snapshot do item.
10. Sem exclusão física na UI; usar inativação/arquivamento.
11. Concorrência devolve `409`, com retry seguro via idempotência.
12. Usar `Clock` injetado (testável com `Clock.fixed`) e o timezone de `settings` para vencimentos/relatórios.

## Services e transações esperados

Padrão das mutations já implementadas: o service envolve a operação em `IdempotencyService.execute` dentro da transação e devolve um `IdempotentResponse(status, body)`; o controller só repassa o status e o corpo.

```java
@Service
public class ConsignmentApplicationService {

    @Transactional
    public IdempotentResponse create(UUID actorId, String idempotencyKey,
                                     CreateConsignmentRequest request, String ipAddress) {
        return idempotencyService.execute(actorId, "consignments.create", idempotencyKey, request, () -> {
            // sellerRepository.findByIdForUpdate(...) e exigir ATIVA
            // pieceRepository.findAllForUpdate(...) (order by id) e exigir ETIQUETADA
            // reservar código C-YYYY-NNN em code_sequences
            // salvar lote, snapshots, peças, eventos e auditoria
            return new IdempotentResponse(201, objectMapper.valueToTree(response));
        });
    }

    @Transactional
    public IdempotentResponse markSold(UUID actorId, String idempotencyKey, UUID consignmentId,
                                       UUID pieceId, MarkItemSoldRequest request, String ipAddress) {
        // lock lote + item + peça; aplicar transição; quitar lote se necessário
    }
}
```

Não colocar regras de negócio em controllers, entities ou repositories. Exemplo de repository com lock (já existe em `PieceRepository`):

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select piece from PieceEntity piece where piece.id in :ids order by piece.id")
List<PieceEntity> findAllForUpdate(@Param("ids") Collection<UUID> ids);
```

## Testes

**Decisão de 2026-10-30, confirmada em 2026-10-31:** o backend usa apenas testes unitários com **JUnit 5 + Mockito** e testes de contexto com H2. Não há Testcontainers nem testes integrados automatizados (API → banco, concorrência), e `./gradlew test` roda sem Docker nem PostgreSQL.

### Unitários (services)

Um arquivo de teste por service, no mesmo pacote do código (`src/test/java/br/com/luma/<domínio>/service`), com repositories mockados, `Clock.fixed` e `ObjectMapper` real. Cobrir:

- transições válidas e inválidas de peça;
- cálculo de atraso, giro, estoque parado e comissão (limites de período e timezone);
- validação de comissão, prazos e datas;
- formatação de códigos e ordem dos eventos;
- login, refresh, logout e troca de senha (rotação, reuso, expiração, `authVersion`);
- rate limit e validação do JWT;
- idempotência: replay, payload diferente e chave em andamento;
- rollback por exceção: nenhuma escrita depois de uma validação falhar;
- upload: rejeitar arquivo inválido e chave com path traversal.

### Contexto e HTTP (MockMvc + H2)

`LumaApplicationTests` sobe o contexto com o perfil `test` (H2 em memória, Flyway desligado) para validar:

- rotas públicas e protegidas;
- `ProblemDetail` e `X-Request-Id`;
- erros de validação sem eco dos valores enviados;
- documento OpenAPI.

Esses testes não dependem do schema.

### O que os testes automatizados não cobrem

Constraints, triggers, índices parciais, migrations Flyway e concorrência real (código duplicado, mesma peça em dois lotes) dependem de PostgreSQL. Essas garantias ficam no próprio banco, via migrations. Desde a BACK_10, o CI aplica todas as migrations num PostgreSQL limpo (_service container_ do GitHub Actions, que não é Testcontainers) e falha se alguma for inválida. A concorrência real foi verificada manualmente nas BACK_07 a BACK_09 e não tem teste automatizado.

## `application.yml`

```yaml
server:
  port: ${PORT:8080}

spring:
  application:
    name: mimo-backend
  profiles:
    default: local
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
  flyway:
    enabled: true
  servlet:
    multipart:
      max-file-size: 1MB
      max-request-size: 2MB
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
  security:
    refresh-cookie:
      name: ${REFRESH_COOKIE_NAME:luma_refresh}
      secure: ${REFRESH_COOKIE_SECURE:true}
      same-site: ${REFRESH_COOKIE_SAME_SITE:Strict}
    jwt:
      issuer: ${JWT_ISSUER:luma-api}
      secret: ${JWT_SECRET:} # Base64, >= 32 bytes; obrigatório em prod
      access-token-ttl: ${JWT_ACCESS_TOKEN_TTL:PT15M}
      refresh-token-ttl: ${JWT_REFRESH_TOKEN_TTL:P30D}
    bootstrap-owner:
      enabled: ${BOOTSTRAP_OWNER_ENABLED:false}
      name: ${BOOTSTRAP_OWNER_NAME:}
      email: ${BOOTSTRAP_OWNER_EMAIL:}
      password: ${BOOTSTRAP_OWNER_PASSWORD:}
    login-rate-limit:
      max-attempts: ${LOGIN_MAX_ATTEMPTS:5}
      window: ${LOGIN_RATE_LIMIT_WINDOW:PT15M}
  idempotency:
    ttl: ${IDEMPOTENCY_TTL:P1D}
    retention-after-expiry: ${IDEMPOTENCY_RETENTION:P7D}
    cleanup:
      cron: ${IDEMPOTENCY_CLEANUP_CRON:0 30 3 * * *}
      zone: ${IDEMPOTENCY_CLEANUP_ZONE:America/Sao_Paulo}
  uploads:
    rate-limit:
      max-uploads: ${UPLOAD_MAX_PER_WINDOW:30}
      window: ${UPLOAD_RATE_LIMIT_WINDOW:PT1M}
    orphan-cleanup:
      cron: ${PHOTO_CLEANUP_CRON:0 0 4 * * *}
      zone: ${PHOTO_CLEANUP_ZONE:America/Sao_Paulo}

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  endpoint:
    health:
      show-details: never
  metrics:
    tags:
      application: ${spring.application.name}
    distribution:
      percentiles-histogram:
        http.server.requests: true
  tracing:
    sampling:
      probability: ${TRACING_SAMPLING_PROBABILITY:1.0}

logging:
  pattern:
    correlation: ""
    level: "%5p [requestId:%X{requestId:-} traceId:%X{traceId:-} spanId:%X{spanId:-}]"
```

O datasource fica nos perfis:

- `application-local.yml`: `DB_URL`, `DB_USERNAME` e `DB_PASSWORD`, com padrões para o `compose.yaml`.
- `application-prod.yml`: as mesmas variáveis, mais `CORS_ALLOWED_ORIGINS` e `JWT_SECRET`, todas sem valor padrão, e `logging.structured.format.console: logstash` (logs em JSON).

A lista completa de variáveis de ambiente está no `RUNBOOK.md` do backend.

No local e nos testes, sem `JWT_SECRET`, o backend gera uma chave efêmera. O timezone da loja vem de `settings.timezone`, não do YAML. A configuração de upload (tamanho e dimensões máximas) entra com a BACK_07; o cookie de sessão e `server.forward-headers-strategy: framework` entraram com a BACK_21.

Segredos devem vir de environment/secrets manager, nunca do repositório.

## Integração com o frontend

O frontend substitui `src/lib/db.ts` e as chamadas diretas a `src/lib/domain.ts` por `src/lib/api/*` (cliente HTTP + React Query). Estado em 2026-10-30:

- [x] carregar `GET /auth/me` no bootstrap (FRONT_12);
- [x] tratar `401` renovando token uma vez ou redirecionando para login (FRONT_11/12);
- [x] invalidar queries após cada mutation (hooks em `src/lib/api/hooks.ts`);
- [x] converter valores com um mapper único entre `valueCents` e o formato exibido (`src/lib/api/mappers.ts`);
- [x] enviar `Idempotency-Key` automaticamente em toda mutation fora de `/auth/*` (`src/lib/api/http.ts`);
- [ ] trocar `Piece.photo` base64 pelo upload (`photoId`) e exibir `photoUrl` (FRONT_13);
- [ ] usar `sourcePieceId` na etiquetagem (FRONT_13);
- [ ] exibir conflitos `409` e validações `400`/`422` nas telas (FRONT_13 a 16);
- [ ] implementar paginação nas listagens (FRONT_13 a 15);
- [ ] não confiar em `next-code` para salvar uma peça (FRONT_13);
- [ ] usar `VITE_API_BASE_URL=/api/v1` com proxy na Vercel (`vercel.json`) e no Vite (`server.proxy`), com refresh por cookie (FRONT_22);
- [ ] tela de troca obrigatória de senha e gestão de usuários (FRONT_20);
- [ ] campos de custo e margem, visíveis só para owner (FRONT_24).

## Checklist de implementação

- [x] Criar projeto Spring Boot com Java 21, Gradle e dependências acima (BACK_01).
- [x] Criar PostgreSQL e migrations Flyway (BACK_02).
- [x] Implementar entidades, enums, repositories e índices (BACK_02).
- [x] Implementar login, JWT, refresh revogável, logout e `/auth/me` (BACK_03).
- [x] Implementar `ProblemDetail`, request ID, paginação e idempotência (BACK_04).
- [x] Implementar logs estruturados (JSON em produção) e auditoria completa (BACK_10): login, troca de senha, vendedoras, settings, recebimento e etiquetagem de peças, upload, consignação, venda e devolução.
- [x] Implementar peças, eventos e sequence atômica (BACK_05).
- [x] Resolver etiquetagem atualizando a peça existente do banho (BACK_05).
- [x] Implementar vendedores, configurações e validações server-side (BACK_06).
- [x] Implementar upload de fotos no PostgreSQL com validação (BACK_07).
- [x] Implementar consignações com lock, snapshot e rollback integral (BACK_08).
- [x] Implementar venda/devolução idempotentes (BACK_08).
- [x] Implementar dashboard e relatórios com consultas agregadas (BACK_09).
- [x] Implementar gestão de usuários e troca obrigatória de senha (BACK_19).
- [x] Migrar o refresh token para cookie `HttpOnly` e configurar forward headers (BACK_21).
- [ ] Implementar custos das peças e margem (BACK_23).
- [x] Cobrir as regras atuais com testes unitários (JUnit 5 + Mockito) e MockMvc. Manter a cobertura a cada nova task.
- [ ] Integrar todas as telas do frontend ao contrato (FRONT_13 a 18).
- [x] Configurar métricas (owner), tracing (IDs nos logs), CI com validação de migrations, limpeza de chaves de idempotência, backup manual e runbook (BACK_10).

## Decisões de produto

### Resolvidas

1. **Papel `staff`:** pode usar estoque, etiquetagem e consignações, consultar vendedoras (lista, detalhe e histórico) e ler `GET /settings`. Não acessa dashboard, relatórios, usuários, custos, stats ou comissão, nem altera vendedoras ou configurações.
2. **Timezone oficial:** `America/Sao_Paulo` por padrão, configurável em `settings.timezone`.
3. **Etiquetagem:** atualiza a peça que voltou do banho e mantém o código.
4. **Faixas de comissão e prazos:** fixas nesta versão (25 a 40% em passos de 5; 30/60/90 dias).
5. **Comissão histórica:** usa o `commission_rate_snapshot` do item, capturado **na entrega** do lote. Mudar a taxa só afeta lotes novos.
6. **Testes do backend:** apenas JUnit 5 + Mockito, sem Testcontainers.
7. **Configurações para o staff:** `GET /settings` passa a aceitar `staff` (só leitura); `PATCH` continua exclusivo de owner. Feito como pré-requisito da BACK_08.
8. **Fotos:** guardadas no PostgreSQL (`bytea`), servidas por `GET /photos/{photoId}` público com ID aleatório. Sem S3; o projeto é acadêmico e roda no Railway (BACK_07).
9. **Usuários:** menos de 15 pessoas, com um ou mais owners. O owner cadastra os usuários e define uma senha temporária, que o sistema obriga a trocar no primeiro login. Sem convite nem recuperação por e-mail (BACK_19 + FRONT_20).
10. **Sessão:** refresh token em cookie `HttpOnly` antes do primeiro deploy, com proxy da Vercel para manter front e API na mesma origem (BACK_21 + FRONT_22; explicação em `SESSAO_E_COOKIES.md`).
11. **Valor e custo:** `valueCents` é o preço de venda. O custo é registrado separado em fábrica (`factoryCostCents`) e banho (`bathCostCents`), opcional e visível só para owner (BACK_23 + FRONT_24).
12. **Romaneio:** impressão pelo navegador (`window.print()`, com "Salvar como PDF"). Sem PDF no servidor.
13. **Testes integrados:** não haverá testes integrados automatizados nem Testcontainers. Migrations são validadas no CI com um PostgreSQL _service container_ (BACK_10).
14. **Observabilidade:** tracing só com `traceId`/`spanId` nos logs e na resposta, sem serviço externo; métricas em `/actuator/metrics` e `/actuator/prometheus` só para owner; logs em JSON só no perfil `prod` (BACK_10; explicações em `TRACING.md` e `METRICAS.md` no backend).
15. **Backup:** manual com `pg_dump`/`pg_restore`, documentado no runbook com teste de restauração. Chaves de idempotência vencidas há mais de 7 dias são apagadas por um job diário (BACK_10).

### Pendentes

Nenhuma no momento.

## Mapeamento frontend -> API

| Tela/fluxo        | Endpoints                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Login             | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`                                    |
| Dashboard         | `GET /dashboard`                                                                                                 |
| Estoque           | `GET /pieces`, `GET /pieces/{id}`, `GET /pieces/{id}/events`, `POST /pieces/receive`                             |
| Etiquetagem       | `GET /pieces?status=BANHO_OURO`, `POST /uploads/piece-photo`, `POST /pieces/label`, `GET /photos/{id}`           |
| Consignação       | `GET /sellers`, `GET /settings`, `GET /pieces?status=ETIQUETADA`, `POST /consignments`                           |
| Detalhe vendedora | `GET /sellers/{id}`, `GET /sellers/{id}/consignments`, `GET /sellers/{id}/stats`, `GET /sellers/{id}/commission` |
| Venda/devolução   | `POST /consignments/{id}/items/{pieceId}/sold`, `POST /consignments/{id}/items/{pieceId}/returned`               |
| Relatórios        | `GET /reports/turnover`, `GET /reports/overdue`, `GET /reports/stale-pieces`                                     |
| Configurações     | `GET /sellers`, `POST /sellers`, `PATCH /sellers/{id}`, `GET/PATCH /settings`, `/users`                          |
| Troca de senha    | `POST /auth/change-password` (obrigatória quando `mustChangePassword`)                                           |
| Analytics técnico | endpoint de `VITE_ENTER_ANALYTICS_DEFINITIONS_ENDPOINT`, fora do domínio de negócio                              |
