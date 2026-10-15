# BACK_03 - Autenticação e autorização

**Prioridade:** 3 - bloqueia acesso seguro ao sistema real.

## Contexto Motivador

O login atual compara senha em texto puro contra usuários de seed em `src/lib/domain.ts` e grava uma sessão local. Os guards e papéis `owner`/`staff` só protegem rotas no navegador, portanto podem ser contornados.

## Objetivo

Implementar login, refresh, logout, identidade atual e controle de acesso server-side com Spring Security.

## Proposta de solução

- Criar endpoints `POST /api/v1/auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` e `POST /auth/change-password`.
- Usar `PasswordEncoder` BCrypt ou Argon2id e nunca expor hash/senha em DTO.
- Emitir access JWT de curta duração e refresh token opaco; persistir hash do refresh token, rotacionar em refresh, revogar no logout e invalidar sessões ao trocar senha.
- Configurar `SecurityFilterChain`, Resource Server JWT, `@EnableMethodSecurity` e regras de `owner`/`staff` também nos services.
- Definir como provisionar o primeiro owner por comando administrativo/bootstrap controlado, com segredo temporário e sem senha padrão no seed público.
- Aplicar rate limit e resposta indistinguível para usuário inexistente/senha errada; registrar auditoria de login sem gravar credenciais.

## Pontos de atenção

- O frontend atual permite staff navegar por estoque/consignações, mas não deixa claro se pode ver todas as vendedoras. Registrar decisão de produto e aplicar política consistente.
- Definir armazenamento de refresh token no browser; cookie HttpOnly exige CSRF/CORS adequado, enquanto Bearer em storage aumenta impacto de XSS.
- Diferenciar `401` de `403`; revogar refresh token em suspeita de reutilização.
- Login não deve aceitar usuários inativos nem revelar se email existe.

**Decisões desta implementação:** staff pode usar rotas operacionais autenticadas, mas dashboard, relatórios e configurações exigem `OWNER`; o refresh token permanece somente em memória no browser para não ser persistido em storage acessível a JavaScript. A API atual retorna ambos os tokens no corpo conforme o contrato; migrar para cookie HttpOnly exige contrato CSRF/CORS próprio.

## Critérios de aceite

- [x] Login correto emite tokens e credencial inválida retorna `401` genérico.
- [x] Refresh rotaciona e revoga o anterior; logout invalida o refresh token.
- [x] `/auth/me` devolve apenas campos públicos do usuário.
- [x] Todas as rotas privadas rejeitam anônimo e respeitam papéis em servidor.
- [x] Hash de senha forte é salvo e nenhuma senha/token aparece em logs.
- [x] Testes cobrem roles, token vencido, revogação, refresh reutilizado e usuário inativo.

## Observações de dependência

Depende de BACK_01 e das tabelas `users`/`refresh_tokens` de BACK_02. FRONT_12 integra este contrato, podendo desenvolver com mocks antes do backend estar pronto.
