# Backlog de refinamento

As tarefas estão numeradas por prioridade global. A numeração indica prioridade, não exige execução em fila: use as dependências de cada arquivo para organizar o trabalho.

## Tarefas

| Prioridade | Arquivo                                                                                                            | Escopo                                                     |
| ---------: | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
|          1 | [BACK_01_FUNDACAO_SPRING_BOOT_GRADLE.md](BACK_01_FUNDACAO_SPRING_BOOT_GRADLE.md)                                   | Projeto Java/Spring Boot, Gradle, dependências e ambientes |
|          2 | [BACK_02_MODELO_DE_DADOS_E_MIGRACOES.md](BACK_02_MODELO_DE_DADOS_E_MIGRACOES.md)                                   | Schema PostgreSQL, JPA e Flyway                            |
|          3 | [BACK_03_AUTENTICACAO_E_AUTORIZACAO.md](BACK_03_AUTENTICACAO_E_AUTORIZACAO.md)                                     | JWT, sessões, papéis e segurança                           |
|          4 | [BACK_04_CONTRATOS_HTTP_OPENAPI_E_ERROS.md](BACK_04_CONTRATOS_HTTP_OPENAPI_E_ERROS.md)                             | Erros, paginação, OpenAPI, request ID e idempotência       |
|          5 | [BACK_05_GESTAO_DE_PECAS_E_HISTORICO.md](BACK_05_GESTAO_DE_PECAS_E_HISTORICO.md)                                   | Estoque, estados e timeline                                |
|          6 | [BACK_06_VENDEDORAS_E_CONFIGURACOES.md](BACK_06_VENDEDORAS_E_CONFIGURACOES.md)                                     | Cadastro de vendedoras, parâmetros e comissões             |
|          7 | [BACK_07_UPLOAD_E_ARMAZENAMENTO_DE_FOTOS.md](BACK_07_UPLOAD_E_ARMAZENAMENTO_DE_FOTOS.md)                           | Upload seguro e object storage                             |
|          8 | [BACK_08_CONSIGNACOES_VENDAS_E_DEVOLUCOES.md](BACK_08_CONSIGNACOES_VENDAS_E_DEVOLUCOES.md)                         | Lotes e movimentações transacionais                        |
|          9 | [BACK_09_DASHBOARD_E_RELATORIOS.md](BACK_09_DASHBOARD_E_RELATORIOS.md)                                             | Agregados, KPIs e relatórios                               |
|         10 | [BACK_10_AUDITORIA_OPERACAO_E_TESTES_INTEGRADOS.md](BACK_10_AUDITORIA_OPERACAO_E_TESTES_INTEGRADOS.md)             | Auditoria, CI, observabilidade e aceite integrado          |
|         11 | [FRONT_11_CLIENTE_HTTP_E_ESTADO_REMOTO.md](FRONT_11_CLIENTE_HTTP_E_ESTADO_REMOTO.md)                               | Cliente API, React Query, erros e DTOs                     |
|         12 | [FRONT_12_LOGIN_SESSAO_E_GUARDS.md](FRONT_12_LOGIN_SESSAO_E_GUARDS.md)                                             | Login e sessão remotos                                     |
|         13 | [FRONT_13_ESTOQUE_ETIQUETAGEM_E_FOTOS.md](FRONT_13_ESTOQUE_ETIQUETAGEM_E_FOTOS.md)                                 | Estoque, recebimento, etiquetagem e fotos                  |
|         14 | [FRONT_14_VENDEDORAS_E_CONFIGURACOES.md](FRONT_14_VENDEDORAS_E_CONFIGURACOES.md)                                   | Administração de vendedores e parâmetros                   |
|         15 | [FRONT_15_CONSIGNACOES_E_PRESTACAO_DE_CONTAS.md](FRONT_15_CONSIGNACOES_E_PRESTACAO_DE_CONTAS.md)                   | Wizard, histórico, venda e devolução                       |
|         16 | [FRONT_16_DASHBOARD_E_RELATORIOS.md](FRONT_16_DASHBOARD_E_RELATORIOS.md)                                           | KPIs, relatórios e exportação                              |
|         17 | [FRONT_17_I18N_E_CONTEUDO_DOS_IDIOMAS.md](FRONT_17_I18N_E_CONTEUDO_DOS_IDIOMAS.md)                                 | Traduções e seletor de idioma funcional                    |
|         18 | [FRONT_18_REMOVER_PERSISTENCIA_LOCAL_E_VALIDAR_FLUXOS.md](FRONT_18_REMOVER_PERSISTENCIA_LOCAL_E_VALIDAR_FLUXOS.md) | Remoção do banco local e validação ponta a ponta           |

## Ondas sugeridas

1. **Base paralela:** BACK_01 e refinamento do desenho de FRONT_11; FRONT_11 pode começar contra MSW usando o contrato atual.
2. **Persistência e padrões:** após BACK_01, executar BACK_02 e BACK_04; BACK_03 pode começar junto e fechar após tabelas de usuário/sessão.
3. **Domínios paralelos:** após schema/padrões, BACK_05, BACK_06 e BACK_07 podem avançar em paralelo.
4. **Consignação:** BACK_08 depende de BACK_05 e BACK_06; FRONT_13/14/15/16 podem ser implementadas sobre FRONT_11 e mocks sem esperar backend pronto.
5. **Agregados e hardening:** BACK_09 depende dos domínios de peça, vendedor e consignação; BACK_10 fecha a integração e operação.
6. **Frontend em paralelo:** FRONT_12 a FRONT_16 dependem de FRONT_11 e podem ser divididas por fluxo. FRONT_17 deve aguardar essas telas para evitar conflitos de edição.
7. **Fechamento:** FRONT_18 é a última etapa: remover o estado legado somente quando todas as telas usarem API e os testes integrados passarem.

## Evidências e decisões abertas

- Estado de domínio atualmente salvo em `localStorage` por `src/lib/db.ts`; regras locais em `src/lib/domain.ts`.
- Páginas já existentes: login, estoque, etiquetagem, consignação, detalhe de vendedora, dashboard, relatórios e configurações.
- `@tanstack/react-query` já está instalado/provido; não há framework de testes frontend configurado no `package.json`.
- i18next está inicializado, mas as páginas não usam `useTranslation`; arquivos `en` e `zh-CN` têm conteúdo placeholder e o fallback é `en`.
- Decisões de produto listadas nos arquivos devem ser resolvidas antes do aceite das tasks afetadas, especialmente estratégia de sessão, regra de etiquetagem, comissão histórica, timezone, role staff e idiomas suportados.
