# BACK_21 - Refresh token em cookie HttpOnly e preparação para o deploy

**Prioridade:** 21 - obrigatória antes do primeiro deploy.

## Contexto Motivador

Hoje o refresh token, que vale 30 dias, é devolvido no corpo da resposta e fica no `sessionStorage` do navegador. Qualquer script que rode na página consegue lê-lo. Se a página sofrer um ataque XSS, o token é roubado.

**Decisão de 2026-10-30:** o refresh token passa a viajar só num cookie `HttpOnly`, que o JavaScript não consegue ler. O frontend fica na Vercel e o backend no Railway, em domínios diferentes; para o cookie funcionar em todos os navegadores, a Vercel fará proxy de `/api/*` para o Railway (FRONT_22). A explicação em linguagem simples está em `SESSAO_E_COOKIES.md`.

## Objetivo

Proteger o refresh token contra roubo por JavaScript e deixar o backend pronto para rodar atrás dos proxies da Vercel e do Railway.

## Proposta de solução

- `POST /auth/login` e `POST /auth/refresh`:
  - respondem com `Set-Cookie: luma_refresh=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=<validade>`;
  - deixam de mandar `refreshToken` no corpo, mantendo `user`, `session` e `accessToken`.
- `POST /auth/refresh` passa a ler o token do cookie, sem corpo.
- `POST /auth/logout` passa a ser público:
  - lê o cookie, revoga o token e apaga o cookie com `Max-Age=0`;
  - funciona mesmo com o access token vencido.
- Proteção contra CSRF em `/auth/refresh` e `/auth/logout`: além do `SameSite=Strict`, rejeitar com `403` quando o header `Origin` não estiver na lista de origens permitidas.
- Cookie configurável por propriedades, com o padrão seguro valendo em produção: nome, `Secure`, `SameSite` e `Max-Age` igual a `JWT_REFRESH_TOKEN_TTL`.
- Proxies:
  - `server.forward-headers-strategy: framework`, para que `getRemoteAddr()` devolva o IP real (vindo de `X-Forwarded-For`), e não o do proxy;
  - sem isso, o rate limit de login trava todos os usuários juntos.
- Atualizar a OpenAPI, o README e o `.env.example` com as variáveis novas.

## Pontos de atenção

- `Secure` funciona em `http://localhost` no Chrome e no Firefox, então o desenvolvimento local não quebra.
- O `Path=/api/v1/auth` faz o navegador mandar o cookie só para as rotas de autenticação, e não em toda chamada.
- O frontend precisa mudar ao mesmo tempo (FRONT_22). Fazer o deploy das duas pontas juntas.
- Não registrar o valor do cookie nos logs.
- Confiar em `X-Forwarded-For` só atrás de proxy conhecido. No Railway, o tráfego externo sempre passa pelo proxy da plataforma.

## Decisões (2026-10-31)

1. **Pedido sem `Origin` é aceito.** Navegadores sempre mandam `Origin` em `POST`, então quem não manda (curl, Postman) não consegue fazer CSRF. Só `Origin` presente e fora de `CORS_ALLOWED_ORIGINS` recebe `403`.
2. **Rate limit de login por IP e por e-mail.** Quem chamar o Railway direto pode inventar o `X-Forwarded-For`; o limite por e-mail barra a força bruta numa conta mesmo assim. Efeito colateral aceito: 5 erros num e-mail bloqueiam aquele e-mail por 15 minutos.
3. **Troca direta, sem período de compatibilidade.** O backend deixa de aceitar o refresh token no corpo. Até a FRONT_22, o front local faz login, mas a renovação automática e o logout falham.
4. **Rotas públicas de sessão ignoram o `Authorization`.** Sem isso, um access token vencido mandado no logout geraria `401` antes de chegar ao controller.
5. **Refresh inválido e troca de senha apagam o cookie**, para o navegador não ficar guardando um token que não vale mais.

## Critérios de aceite

- [x] Login e refresh emitem o cookie com `HttpOnly`, `Secure`, `SameSite=Strict` e `Path` corretos, e nenhuma resposta contém o refresh token no corpo.
- [x] Refresh e logout funcionam só com o cookie; `Origin` desconhecido recebe `403`.
- [x] Logout apaga o cookie e revoga o token, mesmo com o access token expirado.
- [x] O rate limit de login usa o IP real quando há `X-Forwarded-For`.
- [x] Testes unitários e MockMvc cobrem a emissão e a leitura do cookie, a checagem de `Origin` e a limpeza no logout.

## Observações de dependência

Depende de BACK_03. Deve ser feita junto com a FRONT_22 e antes do primeiro deploy.
