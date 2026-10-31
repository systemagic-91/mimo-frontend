#### Para rodar o projeto:

Execute: `npm install` e depois execute: `npm run dev`

## API local

O frontend chama a API pelo caminho relativo `VITE_API_BASE_URL=/api/v1` (o padrão, também no
`.env.example`). Em desenvolvimento, o proxy do Vite (`server.proxy` no `vite.config.ts`) repassa
`/api` para o backend em `http://localhost:8080`; para outro endereço, defina `API_PROXY_TARGET`
antes do `npm run dev`. Na Vercel, o `vercel.json` faz o mesmo para o backend no Railway. Assim o
navegador vê front e API na mesma origem, e o cookie de sessão funciona em qualquer navegador.
Inicie PostgreSQL e a API conforme o README do backend e acesse `http://localhost:5173`.

## Sessão

- O **access token** (15 minutos) fica só em memória.
- O **refresh token** fica no cookie `luma_refresh`, `HttpOnly`, que o JavaScript não consegue ler.
  Nenhum token vai para `localStorage` ou `sessionStorage`.
- Ao abrir ou recarregar a página, o app chama `POST /auth/refresh` (sem corpo; o navegador manda o
  cookie). `401` significa que não há sessão e leva ao login.
- Depois de um `401` numa chamada comum, o app renova a sessão uma vez e repete a chamada.
- As abas dividem o mesmo cookie. A renovação usa uma trava entre abas (`navigator.locks`), para
  duas abas não renovarem ao mesmo tempo: o backend entenderia o segundo pedido como token roubado e
  derrubaria todas as sessões.
- O logout chama `POST /auth/logout` (sem corpo), que revoga a sessão e apaga o cookie.
- A sessão sobrevive a fechar a aba e expira em 30 dias sem uso. Explicação completa em
  `SESSAO_E_COOKIES.md`.

## Testes

Execute `npm test` para testes unitários/componentes com Vitest e MSW. Os mocks
interceptam chamadas HTTP, então esses testes não precisam de backend ou banco
iniciados. `npm run check` roda lint e TypeScript.
