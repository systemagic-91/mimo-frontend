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

## API fora do ar

O app não guarda dados no navegador: tudo vem da API. Se ela estiver fora do ar ou a rede cair, cada
tela mostra "Não foi possível conectar ao servidor" com o botão **Tentar novamente**, e nada é dado como
salvo. Um envio repetido depois de uma falha de rede (recebimento, etiquetagem, cadastro de vendedora,
criação de lote) reaproveita a mesma `Idempotency-Key` e não cria registro duplicado.

Versões antigas guardavam um banco de demonstração no `localStorage` (`luma_db_v1`). Ele é apagado na
primeira carga, sem importar nada; outras preferências do navegador ficam.

## Testes

- `npm run check`: lint e TypeScript (app, configuração do Vite e E2E).
- `npm test`: testes unitários e de componentes com Vitest e MSW. Os mocks interceptam as chamadas HTTP,
  então não precisam de backend nem de banco.
- `npm run test:e2e`: testes de ponta a ponta com Playwright, contra um backend de verdade.

### Testes E2E

Os E2E abrem o build de produção (`vite preview`, com o mesmo proxy `/api` do desenvolvimento) no
Chromium, no Firefox e no WebKit e usam um backend descartável: o `e2e/global-setup.ts` sobe um PostgreSQL
limpo no Docker (porta 55432, sem volume) e o `.jar` do `mimo-backend` (porta 8081), cria o owner de teste
pelo bootstrap e derruba tudo no fim. Cada teste cria as próprias vendedoras, peças e lotes.

Requisitos: Docker rodando, JDK 21 (`JAVA_HOME`) e o repositório do backend ao lado deste
(`../mimo-backend`). Na primeira vez, instale os navegadores:

```bash
npx playwright install chromium firefox webkit
```

Depois:

```bash
npm run test:e2e                      # os três navegadores
npx playwright test --project=chromium # só um
```

Variáveis opcionais: `E2E_BACKEND_DIR` (outro caminho para o backend), `E2E_BACKEND_JAR` (um `.jar` já
gerado), `E2E_JAVA_HOME`, `E2E_API_PORT`, `E2E_FRONT_PORT` e `E2E_DB_PORT`. Se já houver uma API
respondendo na porta do E2E, ela é usada e nada é iniciado. O log do backend fica em
`test-results/backend.log`.

O CI (`.github/workflows/ci.yml`) roda `npm run check` e `npm test` em todo push e pull request e, em
seguida, os E2E com o backend baixado do GitHub.
