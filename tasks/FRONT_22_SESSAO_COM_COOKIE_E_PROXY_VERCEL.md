# FRONT_22 - Sessão com cookie e proxy da Vercel

**Prioridade:** 22 - obrigatória antes do primeiro deploy, junto com a BACK_21.

## Contexto Motivador

O frontend guarda o refresh token em `sessionStorage` (FRONT_12). Com a BACK_21, o token passa a viajar só num cookie `HttpOnly`. O front fica na Vercel e a API no Railway, em domínios diferentes, e navegadores como o Safari bloqueiam cookies vindos de outro domínio. Por isso a Vercel fará proxy de `/api/*` para o Railway, deixando front e API na mesma origem. A explicação em linguagem simples está em `SESSAO_E_COOKIES.md`.

## Objetivo

Remover o refresh token do JavaScript e configurar o proxy para que a sessão funcione igual em desenvolvimento e em produção, em qualquer navegador.

## Proposta de solução

- Criar `vercel.json` com:
  - um rewrite de `/api/:path*` para `https://<servico>.up.railway.app/api/:path*`;
  - o fallback de SPA (`/(.*)` para `/index.html`), para as rotas do React Router funcionarem no reload.
- Configurar `server.proxy` no `vite.config.ts`, apontando `/api` para `http://localhost:8080`. Assim o desenvolvimento local também fica na mesma origem.
- Usar `VITE_API_BASE_URL=/api/v1` (caminho relativo) e atualizar o `.env.example` e o README.
- Em `src/lib/api/http.ts`:
  - apagar `REFRESH_TOKEN_KEY` e todo uso de `sessionStorage`;
  - `refreshTokens()` chama `POST /auth/refresh` sem corpo;
  - o access token continua só em memória;
  - usar `credentials: "same-origin"` (o padrão do `fetch`), que já envia o cookie para a mesma origem.
- Logout chama `POST /auth/logout` sem corpo e limpa o access token e o cache.
- No bootstrap, sem access token em memória, tentar `POST /auth/refresh` uma vez. Se a resposta for `401`, não há sessão.
- Atualizar os testes MSW de sessão para o novo fluxo, em que o cookie é invisível para o JS.

## Pontos de atenção

- Com o cookie, a sessão passa a sobreviver ao fechar a aba (antes, o `sessionStorage` era apagado). Isso é esperado.
- Duas abas abertas podem tentar renovar ao mesmo tempo e uma delas reutilizar um token já trocado, o que revoga todas as sessões. Avaliar um `BroadcastChannel`/lock entre abas, ou aceitar o risco e documentar.
- A URL do Railway fica só no `vercel.json` e não vai para o bundle.
- Não usar `credentials: "include"`: ele só é necessário entre domínios diferentes, que é justamente o que o proxy evita.

## Decisões (2026-10-31)

1. **URL do backend:** `https://mimo-backend-production-2b7f.up.railway.app`, fixa no `vercel.json` (o rewrite não aceita variável de ambiente). Ela não vai para o bundle.
2. **Trava entre abas com a Web Locks API** (`navigator.locks`, trava `luma-session-refresh`). Renovação e logout passam pela trava, e a segunda aba espera e já manda o cookie novo. Sem a trava, duas abas renovando juntas deram `200` e `401` no teste, e o `401` derruba todas as sessões. Em navegador sem `navigator.locks`, a renovação acontece sem trava.
3. **Proxy do Vite configurável** por `API_PROXY_TARGET` (padrão `http://localhost:8080`).
4. **Logout não manda `Authorization`**: a rota é pública e o backend ignora o header nela.

## Verificação (2026-10-31)

- Testes Vitest/MSW cobrem login sem refresh token no corpo, restauração pelo cookie, `401` no refresh levando ao login, erro de rede com opção de tentar de novo, logout sem corpo, uma só renovação para vários `401` simultâneos e a ordem da trava entre abas.
- Verificado com backend e Vite reais, por um script que imita o navegador (sem navegador de verdade): login, cookie voltando pelo proxy com `Path=/api/v1/auth`, restauração só pelo cookie, logout com access token vencido, `403` para `Origin` estrangeiro e rotas internas (`/estoque`) abrindo pelo `index.html`.
- **Falta verificar num navegador de verdade** (Chrome, Firefox e Safari), localmente e na Vercel. O `vercel.json` ainda não foi testado num deploy.

## Critérios de aceite

- [x] Nenhum token aparece em `localStorage` ou `sessionStorage`.
- [ ] Login, reload da página, renovação automática e logout funcionam em desenvolvimento (proxy do Vite) e na Vercel.
- [ ] O app funciona no Chrome, no Firefox e no Safari em produção.
- [ ] Reload em rota interna (ex.: `/estoque`) na Vercel abre a página, sem 404.
- [x] Testes MSW cobrem bootstrap via refresh, `401` no refresh e logout.

## Observações de dependência

Depende de FRONT_12 e da BACK_21; fazer o deploy das duas juntas.
