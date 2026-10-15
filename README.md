#### Para rodar o projeto:

Execute: `npm install` e depois execute: `npm run dev`

## API local

O frontend usa `VITE_API_BASE_URL` como URL completa da API (incluindo `/api/v1`).
O `.env.example` aponta para `http://localhost:8080/api/v1`, endereço padrão do
backend local. Copie-o para `.env.local` e ajuste a URL caso a API esteja em
outro host. A aplicação Vite usa `http://localhost:5173`, origem permitida pelo
perfil local do backend; inicie PostgreSQL e a API conforme o README do backend.

Tokens de acesso e refresh ficam somente em memória; não são gravados em
`localStorage`, `sessionStorage` ou cookies. O refresh é tentado automaticamente
uma vez após `401`; uma falha invalida os tokens e chama o callback de
não-autorizado configurado pela aplicação. Como a resposta do backend entrega o
refresh token no corpo, uma recarga completa exige novo login até que o contrato
de sessão compartilhado seja alterado.

## Testes

Execute `npm test` para testes unitários/componentes com Vitest e MSW. Os mocks
interceptam chamadas HTTP, então esses testes não precisam de backend ou banco
iniciados. `npm run check` roda lint e TypeScript.
