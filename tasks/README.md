# Backlog de refinamento

As tarefas estão numeradas por prioridade global. A numeração indica prioridade, não exige execução em fila: use as dependências de cada arquivo para organizar o trabalho.

## Tarefas

| Prioridade | Arquivo                                                                                                            | Escopo                                                                                  | Status        |
| ---------: | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------- |
|          1 | [BACK_01_FUNDACAO_SPRING_BOOT_GRADLE.md](BACK_01_FUNDACAO_SPRING_BOOT_GRADLE.md)                                   | Projeto Java/Spring Boot, Gradle, dependências e ambientes                              | ✅ Concluída  |
|          2 | [BACK_02_MODELO_DE_DADOS_E_MIGRACOES.md](BACK_02_MODELO_DE_DADOS_E_MIGRACOES.md)                                   | Schema PostgreSQL, JPA e Flyway                                                         | ✅ Concluída  |
|          3 | [BACK_03_AUTENTICACAO_E_AUTORIZACAO.md](BACK_03_AUTENTICACAO_E_AUTORIZACAO.md)                                     | JWT, sessões, papéis e segurança                                                        | ✅ Concluída  |
|          4 | [BACK_04_CONTRATOS_HTTP_OPENAPI_E_ERROS.md](BACK_04_CONTRATOS_HTTP_OPENAPI_E_ERROS.md)                             | Erros, paginação, OpenAPI, request ID e idempotência                                    | ✅ Concluída  |
|          5 | [BACK_05_GESTAO_DE_PECAS_E_HISTORICO.md](BACK_05_GESTAO_DE_PECAS_E_HISTORICO.md)                                   | Estoque, estados e timeline                                                             | ✅ Concluída  |
|          6 | [BACK_06_VENDEDORAS_E_CONFIGURACOES.md](BACK_06_VENDEDORAS_E_CONFIGURACOES.md)                                     | Cadastro de vendedoras, parâmetros e comissões                                          | ✅ Concluída  |
|          7 | [BACK_07_UPLOAD_E_ARMAZENAMENTO_DE_FOTOS.md](BACK_07_UPLOAD_E_ARMAZENAMENTO_DE_FOTOS.md)                           | Upload seguro e fotos no PostgreSQL                                                     | ✅ Concluída  |
|          8 | [BACK_08_CONSIGNACOES_VENDAS_E_DEVOLUCOES.md](BACK_08_CONSIGNACOES_VENDAS_E_DEVOLUCOES.md)                         | Lotes e movimentações transacionais                                                     | ✅ Concluída  |
|          9 | [BACK_09_DASHBOARD_E_RELATORIOS.md](BACK_09_DASHBOARD_E_RELATORIOS.md)                                             | Agregados, KPIs e relatórios                                                            | ✅ Concluída  |
|         10 | [BACK_10_AUDITORIA_OPERACAO_E_OBSERVABILIDADE.md](BACK_10_AUDITORIA_OPERACAO_E_OBSERVABILIDADE.md)                 | Auditoria, métricas, tracing, CI e runbook                                              | ✅ Concluída  |
|         11 | [FRONT_11_CLIENTE_HTTP_E_ESTADO_REMOTO.md](FRONT_11_CLIENTE_HTTP_E_ESTADO_REMOTO.md)                               | Cliente API, React Query, erros e DTOs                                                  | ✅ Concluída¹ |
|         12 | [FRONT_12_LOGIN_SESSAO_E_GUARDS.md](FRONT_12_LOGIN_SESSAO_E_GUARDS.md)                                             | Login e sessão remotos                                                                  | ✅ Concluída  |
|         13 | [FRONT_13_ESTOQUE_ETIQUETAGEM_E_FOTOS.md](FRONT_13_ESTOQUE_ETIQUETAGEM_E_FOTOS.md)                                 | Estoque, recebimento, etiquetagem e fotos                                               | ✅ Concluída  |
|         14 | [FRONT_14_VENDEDORAS_E_CONFIGURACOES.md](FRONT_14_VENDEDORAS_E_CONFIGURACOES.md)                                   | Administração de vendedores e parâmetros                                                | ⏳ Pendente   |
|         15 | [FRONT_15_CONSIGNACOES_E_PRESTACAO_DE_CONTAS.md](FRONT_15_CONSIGNACOES_E_PRESTACAO_DE_CONTAS.md)                   | Wizard, histórico, venda e devolução                                                    | ⏳ Pendente   |
|         16 | [FRONT_16_DASHBOARD_E_RELATORIOS.md](FRONT_16_DASHBOARD_E_RELATORIOS.md)                                           | KPIs, relatórios e exportação                                                           | ⏳ Pendente   |
|         17 | [FRONT_17_I18N_E_CONTEUDO_DOS_IDIOMAS.md](FRONT_17_I18N_E_CONTEUDO_DOS_IDIOMAS.md)                                 | Textos em pt-BR pelo i18n; remove o seletor de idioma                                   | ⏳ Pendente   |
|         18 | [FRONT_18_REMOVER_PERSISTENCIA_LOCAL_E_VALIDAR_FLUXOS.md](FRONT_18_REMOVER_PERSISTENCIA_LOCAL_E_VALIDAR_FLUXOS.md) | Remoção do banco local e validação ponta a ponta                                        | ⏳ Pendente   |
|         19 | [BACK_19_GESTAO_DE_USUARIOS.md](BACK_19_GESTAO_DE_USUARIOS.md)                                                     | Cadastro de usuários pelo owner e troca obrigatória de senha                            | ✅ Concluída   |
|         20 | [FRONT_20_GESTAO_DE_USUARIOS.md](FRONT_20_GESTAO_DE_USUARIOS.md)                                                   | Tela de usuários e de troca de senha                                                    | ✅ Concluída  |
|         21 | [BACK_21_REFRESH_TOKEN_EM_COOKIE.md](BACK_21_REFRESH_TOKEN_EM_COOKIE.md)                                           | Refresh token em cookie HttpOnly e IP real atrás de proxy                               | ✅ Concluída   |
|         22 | [FRONT_22_SESSAO_COM_COOKIE_E_PROXY_VERCEL.md](FRONT_22_SESSAO_COM_COOKIE_E_PROXY_VERCEL.md)                       | Sessão por cookie e proxy `/api` na Vercel e no Vite                                    | 🟡 Parcial    |
|         23 | [BACK_23_CUSTO_DAS_PECAS.md](BACK_23_CUSTO_DAS_PECAS.md)                                                           | Custos de fábrica e banho, e margem                                                     | ✅ Concluída  |
|         24 | [FRONT_24_CUSTO_DAS_PECAS.md](FRONT_24_CUSTO_DAS_PECAS.md)                                                         | Campos de custo e margem para owner                                                     | ⏳ Pendente   |
|         26 | [BACK_26_VALOR_TOTAL_DO_ESTOQUE_FILTRADO.md](BACK_26_VALOR_TOTAL_DO_ESTOQUE_FILTRADO.md)                           | Soma do valor das peças filtradas em `GET /pieces`                                      | ✅ Concluída  |
|         27 | [BACK_27_PRAZO_DE_PAGAMENTO_NO_LOTE.md](BACK_27_PRAZO_DE_PAGAMENTO_NO_LOTE.md)                                     | Prazo de pagamento guardado no lote e agenda de repasses da vendedora                   | ✅ Concluída  |

## Ordem de execução do frontend (2026-10-31)

Todo o backend está pronto. A FRONT_11, a FRONT_12, a FRONT_20 e a FRONT_13 estão concluídas, e a FRONT_22 só espera a verificação em navegador real, que entra nos E2E da FRONT_18.

1. **FRONT_20 – Usuários e troca de senha.** Sem ela, ninguém além do primeiro owner consegue usar o sistema: todo usuário criado nasce com troca obrigatória de senha. Ela também ajusta o cliente HTTP (tratamento do `403 PASSWORD_CHANGE_REQUIRED` e do `401` de senha atual errada) antes que as outras telas dependam dele, e cria as abas da página de Configurações.
2. **FRONT_13 – Estoque, etiquetagem e fotos.** Cria as peças que todas as outras telas usam.
3. **FRONT_14 – Vendedoras e configurações.** Curta; cria as vendedoras e os prazos de que a consignação precisa. Vem depois da 20 porque as duas mexem na mesma página.
4. **FRONT_15 – Consignações.** O fluxo principal; precisa de peças etiquetadas e vendedoras para ser testado de verdade.
5. **FRONT_16 – Dashboard e relatórios.** Só mostra números com sentido quando já existem lotes e vendas.
6. **FRONT_24 – Custos e margem.** Acrescenta campos às telas das FRONT_13 e 16.
7. **FRONT_17 – Textos em português pelo i18n.** Mexe no texto de todas as telas; antes disso, conflitaria com cada migração.
8. **FRONT_18 – Remover o banco local, E2E e CI do front.** O fechamento: apaga o legado, cria o CI e roda os E2E nos três navegadores (fechando a FRONT_22).

**Em paralelo (se houver mais de uma pessoa):** a 13 e a 14 podem andar juntas depois da 20; a 16 pode começar com MSW enquanto a 15 é feita.

**Deploy:** o primeiro deploy útil é logo depois da FRONT_16, quando a loja já opera de ponta a ponta pela API. As FRONT_24, 17 e 18 entram nos deploys seguintes.

## Estado atual (atualizado em 2026-10-31)

- **Backend:** BACK_01 a BACK_10 implementadas: autenticação, contratos HTTP, peças/timeline, vendedoras e configurações, fotos no PostgreSQL, consignações com venda e devolução, dashboard e relatórios. Também estão prontas a BACK_10 (auditoria, métricas, tracing, CI e runbook), a BACK_19 (gestão de usuários e troca obrigatória de senha) e a BACK_21 (refresh token em cookie `HttpOnly`). A BACK_23 (custo das peças e margem) também está pronta. A BACK_26 (valor total do estoque) e a BACK_27 (prazo de pagamento no lote) também estão prontas: **todas as tasks de backend estão concluídas**. A FRONT_22 (sessão por cookie no front) também está implementada; falta conferir num navegador de verdade e na Vercel.
- **Testes do backend:** apenas testes unitários com JUnit 5 + Mockito (e testes de contexto com H2). Não há Testcontainers nem testes integrados automatizados; não é preciso Docker para rodar `./gradlew test`. As migrations são validadas no CI contra um PostgreSQL limpo (BACK_10). Decisão definitiva: não haverá testes de integração automatizados no backend.
- **Observabilidade (BACK_10):** tracing só com IDs nos logs, métricas protegidas para owner, logs em JSON só em produção e backup manual com `pg_dump`.
- **Frontend:** cliente HTTP, hooks React Query (`src/lib/api/hooks.ts`), login remoto, troca de senha (`/trocar-senha`) e a aba Usuários de Configurações (FRONT_20) prontos. Estoque, detalhe da peça e Etiquetagem usam a API (FRONT_13). Ainda faltam cliente e hooks para `GET /sellers/{id}/payment-schedule` (FRONT_15) e `PATCH /pieces/{id}/costs` (FRONT_24). As demais telas (Consignação, Dashboard, Relatórios e as abas de vendedoras e parâmetros) ainda leem/escrevem o banco local (`useDb` em `src/lib/db.ts`, regras em `src/lib/domain.ts`).
- **Testes do frontend:** Vitest + Testing Library + MSW configurados (`npm test`); `npm run check` roda lint e verificação de tipos. Detalhes dos scripts em `SCRIPTS_NPM.md`.
- **i18n:** i18next está inicializado, mas as páginas não usam `useTranslation`; arquivos `en` e `zh-CN` têm conteúdo placeholder e o fallback é `en`. Decisão: ficar só com `pt-BR` (FRONT_17).

## Decisões de produto

Todas as decisões de produto foram tomadas em 2026-10-30 e estão registradas em `BACKEND_API_CONTRACT.md` (seção "Decisões de produto"). Resumo:

- **Etiquetagem:** atualiza a peça que voltou do banho e mantém o código (BACK_05).
- **Staff:** usa os fluxos operacionais e lê `GET /settings`; não acessa dashboard, relatórios, usuários nem custos.
- **Comissão:** snapshot da taxa na **entrega** do lote.
- **Fotos:** no PostgreSQL, servidas pelo backend (BACK_07); sem S3.
- **Usuários:** owner cadastra com senha temporária e troca obrigatória (BACK_19/FRONT_20); sem e-mail.
- **Sessão:** refresh token em cookie `HttpOnly` com proxy da Vercel (BACK_21/FRONT_22); ver `SESSAO_E_COOKIES.md`.
- **Custos:** fábrica + banho, opcionais e só para owner (BACK_23/FRONT_24).
- **Romaneio:** impressão pelo navegador.
- **Valor do estoque:** a soma das peças filtradas vem da API (BACK_26).
- **Prazo de pagamento:** guardado no lote; cada venda vence em data da venda + prazo, e a vendedora deve venda − comissão; sem controle de pagamento recebido por enquanto (BACK_27/FRONT_15).
- **Venda/devolução com data:** a tela oferece uma data opcional para prestações de contas atrasadas (FRONT_15).
- **Idioma:** só português (`pt-BR`); sem seletor de idioma. Moeda e datas sempre no padrão brasileiro (FRONT_17).
- **Dados de demonstração:** o banco local (`luma_db_v1`) é descartado, sem importação (FRONT_18).
- **CI do front:** criado na FRONT_18 (lint, typecheck, testes unitários e E2E).
- **Testes do backend:** apenas JUnit 5 + Mockito.
- **Ainda em aberto (sem bloqueio):** idiomas suportados (FRONT_17).
