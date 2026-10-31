# FRONT_18 - Remover persistência local e validar fluxos integrados

**Prioridade:** 18 - finalização após migração das telas.

## Contexto Motivador

`src/lib/db.ts`, `src/lib/seed.ts`, `src/lib/domain.ts` e os tipos atuais formam um banco alternativo em `localStorage`. Enquanto alguma tela continuar lendo/escrevendo essa fonte, dados podem divergir do backend e parecer salvos sem persistência remota.

## Objetivo

Eliminar o banco de demonstração do caminho de produção e comprovar, com testes, que os fluxos ponta a ponta usam exclusivamente a API.

## Proposta de solução

- Buscar referências restantes a `useDb`, `getDb`, `setDb`, funções de `domain.ts`, `seedDb`, `luma_db_v1`, usuários/senhas seed e adaptar/remover somente após migrações completas.
- Remover seed demo de produção; se necessário, manter fixture isolada exclusivamente para testes/MSW.
- Atualizar `src/lib/types.ts` para DTOs/tipos remotos ou remover interfaces `Db` obsoletas, sem deixar duas fontes de verdade.
- **Dados locais existentes são descartados** (decisão de 2026-10-31): são dados de demonstração. Na primeira carga depois da atualização, o app apaga a chave `luma_db_v1` do `localStorage`, sem importar nada para o backend.
- Adicionar testes de integração de interface (Playwright ou equivalente) para login, troca obrigatória de senha, recebimento, etiquetagem, consignação, venda/devolução, configuração, usuários e relatórios contra um backend de teste.
- Rodar os E2E pelo proxy do Vite (`/api` → backend), como em produção, nos motores Chromium, Firefox e WebKit. Isso também cobre a verificação em navegador que ficou pendente na FRONT_22 (cookie de sessão, reload, duas abas e logout).
- **Criar o CI do front** (GitHub Actions), decisão de 2026-10-31: `npm ci`, `npm run check` (lint + typecheck) e `npm test` em todo push e pull request, e os E2E contra um backend de teste (PostgreSQL descartável e o `.jar` do backend). Isso fecha o critério de CI que ficou pendente na FRONT_11.
- Conferir o `README.md` e o `.env.example` (já usam `VITE_API_BASE_URL=/api/v1` e o proxy desde a FRONT_22) e documentar a execução integrada e o comportamento com a API indisponível.

## Pontos de atenção

- Apagar só a chave do banco de demonstração (`luma_db_v1`); preferências legítimas que continuarem existindo no `localStorage` ficam.
- `localStorage` ainda pode guardar preferências não sensíveis (idioma), mas não o banco de domínio nem senha.
- A remoção depende da migração de todas as telas e da conclusão de decisões sobre sessão, fotos e contratos.
- Testes E2E requerem backend efêmero, banco descartável e storage fake; não podem depender de credenciais reais. Como subir o backend de teste:
  - PostgreSQL descartável (Docker) e o backend com `gradlew bootRun` ou o `.jar`;
  - primeiro owner pelas variáveis `BOOTSTRAP_OWNER_*` (ver README do backend); `JWT_SECRET` é opcional no perfil local;
  - demais usuários criados pela API (`POST /users`), que nascem com troca obrigatória de senha;
  - o banco não tem dados de exemplo: cada teste cria as peças, vendedoras e lotes de que precisa.
- O login tem limite de 5 tentativas erradas a cada 15 minutos por IP **e** por e-mail. Testes de senha errada devem usar e-mails próprios, ou reiniciar o backend entre execuções.
- Os IDs do backend são UUID e o banco começa vazio; fixtures de MSW não podem assumir os IDs do seed antigo.

## Critérios de aceite

- [ ] Nenhuma rota de produção depende de `useDb` ou muta `luma_db_v1`.
- [ ] Credenciais/usuários demo não são embutidos no bundle de produção.
- [ ] Fluxos críticos persistem ao reload e em sessões/dispositivos diferentes.
- [ ] Testes E2E verificam sucesso e erro de rede/validação/conflito por fluxo.
- [ ] Preferências legítimas permanecem separadas do estado de domínio.
- [ ] README e `.env.example` documentam URL da API e execução integrada sem segredos.
- [ ] O CI do front (GitHub Actions) roda lint, typecheck, testes unitários e E2E a cada push, e todos passam.
- [ ] A chave `luma_db_v1` é apagada na primeira carga, sem afetar outras preferências.

## Observações de dependência

Depende de FRONT_11 a FRONT_16, FRONT_20, FRONT_22 e FRONT_24 e do backend (BACK_03 a BACK_23, prontos); tarefas podem ser concluídas paralelamente antes, mas a exclusão do legado é o último passo. FRONT_17 deve ser coordenada para atualizar documentação e mensagens sem conflito.
