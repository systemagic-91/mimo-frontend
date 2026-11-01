## Rodar localmente

Requisitos: Node 20.19+ (exigido pelo Vite 7) e npm. O front não precisa de `.env`: sem `VITE_API_BASE_URL`, ele usa `/api/v1`.

```bash
npm install
npm run dev
```

O app abre em `http://localhost:5173`, mas só funciona com uma API no ar. Escolha uma das opções
abaixo.

### Com o backend local

Siga o README do `mimo-backend` (Java 21, Docker para o PostgreSQL):

```bash
docker compose up -d     # na pasta do backend
gradlew.bat bootRun      # Linux/macOS: ./gradlew bootRun
```

Confira em `http://localhost:8080/actuator/health` e rode `npm run dev` normalmente: o proxy já aponta
para `http://localhost:8080`.

### Com o backend do Railway

Sem Java instalado, aponte o proxy para a API publicada:

```bash
# Git Bash / Linux / macOS
API_PROXY_TARGET=https://mimo-backend-production-2b7f.up.railway.app npm run dev
```

```powershell
# PowerShell
$env:API_PROXY_TARGET = "https://mimo-backend-production-2b7f.up.railway.app"; npm run dev
```

Atenção: assim você usa o **banco de produção**. Tudo o que fizer (cadastrar peças, vender, devolver)
grava nos dados reais da loja, e o login é com os usuários de produção. Use o Chrome ou o Edge: o Safari
pode recusar o cookie `Secure` em `http://localhost`.

## Como o front fala com a API

O frontend chama a API pelo caminho relativo `VITE_API_BASE_URL=/api/v1` (o padrão, também no
`.env.example`). Em desenvolvimento, o proxy do Vite (`server.proxy` no `vite.config.ts`) repassa
`/api` para o backend em `http://localhost:8080`, ou para `API_PROXY_TARGET`, quando definida. Na
Vercel, o `vercel.json` faz o mesmo para o backend no Railway. Assim o navegador vê front e API na
mesma origem, e o cookie de sessão funciona em qualquer navegador.

O proxy de desenvolvimento retira o cabeçalho `Origin` dos pedidos. Para o navegador eles já são de
mesma origem, mas sem isso um backend remoto compara o `Origin` `http://localhost:5173` com o
`CORS_ALLOWED_ORIGINS` dele e responde `403 Invalid CORS request`.

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
