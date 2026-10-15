#### Para rodar o projeto:

Execute: `npm install` e depois execute: `npm run dev`

## API local

O frontend usa `VITE_API_BASE_URL` como URL completa da API (incluindo `/api/v1`).
O `.env.example` aponta para `http://localhost:8080/api/v1`, endereço padrão do
backend local. Copie-o para `.env.local` e ajuste a URL caso a API esteja em
outro host. A aplicação Vite usa `http://localhost:5173`, origem permitida pelo
perfil local do backend; inicie PostgreSQL e a API conforme o README do backend.

O access token fica somente em memória. Como o contrato atual do backend devolve
o refresh token no corpo (sem cookie HttpOnly), ele fica em `sessionStorage` para
restaurar a sessão após reload na mesma aba; é removido no logout e quando a
sessão expira. O refresh é tentado automaticamente uma vez após `401`; uma
resposta `401` invalida as credenciais e a sessão remota é verificada por
`GET /auth/me` no bootstrap. Para proteção contra XSS, o contrato futuro deve
migrar o refresh token para cookie `HttpOnly`, `Secure` e `SameSite`.

## Testes

Execute `npm test` para testes unitários/componentes com Vitest e MSW. Os mocks
interceptam chamadas HTTP, então esses testes não precisam de backend ou banco
iniciados. `npm run check` roda lint e TypeScript.
