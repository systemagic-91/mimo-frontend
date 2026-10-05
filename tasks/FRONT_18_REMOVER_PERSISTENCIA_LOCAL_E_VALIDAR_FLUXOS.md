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
- Decidir se deve haver migração pontual de dados locais existentes; se sim, desenhar import idempotente e seguro, sem enviar credenciais.
- Adicionar testes de integração de interface (Playwright ou equivalente) para login, recebimento, etiquetagem, consignação, venda/devolução, configuração e relatórios contra backend de teste.
- Atualizar `README.md`, `.env.example` e diretrizes de execução para frontend + backend e documentar fallback em caso de API indisponível.

## Pontos de atenção

- Não apagar dados locais do usuário sem decidir se é necessário importar; informar e versionar a estratégia.
- `localStorage` ainda pode guardar preferências não sensíveis (idioma), mas não o banco de domínio nem senha.
- A remoção depende da migração de todas as telas e da conclusão de decisões sobre sessão, fotos e contratos.
- Testes E2E requerem backend efêmero, banco Testcontainers e storage fake; não podem depender de credenciais reais.

## Critérios de aceite

- [ ] Nenhuma rota de produção depende de `useDb` ou muta `luma_db_v1`.
- [ ] Credenciais/usuários demo não são embutidos no bundle de produção.
- [ ] Fluxos críticos persistem ao reload e em sessões/dispositivos diferentes.
- [ ] Testes E2E verificam sucesso e erro de rede/validação/conflito por fluxo.
- [ ] Preferências legítimas permanecem separadas do estado de domínio.
- [ ] README e `.env.example` documentam URL da API e execução integrada sem segredos.
- [ ] Lint, typecheck, unit tests e E2E passam no CI.

## Observações de dependência

Depende de FRONT_11 a FRONT_16 e do aceite integrado de BACK_03 a BACK_09; tarefas podem ser concluídas paralelamente antes, mas a exclusão do legado é o último passo. FRONT_17 deve ser coordenada para atualizar documentação e mensagens sem conflito.
