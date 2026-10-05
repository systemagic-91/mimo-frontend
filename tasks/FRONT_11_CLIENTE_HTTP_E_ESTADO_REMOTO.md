# FRONT_11 - Cliente HTTP e estado remoto

**Prioridade:** 11 - fundação comum para integrar os fluxos de tela.

## Contexto Motivador

As páginas leem e alteram `useDb()`/`localStorage` diretamente; `@tanstack/react-query` já está instalado e provido em `App.tsx`, mas não há cliente HTTP de domínio. A API definida em `BACKEND_API_CONTRACT.md` usa paginação, `valueCents`, JWT e erros `ProblemDetail`.

## Objetivo

Criar uma camada tipada e compartilhada de comunicação com o backend, sem acoplar páginas a `fetch` ou ao formato JPA.

## Proposta de solução

- Definir `VITE_API_BASE_URL` com valor local configurável e base `/api/v1`.
- Criar cliente HTTP único que serializa JSON, trata `204`, timeout/cancelamento e transforma erros RFC 7807 em um tipo consumível pela UI.
- Definir DTOs frontend para respostas do contrato e mappers de moeda (`valueCents` <-> valor usado por `formatCurrency`) e nomes de enums do backend para os literais atuais.
- Criar módulos/query keys por domínio (auth, pieces, sellers, consignments, dashboard, reports, settings) e mutations com invalidação coerente.
- Definir hooks para loading, empty, error/retry, cancelamento e atualização otimista somente onde não houver risco de transação.
- Configurar política central de access/refresh token e callback de `401`; não persistir senha.
- Adicionar e configurar Vitest, Testing Library e MSW (ou equivalentes já padronizados pelo time) para testes unitários, de componentes e mocks de API; o projeto atualmente não tem runner frontend.
- Documentar como executar o frontend contra backend local.

## Pontos de atenção

- React Query já existe; não criar outro store remoto nem duplicar cache em Zustand/context.
- Valores `number` atuais representam reais decimais; conversão para centavos deve arredondar/validar sem erros de ponto flutuante.
- Há conflito potencial entre refresh em cookie HttpOnly e CORS/CSRF; fechar com BACK_03 antes de escolher implementação final.
- Não inventar DTOs diferentes do OpenAPI; gerar tipos via OpenAPI se isso couber no fluxo adotado.

## Critérios de aceite

- [ ] Todos os requests de domínio passam por um cliente comum, com URL e auth configuráveis.
- [ ] Erros RFC 7807 preservam código/status e podem ser apresentados em mensagens amigáveis.
- [ ] Query keys são estáveis e mutations invalidam os dados relacionados.
- [ ] Conversão dinheiro e enums tem testes unitários para valores de borda.
- [ ] Runner frontend executa testes de hooks/componentes em CI sem exigir backend real.
- [ ] Mocks permitem testar fluxo sem backend iniciado.
- [ ] Tela demonstra loading, erro/retry e estado sem resultados com componentes acessíveis.

## Observações de dependência

Depende do contrato `BACKEND_API_CONTRACT.md`, mas não do backend implementado; pode começar em paralelo a BACK_01..BACK_10. FRONT_12 a FRONT_16 dependem desta camada. Confirmar estratégia de token com BACK_03 antes da autenticação final.
