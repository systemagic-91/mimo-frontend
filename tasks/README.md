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
|         13 | [FRONT_13_ESTOQUE_ETIQUETAGEM_E_FOTOS.md](FRONT_13_ESTOQUE_ETIQUETAGEM_E_FOTOS.md)                                 | Estoque, recebimento, etiquetagem e fotos                                               | ⏳ Pendente   |
|         14 | [FRONT_14_VENDEDORAS_E_CONFIGURACOES.md](FRONT_14_VENDEDORAS_E_CONFIGURACOES.md)                                   | Administração de vendedores e parâmetros                                                | ⏳ Pendente   |
|         15 | [FRONT_15_CONSIGNACOES_E_PRESTACAO_DE_CONTAS.md](FRONT_15_CONSIGNACOES_E_PRESTACAO_DE_CONTAS.md)                   | Wizard, histórico, venda e devolução                                                    | ⏳ Pendente   |
|         16 | [FRONT_16_DASHBOARD_E_RELATORIOS.md](FRONT_16_DASHBOARD_E_RELATORIOS.md)                                           | KPIs, relatórios e exportação                                                           | ⏳ Pendente   |
|         17 | [FRONT_17_I18N_E_CONTEUDO_DOS_IDIOMAS.md](FRONT_17_I18N_E_CONTEUDO_DOS_IDIOMAS.md)                                 | Traduções e seletor de idioma funcional                                                 | ⏳ Pendente   |
|         18 | [FRONT_18_REMOVER_PERSISTENCIA_LOCAL_E_VALIDAR_FLUXOS.md](FRONT_18_REMOVER_PERSISTENCIA_LOCAL_E_VALIDAR_FLUXOS.md) | Remoção do banco local e validação ponta a ponta                                        | ⏳ Pendente   |
|         19 | [BACK_19_GESTAO_DE_USUARIOS.md](BACK_19_GESTAO_DE_USUARIOS.md)                                                     | Cadastro de usuários pelo owner e troca obrigatória de senha                            | ✅ Concluída   |
|         20 | [FRONT_20_GESTAO_DE_USUARIOS.md](FRONT_20_GESTAO_DE_USUARIOS.md)                                                   | Tela de usuários e de troca de senha                                                    | ⏳ Pendente   |
|         21 | [BACK_21_REFRESH_TOKEN_EM_COOKIE.md](BACK_21_REFRESH_TOKEN_EM_COOKIE.md)                                           | Refresh token em cookie HttpOnly e IP real atrás de proxy                               | ✅ Concluída   |
|         22 | [FRONT_22_SESSAO_COM_COOKIE_E_PROXY_VERCEL.md](FRONT_22_SESSAO_COM_COOKIE_E_PROXY_VERCEL.md)                       | Sessão por cookie e proxy `/api` na Vercel e no Vite                                    | 🟡 Parcial    |
|         23 | [BACK_23_CUSTO_DAS_PECAS.md](BACK_23_CUSTO_DAS_PECAS.md)                                                           | Custos de fábrica e banho, e margem                                                     | ✅ Concluída  |
|         24 | [FRONT_24_CUSTO_DAS_PECAS.md](FRONT_24_CUSTO_DAS_PECAS.md)                                                         | Campos de custo e margem para owner                                                     | ⏳ Pendente   |
|         26 | [BACK_26_VALOR_TOTAL_DO_ESTOQUE_FILTRADO.md](BACK_26_VALOR_TOTAL_DO_ESTOQUE_FILTRADO.md)                           | Soma do valor das peças filtradas em `GET /pieces`                                      | ⏳ Pendente   |
|         27 | [BACK_27_PRAZO_DE_PAGAMENTO_NO_LOTE.md](BACK_27_PRAZO_DE_PAGAMENTO_NO_LOTE.md)                                     | Prazo de pagamento guardado no lote e agenda de repasses da vendedora                   | ⏳ Pendente   |

## Ondas sugeridas

1. **Base paralela:** BACK_01 e refinamento do desenho de FRONT_11; FRONT_11 pode começar contra MSW usando o contrato atual.
2. **Persistência e padrões:** após BACK_01, executar BACK_02 e BACK_04; BACK_03 pode começar junto e fechar após tabelas de usuário/sessão.
3. **Domínios paralelos:** após schema/padrões, BACK_05, BACK_06 e BACK_07 podem avançar em paralelo.
4. **Consignação:** BACK_08 depende de BACK_05 e BACK_06; FRONT_13/14/15/16 podem ser implementadas sobre FRONT_11 e mocks sem esperar backend pronto.
5. **Agregados e hardening:** BACK_09 depende dos domínios de peça, vendedor e consignação; BACK_10 fecha a operação (auditoria, observabilidade, CI e runbook).
6. **Frontend em paralelo:** FRONT_12 a FRONT_16 dependem de FRONT_11 e podem ser divididas por fluxo. FRONT_17 deve aguardar essas telas para evitar conflitos de edição.
7. **Fechamento:** FRONT_18 é a última etapa: remover o estado legado somente quando todas as telas usarem API e os testes integrados passarem.
8. **Antes do primeiro deploy (Vercel + Railway):** BACK_19/FRONT_20 (sem elas não há como criar usuários staff) e BACK_21/FRONT_22 (sessão por cookie e proxy), com o deploy das duas pontas feito junto.
9. **Evolução:** BACK_23/FRONT_24 (custos e margem) depois de BACK_09/FRONT_13/FRONT_16.
10. **Ajustes pedidos pelas telas:** BACK_26 (valor total do estoque, para a FRONT_13) e BACK_27 (prazo de pagamento no lote, para a FRONT_15). As duas telas podem começar antes; só os cards dependem delas.

¹ Falta apenas o critério de CI: os testes rodam sem backend (`npm test`), mas o frontend ainda não tem pipeline de CI.

## Estado atual (atualizado em 2026-10-31)

- **Backend:** BACK_01 a BACK_10 implementadas: autenticação, contratos HTTP, peças/timeline, vendedoras e configurações, fotos no PostgreSQL, consignações com venda e devolução, dashboard e relatórios. Também estão prontas a BACK_10 (auditoria, métricas, tracing, CI e runbook), a BACK_19 (gestão de usuários e troca obrigatória de senha) e a BACK_21 (refresh token em cookie `HttpOnly`). A BACK_23 (custo das peças e margem) também está pronta. Faltam a BACK_26 e a BACK_27, criadas na revisão das tasks do front. A FRONT_22 (sessão por cookie no front) também está implementada; falta conferir num navegador de verdade e na Vercel.
- **Testes do backend:** apenas testes unitários com JUnit 5 + Mockito (e testes de contexto com H2). Não há Testcontainers nem testes integrados automatizados; não é preciso Docker para rodar `./gradlew test`. As migrations são validadas no CI contra um PostgreSQL limpo (BACK_10). Decisão definitiva: não haverá testes de integração automatizados no backend.
- **Observabilidade (BACK_10):** tracing só com IDs nos logs, métricas protegidas para owner, logs em JSON só em produção e backup manual com `pg_dump`.
- **Frontend:** cliente HTTP, hooks React Query (`src/lib/api/hooks.ts`) e login remoto prontos. Já existem hooks para todos os endpoints do contrato, mas as telas, exceto o Login, ainda leem/escrevem o banco local (`useDb` em `src/lib/db.ts`, regras em `src/lib/domain.ts`).
- **Testes do frontend:** Vitest + Testing Library + MSW configurados (`npm test`); `npm run check` roda lint e verificação de tipos. Detalhes dos scripts em `SCRIPTS_NPM.md`.
- **i18n:** i18next está inicializado, mas as páginas não usam `useTranslation`; arquivos `en` e `zh-CN` têm conteúdo placeholder e o fallback é `en` (escopo da FRONT_17).

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
- **Testes do backend:** apenas JUnit 5 + Mockito.
- **Ainda em aberto (sem bloqueio):** idiomas suportados (FRONT_17).
