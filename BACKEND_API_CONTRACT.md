# Contrato de backend: Spring Boot + Java

## Objetivo

Este documento transforma o protótipo frontend Mimo/Luma em um contrato de implementação para um backend em **Spring Boot 3.x, Java 21, PostgreSQL e REST**. O frontend atual mantém todo o estado em `localStorage` (`luma_db_v1`) e concentra as regras em `src/lib/domain.ts`; o backend deve substituir essa camada por persistência, autenticação, autorização e transações reais.

## Stack recomendada

- Java 21 LTS.
- Spring Boot 3.x.
- Gradle com Groovy DSL, usando o arquivo `build.gradle` (não `build.gradle.kts`).
- Spring Web MVC.
- Spring Data JPA/Hibernate.
- Lombok para reduzir boilerplate em entidades e classes Java, evitando `@Data` em entidades JPA.
- MapStruct para mapeamento explícito entre entidades e DTOs, com geração em tempo de compilação.
- Springdoc/OpenAPI para gerar e servir a especificação e a interface Swagger UI.
- PostgreSQL 16+.
- Flyway para migrations versionadas.
- Spring Security OAuth2 Resource Server + JWT para access token.
- Refresh tokens persistidos e revogáveis no banco.
- Bean Validation (`jakarta.validation`).
- Spring Boot Actuator, Micrometer e OpenTelemetry.
- Testcontainers para testes de integração com PostgreSQL.
- Object storage compatível com S3 para fotos.
- Valores monetários persistidos em `long` centavos. A API usa `valueCents`.

### `build.gradle` mínimo (Groovy DSL)

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

dependencies {
  implementation 'org.springframework.boot:spring-boot-starter-web'
  implementation 'org.springframework.boot:spring-boot-starter-validation'
  implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
  implementation 'org.springframework.boot:spring-boot-starter-security'
  implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
  implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.9'
  implementation 'org.mapstruct:mapstruct:1.6.3'
  implementation 'org.flywaydb:flyway-core'

  compileOnly 'org.projectlombok:lombok:1.18.38'
  annotationProcessor 'org.projectlombok:lombok:1.18.38'
  annotationProcessor 'org.mapstruct:mapstruct-processor:1.6.3'
  annotationProcessor 'org.projectlombok:lombok-mapstruct-binding:0.2.0'

  runtimeOnly 'org.postgresql:postgresql'

  testImplementation 'org.springframework.boot:spring-boot-starter-test'
  testImplementation 'org.springframework.security:spring-security-test'
  testImplementation 'org.testcontainers:junit-jupiter'
  testImplementation 'org.testcontainers:postgresql'

  testCompileOnly 'org.projectlombok:lombok:1.18.38'
  testAnnotationProcessor 'org.projectlombok:lombok:1.18.38'
}

tasks.withType(Test).configureEach {
    useJUnitPlatform()
}
```

As três bibliotecas acima fazem parte da stack obrigatória. Configure os mappers MapStruct com `componentModel = "spring"` para injeção pelo Spring. O Lombok não deve gerar `equals`, `hashCode` ou `toString` que percorram relações lazy de entidades JPA; prefira anotações pontuais como `@Getter`, `@Setter` e `@NoArgsConstructor`. Springdoc deve publicar o JSON OpenAPI em `/v3/api-docs` e Swagger UI em `/swagger-ui/index.html`; em produção, proteger ou desabilitar a interface conforme a política de acesso.

## Convenções da API

- Base URL: `/api/v1`.
- JSON UTF-8; upload de foto usa `multipart/form-data`.
- Datas no JSON: ISO-8601 com offset, preferencialmente UTC, por exemplo `2026-09-18T15:00:00Z`.
- Banco: `Instant` para eventos/timestamps; `LocalDate` para filtros de dia; `ZoneId` configurado por loja.
- Valores monetários: inteiros em centavos. `6490` representa R$ 64,90.
- IDs: UUID (`UUID` em Java), nunca IDs sequenciais expostos.
- Respostas de lista: `items` e `pagination`.
- Paginação: `page` começa em 1; `pageSize` padrão 50 e máximo 200.
- Ordenação: somente campos permitidos por endpoint.
- Toda mutation aceita `Idempotency-Key`.
- O servidor é a fonte de verdade para códigos, timestamps, status e cálculos.
- Adicionar logs para monitoramento e observabilidade.

### Resposta de erro

Implementar um `@RestControllerAdvice` que converta exceções para `ProblemDetail` (RFC 7807):

```json
{
  "type": "https://api.luma.com.br/problems/piece-not-available",
  "title": "Peça indisponível",
  "status": 409,
  "detail": "Uma ou mais peças já foram movimentadas.",
  "code": "PIECE_NOT_AVAILABLE",
  "fields": {
    "pieceIds": ["p_101"]
  },
  "requestId": "req_01J..."
}
```

Mapeamento: `400` JSON inválido, `401` não autenticado, `403` sem permissão, `404` inexistente, `409` conflito/concorrência, `422` regra de negócio, `429` rate limit e `500` erro inesperado. Nunca retornar stack trace ou senha.

## Organização do projeto Java

```text
src/main/java/br/com/luma/
  LumaApplication.java
  config/                 # Security, Jackson, OpenAPI, Clock, CORS
  shared/                 # ProblemDetail, paginação, auditoria, exceções
  auth/                   # controller, service, JWT, user, refresh token
  piece/                  # entity, repository, service, controller, dto
  seller/
  consignment/
  dashboard/
  report/
  setting/
  upload/
src/main/resources/
  application.yml
  db/migration/V1__create_schema.sql
  db/migration/V2__seed_reference_data.sql
```

Fluxo recomendado: `Controller -> ApplicationService -> Repository`. Controllers recebem DTOs, services aplicam regras/transações e entities não são serializadas diretamente.

## Segurança Spring Security

### Regras

- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` e documentação são públicos.
- Todas as outras rotas exigem JWT válido.
- `owner`: dashboard, relatórios e configurações, além dos fluxos operacionais.
- `staff`: estoque, etiquetagem e consignações; não acessa dashboard/relatórios/configurações conforme a UI atual.
- Repetir autorização no método/service, mesmo com `@PreAuthorize` no controller.
- Senha com BCrypt ou Argon2id; nunca texto puro.
- Access token curto, por exemplo 15 minutos; refresh token opaco, hash persistido, rotação e revogação.
- Rate limit no login e upload.
- CORS somente para a origem do frontend.
- Preferir cookie seguro HttpOnly para refresh token; alinhar a estratégia com o frontend.

Exemplo:

```java
@Bean
SecurityFilterChain security(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable()) // usar CSRF se autenticação usar cookie
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
            .requestMatchers("/api/v1/reports/**", "/api/v1/settings/**").hasRole("OWNER")
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
        .build();
}
```

Usar `@EnableMethodSecurity` e `@PreAuthorize("hasRole('OWNER')")` nos services de owner.

## Modelos JPA e banco

### `users`

`id UUID PK`, `name`, `email UNIQUE`, `password_hash`, `role`, `active`, `created_at`, `updated_at`.

```java
public enum Role { OWNER, STAFF }
```

### `refresh_tokens`

`id UUID PK`, `user_id FK`, `token_hash UNIQUE`, `expires_at`, `revoked_at`, `created_at`, `replaced_by_id`.

### `sellers`

`id UUID PK`, `name`, `phone`, `commission_rate`, `status`, `created_at`, `updated_at`.

`commission_rate` é inteiro percentual. Não apagar vendedores com histórico; usar `INATIVA`.

### `pieces`

`id UUID PK`, `code UNIQUE`, `type`, `value_cents BIGINT`, `status`, `current_location`, `photo_url`, `note`, `created_at`, `updated_at`, `version BIGINT`.

```java
public enum PieceStage {
    FABRICA, BANHO_OURO, ETIQUETADA, CONSIGNACAO, VENDIDA, DEVOLVIDA
}
```

`version` deve ser `@Version` para controle otimista, além de locks pessimistas nas operações que selecionam várias peças.

### `piece_events`

`id UUID PK`, `piece_id FK`, `stage`, `occurred_at`, `note`, `actor_user_id FK`. Eventos são imutáveis e ordenados por `occurred_at`.

### `consignments`

`id UUID PK`, `code UNIQUE`, `seller_id FK`, `delivered_at`, `due_at`, `status`, `note`, `created_by FK`, `version`.

### `consignment_items`

`id UUID PK`, `consignment_id FK`, `piece_id FK`, `code_snapshot`, `type_snapshot`, `value_cents_snapshot`, `commission_rate_snapshot`, `status`, `sold_at`, `returned_at`, `version`.

`piece_id` deve impedir a mesma peça em dois lotes ativos. O snapshot da comissão preserva o cálculo histórico quando a taxa mudar.

### `settings`

Uma linha por conta/loja: `id`, `commission_min`, `commission_max`, `commission_step`, `default_commission_rate`, `payment_terms_json` ou tabela filha, `default_consignment_days`, `timezone`, `updated_at`, `updated_by`.

### Tabelas auxiliares

- `code_sequences(scope, year, next_value)` com chave única para geração atômica.
- `audit_logs` com ator, ação, entidade, `entity_id`, before JSON, after JSON, IP e timestamp.
- `idempotency_keys` com usuário, chave, fingerprint, status, resposta e expiração.
- `file_uploads` se o storage precisar de metadados e lifecycle.

### Índices e constraints

```sql
CREATE UNIQUE INDEX uk_pieces_code ON pieces(code);
CREATE INDEX ix_pieces_status_updated ON pieces(status, updated_at);
CREATE INDEX ix_piece_events_piece_time ON piece_events(piece_id, occurred_at);
CREATE UNIQUE INDEX uk_consignments_code ON consignments(code);
CREATE INDEX ix_consignments_seller_delivered ON consignments(seller_id, delivered_at);
CREATE INDEX ix_consignments_status_due ON consignments(status, due_at);
CREATE INDEX ix_items_piece_status ON consignment_items(piece_id, status);
CREATE INDEX ix_items_status_sold_at ON consignment_items(status, sold_at);
```

Todas as alterações de schema devem ser migrations Flyway. Não usar `ddl-auto=create` em produção.

## DTOs Java

Exemplo para recebimento:

```java
public record ReceivePieceRequest(
    @NotBlank @Size(max = 80) String type,
    @NotNull @Positive Long valueCents,
    @NotNull PieceStage stage,
    @Size(max = 500) String note
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
    String photoUrl,
    String note,
    Instant createdAt,
    Instant updatedAt
) {}
```

Usar DTOs separados para request e response. Não expor entidades JPA, `passwordHash`, tokens, campos internos ou relações lazy diretamente no JSON.

## Catálogo de endpoints

Todas as rotas abaixo têm o prefixo `/api/v1`.

### 1. Autenticação

#### `POST /auth/login` (público)

Request:

```json
{ "email": "socios@luma.com.br", "password": "..." }
```

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Sócia(o) 1",
    "email": "socios@luma.com.br",
    "role": "owner"
  },
  "session": {
    "loggedAt": "2026-09-18T15:00:00Z",
    "expiresAt": "2026-09-18T15:15:00Z"
  },
  "accessToken": "jwt",
  "refreshToken": "opaque-token"
}
```

Erros: `401 INVALID_CREDENTIALS`, `403 USER_INACTIVE`.

#### `POST /auth/refresh`

Recebe refresh token, revoga o anterior e retorna novo par de tokens.

#### `POST /auth/logout`

Revoga o refresh token atual. Resposta `204`.

#### `GET /auth/me`

Retorna usuário e sessão atual. O frontend deve usar esta rota no bootstrap em substituição a `db.session`.

#### `POST /auth/change-password`

Request: `currentPassword`, `newPassword`; invalidar sessões anteriores.

### 2. Peças e estoque

#### `GET /pieces`

Acesso owner/staff. Query: `q`, `status`, `page`, `pageSize`, `sort`. `q` pesquisa código/tipo. `sort` aceita apenas `code`, `type`, `valueCents`, `status`, `currentLocation`, `createdAt` e `updatedAt`, com direção `asc` ou `desc`. Retorna `items`, `pagination` e opcionalmente `totalValueCents`.

#### `GET /pieces/{pieceId}`

Retorna detalhes da peça; pode incluir eventos ou usar rota separada.

#### `GET /pieces/{pieceId}/events`

Retorna eventos crescentes por `occurredAt` (desempate por `id`), com `actorUserId` e nota.

#### `GET /pieces/next-code`

Somente pré-visualização. Retorna `{ "code": "LU-0813" }`; o código definitivo sempre é gerado no service transacional.

#### `POST /pieces/receive`

Cria peça recebida da fábrica ou encaminhada ao banho.

```json
{
  "type": "Brinco",
  "valueCents": 8490,
  "stage": "FABRICA",
  "note": "Lote do fornecedor"
}
```

Aceitar somente `FABRICA` ou `BANHO_OURO` e os tipos `Brinco`, `Colar`, `Pulseira`, `Anel`, `Pingente` ou `Tornozeleira`. Gerar código, peça e evento inicial. Para `BANHO_OURO`, registrar também o evento de fábrica conforme a regra do frontend.

Response `201`: `{ "piece": { ... }, "events": [ ... ] }`.

#### `POST /pieces/label`

Request:

```json
{
  "sourcePieceId": "uuid",
  "type": "Brinco",
  "valueCents": 8490,
  "photoUrl": "https://storage.example/pieces/uuid.jpg",
  "note": "Dourado",
  "backFromBath": true
}
```

**Decisão recomendada:** `sourcePieceId` aponta para uma peça existente em `BANHO_OURO`; o service atualiza essa peça, mantém o código e adiciona o evento `ETIQUETADA`. O frontend atual cria uma nova peça, mas isso duplica estoque e deve ser corrigido na integração.

Validar source, estado atual e `backFromBath`. Esta operação representa a conclusão da etiquetagem: `sourcePieceId` deve apontar para uma peça em `BANHO_OURO` e `backFromBath` deve ser `true`; `false` retorna conflito, pois encaminhamento ao banho não conclui uma etiquetagem. A peça existente é atualizada, mantém seu código e recebe o evento `ETIQUETADA`. Se o produto quiser criar nova peça, criar relação de origem e encerrar a anterior explicitamente; nunca deixar duas peças independentes para o mesmo item físico.

### 3. Vendedoras

#### `GET /sellers`

Acesso owner/staff. Query: `status`, `q`, paginação. A resposta deve trazer dados e agregados da tela de consignação:

```json
{
  "items": [
    {
      "seller": {
        "id": "uuid",
        "name": "Ana Ribeiro",
        "phone": "(11) 98888-0001",
        "commissionRate": 30,
        "status": "ativa"
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

#### `POST /sellers`

Acesso owner. Request: `name`, `phone`, `commissionRate`; cria `ATIVA`. Validar nome e faixa configurada.

#### `GET /sellers/{sellerId}`

Retorna vendedor, taxa e status.

#### `PATCH /sellers/{sellerId}`

Acesso owner. Aceita `name`, `phone`, `commissionRate`, `status`. A UI usa a mesma operação para editar e ativar/inativar.

#### `GET /sellers/{sellerId}/stats`

Retorna `inHand`, `inHandValueCents`, `totalSoldCount`, `totalSoldValueCents` e `totalCommissionCents`.

#### `GET /sellers/{sellerId}/commission?from=...&to=...`

Retorna `soldCount`, `soldValueCents` e `commissionCents`. Usar `commissionRateSnapshot` dos itens.

### 4. Consignações

#### `GET /consignments`

Query: `status`, `sellerId`, `overdue`, paginação. Retornar seller, itens em posse, valor em posse, vencimento e status visual (`em_dia`, `atrasada`, `quitada`).

#### `GET /consignments/{consignmentId}`

Retorna lote, vendedora e itens completos.

#### `GET /sellers/{sellerId}/consignments`

Histórico do mais recente para o mais antigo; aceitar `status` e paginação.

#### `POST /consignments`

Request:

```json
{
  "sellerId": "uuid",
  "pieceIds": ["uuid", "uuid"],
  "dueAt": "2026-10-18T12:00:00Z",
  "note": "Condições do lote"
}
```

Implementar em um único `@Transactional` service:

1. validar vendedora existente e `ATIVA`;
2. validar lista não vazia, data futura e peças existentes;
3. buscar peças com `@Lock(PESSIMISTIC_WRITE)` ou `FOR UPDATE`;
4. confirmar que todas ainda estão `ETIQUETADA`;
5. reservar código `C-YYYY-NNN` em `code_sequences` com lock;
6. criar lote e snapshots dos itens;
7. mover peças para `CONSIGNACAO`, atualizar localização e timestamp;
8. criar evento `CONSIGNACAO` por peça;
9. salvar auditoria.

Se uma peça falhar, rollback integral. Retornar `SELLER_INACTIVE`, `PIECE_NOT_AVAILABLE`, `DUE_DATE_IN_PAST` ou `EMPTY_ITEMS`.

#### `POST /consignments/{consignmentId}/items/{pieceId}/sold`

Request opcional: `{ "soldAt": "2026-09-18T15:00:00Z", "note": "..." }`. Se ausente, usar `Clock` do servidor.

Em transação e com lock: validar item `COM_VENDEDORA`, definir `VENDIDA`/`soldAt`, atualizar peça para `VENDIDA` e `Vendida`, criar evento e quitar lote se não restar item com vendedora. Segunda chamada deve ser idempotente ou retornar `409`, conforme convenção escolhida.

#### `POST /consignments/{consignmentId}/items/{pieceId}/returned`

Request opcional: `{ "returnedAt": "2026-09-18T15:00:00Z", "note": "..." }`.

Validar `COM_VENDEDORA`, marcar item `DEVOLVIDA`, peça `ETIQUETADA`/`Estoque`, criar eventos `DEVOLVIDA` e `ETIQUETADA`, quitar lote se necessário e auditar.

### 5. Dashboard

#### `GET /dashboard`

Acesso owner. Endpoint agregado recomendado:

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

Regras: itens `COM_VENDEDORA` em lotes abertos formam `activeInHand`; giro é média arredondada entre último evento de etiquetagem e venda; estoque parado é peça `ETIQUETADA` há pelo menos 60 dias; atraso é lote aberto com `dueAt` anterior ao instante atual.

### 6. Relatórios

Todos exigem `OWNER`. A exportação CSV atual é local no navegador; estes endpoints retornam JSON.

#### `GET /reports/turnover?from=YYYY-MM-DD&to=YYYY-MM-DD`

Retorna itens vendidos no intervalo inclusivo: `code`, `type`, `valueCents`, `soldAt`, `sellerId`, `sellerName`, `daysToSell`, além de `summary.soldCount` e `summary.soldValueCents`.

#### `GET /reports/overdue`

Retorna por vendedora: `sellerId`, `sellerName`, `phone`, `lateLots`, `piecesInHand`, `valueAtRiskCents`, `maxOverdueDays`. Considerar lotes abertos vencidos e itens ainda com a vendedora.

#### `GET /reports/stale-pieces?days=60`

Retorna peças etiquetadas paradas há pelo menos `days`, com `id`, `code`, `type`, `valueCents`, `daysStopped`, e resumo de quantidade/valor.

### 7. Configurações

#### `GET /settings`

Acesso owner. Retorna faixa de comissão, taxa padrão, termos de pagamento, prazo padrão e timezone.

#### `PATCH /settings`

Request:

```json
{
  "defaultCommissionRate": 30,
  "paymentTerms": [30, 60, 90],
  "defaultConsignmentDays": 30,
  "timezone": "America/Sao_Paulo"
}
```

Validar taxa entre mínimo/máximo e no step; ao menos um termo permitido; prazo maior ou igual a 1; timezone válido.

#### `GET /settings/commission-ranges`

Opcional; pode ser incorporado ao `GET /settings`.

### 8. Fotos

#### `POST /uploads/piece-photo`

`multipart/form-data`, campo `file`. Validar MIME real, extensão, tamanho, dimensões e conteúdo; remover EXIF se necessário; armazenar no S3 e retornar URL ou chave.

```json
{
  "photoUrl": "https://storage.example/pieces/uuid.jpg",
  "width": 320,
  "height": 240
}
```

Se o bucket for privado, retornar URL pré-assinada na leitura. Impressão permanece local via `window.print()`; PDF só se virar requisito (`GET /consignments/{id}/pdf`).

## Regras transacionais e de domínio

1. Código de peça `LU-XXXX`: sequence atômica; nunca contar registros.
2. Código de lote `C-YYYY-NNN`: sequence por ano com lock; nunca contar registros.
3. Transições: `FABRICA -> BANHO_OURO -> ETIQUETADA -> CONSIGNACAO -> VENDIDA`.
4. Devolução: `CONSIGNACAO -> DEVOLVIDA -> ETIQUETADA`.
5. Eventos são imutáveis; toda mudança gera evento.
6. Criação de consignação atualiza lote, itens, peças e eventos atomicamente.
7. Venda/devolução atualiza item, peça e eventos atomicamente.
8. Lote fica `QUITADA` quando não restar item `COM_VENDEDORA`.
9. Comissão histórica usa snapshot do item.
10. Sem exclusão física na UI; usar inativação/arquivamento.
11. Concorrência devolve `409`, com retry seguro via idempotência.
12. Usar `Clock` injetado para testes e timezone oficial para vencimentos/relatórios.

## Services e transações esperados

```java
@Service
public class ConsignmentApplicationService {

    @Transactional
    public ConsignmentResponse create(CreateConsignmentRequest request,
                                      CurrentUser actor,
                                      String idempotencyKey) {
        // sellerRepository.findActive(...)
        // pieceRepository.findAllForUpdate(...)
        // validar todos como ETIQUETADA
        // sequenceService.nextConsignmentCode(clock, lock)
        // salvar lote, snapshots, peças, eventos e auditoria
    }

    @Transactional
    public ConsignmentItemActionResponse markSold(UUID consignmentId,
                                                  UUID pieceId,
                                                  MarkSoldRequest request,
                                                  CurrentUser actor) {
        // lock item + peça; aplicar transição idempotente
    }
}
```

Não colocar regras de negócio em controllers, entities ou repositories. Exemplo de repository com lock:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select p from PieceEntity p where p.id in :ids")
List<PieceEntity> findAllForUpdate(@Param("ids") Collection<UUID> ids);
```

## Testes obrigatórios

### Unitários

- transições válidas e inválidas de peça;
- cálculo de atraso, giro, estoque parado e comissão;
- validação de comissão, prazos e datas;
- geração de códigos e timezone usando `Clock.fixed`.

### Integração com Testcontainers

- migrations Flyway em PostgreSQL real;
- login, refresh, logout e senha nunca exposta;
- autorização owner/staff em todas as rotas;
- consignação concorrente falha inteira sem efeitos parciais;
- duas requisições simultâneas não geram código duplicado;
- venda/devolução repetidas são idempotentes;
- alteração da comissão não altera vendas históricas;
- relatórios respeitam limites de data e timezone;
- upload rejeita arquivo inválido e não permite path traversal.

### Controller tests

Usar `MockMvc` para status, payload, `ProblemDetail`, paginação e headers de autenticação. Gerar OpenAPI e validar o frontend contra o contrato.

## `application.yml` inicial

```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/luma}
    username: ${DATABASE_USERNAME:luma}
    password: ${DATABASE_PASSWORD:change-me}
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
  jackson:
    time-zone: UTC

luma:
  timezone: ${LUMA_TIMEZONE:America/Sao_Paulo}
  jwt:
    issuer: ${JWT_ISSUER:luma-api}
    access-token-minutes: 15
  upload:
    max-image-bytes: 5242880
    bucket: ${S3_BUCKET:luma-pieces}
```

Segredos devem vir de environment/secrets manager, nunca do repositório.

## Integração com o frontend atual

Substituir `src/lib/db.ts` e chamadas diretas de `src/lib/domain.ts` por cliente HTTP, preferencialmente React Query, e:

- carregar `GET /auth/me` no bootstrap;
- tratar `401` renovando token ou redirecionando para login;
- invalidar queries após cada mutation;
- trocar `Piece.photo` base64 por `photoUrl`;
- converter valores com um mapper único entre `valueCents` e o formato exibido;
- usar `sourcePieceId` na etiquetagem;
- enviar `Idempotency-Key` em recebimento, etiquetagem e consignação;
- exibir conflitos `409` e validações `422`;
- implementar paginação quando a base crescer;
- não confiar em `next-code` para salvar uma peça.

## Checklist de implementação

- [ ] Criar projeto Spring Boot com Java 21, Gradle e dependências acima.
- [ ] Criar PostgreSQL e migrations Flyway.
- [ ] Implementar entidades, enums, repositories e índices.
- [ ] Implementar login, JWT, refresh revogável, logout e `/auth/me`.
- [ ] Implementar `ProblemDetail`, request ID, logs estruturados e auditoria.
- [ ] Implementar peças, eventos e sequence atômica.
- [ ] Resolver etiquetagem atualizando a peça existente do banho.
- [ ] Implementar vendedores, configurações e validações server-side.
- [ ] Implementar consignações com lock, snapshot e rollback integral.
- [ ] Implementar venda/devolução idempotentes.
- [ ] Implementar dashboard e relatórios com consultas agregadas.
- [ ] Implementar upload S3 com validação.
- [ ] Cobrir regras com unitários, MockMvc e Testcontainers.
- [ ] Gerar OpenAPI e integrar o frontend ao contrato.
- [ ] Configurar Actuator, métricas, backup e observabilidade.

## Decisões de produto pendentes

1. `staff` pode visualizar e movimentar lotes de qualquer vendedora?
2. Qual timezone oficial? Sugestão: `America/Sao_Paulo`.
3. Foto pública ou URL temporária protegida?
4. Haverá convite, gerenciamento de usuários e recuperação de senha?
5. O valor é preço de venda, custo, ou ambos? Se houver custo, adicionar `costCents`.
6. A impressão local é suficiente ou será necessário PDF server-side?
7. A comissão é a taxa no momento da entrega ou da venda? Recomenda-se snapshot na entrega.

## Mapeamento frontend -> API

| Tela/fluxo        | Endpoints                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Login             | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`                                            |
| Dashboard         | `GET /dashboard`                                                                                   |
| Estoque           | `GET /pieces`, `GET /pieces/{id}`, `GET /pieces/{id}/events`, `POST /pieces/receive`               |
| Etiquetagem       | `POST /uploads/piece-photo`, `POST /pieces/label`                                                  |
| Consignação       | `GET /sellers`, `POST /consignments`, `GET /sellers/{id}/consignments`                             |
| Venda/devolução   | `POST /consignments/{id}/items/{pieceId}/sold`, `POST /consignments/{id}/items/{pieceId}/returned` |
| Relatórios        | `GET /reports/turnover`, `GET /reports/overdue`, `GET /reports/stale-pieces`                       |
| Configurações     | `GET /sellers`, `POST /sellers`, `PATCH /sellers/{id}`, `GET/PATCH /settings`                      |
| Analytics técnico | endpoint de `VITE_ENTER_ANALYTICS_DEFINITIONS_ENDPOINT`, fora do domínio de negócio                |
