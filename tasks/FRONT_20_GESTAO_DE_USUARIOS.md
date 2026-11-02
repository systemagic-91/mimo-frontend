# FRONT_20 - Gestão de usuários e troca obrigatória de senha

**Prioridade:** 20 - interface da BACK_19.

## Contexto Motivador

O backend permite que o owner cadastre usuários com senha temporária e obriga a troca no primeiro login (BACK_19, pronta). O frontend não tem tela de usuários nem de troca de senha. O tipo `ApiUser` já tem `mustChangePassword`.

## Objetivo

Dar ao owner uma tela para administrar as contas e garantir que quem entra com senha temporária a troque antes de usar o sistema.

## Contrato da API (estado em 2026-10-31)

Detalhes nas seções 1 e 9 do `BACKEND_API_CONTRACT.md`.

**Usuários** (todas as rotas só para owner; staff recebe `403`; `Idempotency-Key` automática):

- `GET /users`: query `q` (nome ou e-mail), `role` (`owner`/`staff`), `active` (`true`/`false`), paginação e `sort` (`name`, `email`, `role`, `active`, `createdAt`, `updatedAt`). Devolve `UserResponse`: `id`, `name`, `email`, `role`, `active`, `mustChangePassword`, `createdAt` e `updatedAt`.
- `POST /users`: `{ name, email, role, temporaryPassword }`, com senha de 12 a 72 caracteres. Cria o usuário ativo e com `mustChangePassword = true`. Resposta `201 UserResponse`; a senha nunca volta.
- `PATCH /users/{id}`: `{ name?, email?, role?, active? }`, com ao menos um campo. Resposta `200 UserResponse`.
- `POST /users/{id}/reset-password`: `{ temporaryPassword }`. Resposta `200 UserResponse`, com `mustChangePassword = true`.
- Efeitos:
  - desativar, mudar o papel ou redefinir a senha **desloga a pessoa na hora**;
  - editar nome ou e-mail não desloga;
  - reativar não precisa de nada além do `PATCH`.
- Regras sobre a própria conta: o owner pode editar o próprio nome e e-mail, mas **não** pode mudar o próprio papel, desativar a si mesmo nem redefinir a própria senha por aqui.
- Erros:
  - `409 EMAIL_ALREADY_USED`, sem diferenciar maiúsculas;
  - `422 LAST_OWNER`, `422 CANNOT_DEACTIVATE_SELF`, `422 CANNOT_CHANGE_OWN_ROLE` e `422 CANNOT_RESET_OWN_PASSWORD`;
  - `404 USER_NOT_FOUND`;
  - `400 VALIDATION_ERROR` com `fields` (`name`, `email`, `temporaryPassword`, `role`).

**Troca de senha e bloqueio:**

- `mustChangePassword` vem no `user` do login, do refresh e de `GET /auth/me`.
- Enquanto for `true`, só funcionam `GET /auth/me`, `POST /auth/change-password` e `POST /auth/logout`. Qualquer outra rota responde `403 PASSWORD_CHANGE_REQUIRED`, inclusive para owner.
- `POST /auth/change-password`:
  - corpo `{ currentPassword, newPassword }`; a nova senha tem de 12 a 72 caracteres e precisa ser diferente da atual;
  - resposta `204`;
  - **revoga todas as sessões, inclusive a atual**, e apaga o cookie de sessão.
- Erros da troca: `401 INVALID_CREDENTIALS` (senha atual errada), `400 PASSWORD_UNCHANGED` e `400 VALIDATION_ERROR`.
- Login de usuário desativado: `403 USER_INACTIVE`. Não existe recuperação de senha por e-mail; quem esquece fala com um owner, que redefine.

## Proposta de solução

- Cliente e hooks:
  - `usersApi` (`list`, `create`, `update`, `resetPassword`) e `authApi.changePassword`;
  - hooks `useUsersQuery`, `useCreateUserMutation`, `useUpdateUserMutation`, `useResetUserPasswordMutation` e `useChangePasswordMutation`, com query keys `users.*`.
- Aba "Usuários" em Configurações (rota já restrita a owner):
  - lista com nome, e-mail, papel, status e a marca "troca de senha pendente", com busca e filtros;
  - criar usuário (nome, e-mail, papel e senha temporária) e editar nome, e-mail e papel;
  - ativar/desativar e redefinir a senha;
  - na linha da própria conta, esconder ou desabilitar mudar papel, desativar e redefinir senha.
- Tela `/trocar-senha` (senha atual, nova senha e confirmação):
  - quando `user.mustChangePassword` for `true`, os guards redirecionam para ela a partir de qualquer rota privada e não deixam sair até concluir;
  - **ao concluir, a sessão é encerrada no front** (limpar o access token e o cache) e a pessoa vai para o login com a mensagem "Senha alterada. Entre com a nova senha". É o comportamento decidido na BACK_19: a troca derruba todas as sessões.
- Opção "Trocar senha" no menu do usuário, para qualquer pessoa, com o mesmo fluxo e o mesmo retorno ao login.
- Cliente HTTP (`src/lib/api/http.ts`):
  - chamar `change-password` com `retryOnUnauthorized: false` e `notifyUnauthorized: false`. Sem isso, o `401 INVALID_CREDENTIALS` de senha atual errada dispara a renovação de sessão e o logout, em vez de mostrar "senha atual incorreta";
  - tratar `403` com `code = PASSWORD_CHANGE_REQUIRED` vindo de qualquer request, avisando o app (como o handler de `401`) para ir à tela de troca.
- Mensagens claras para cada `code` de erro listado acima. No login, mostrar uma mensagem própria para `USER_INACTIVE`.

## Pontos de atenção

- Não guardar a senha temporária em estado global, cache nem `localStorage`; limpar o formulário depois do envio.
- Confirmar antes de desativar alguém, mudar o papel ou redefinir uma senha, avisando que a pessoa será deslogada.
- Enquanto a troca estiver pendente, não disparar queries de outras telas (todas dariam `403`).
- A `Idempotency-Key` de criação e de redefinição não considera a senha. Gerar uma chave nova a cada envio do formulário; reutilizar só no retry do mesmo envio.

## Critérios de aceite

- [x] Owner lista, cria, edita (inclusive o e-mail), desativa, reativa e redefine a senha de usuários.
- [x] Staff não vê a aba e recebe UX adequada se acessar a rota diretamente.
- [x] Usuário com `mustChangePassword` não consegue sair da tela de troca até concluir; depois da troca, volta ao login e entra com a nova senha.
- [x] Senha atual errada na troca mostra a mensagem de erro, sem deslogar.
- [x] Erros de regra (último owner, e-mail repetido, autodesativação, próprio papel, própria senha) aparecem de forma compreensível, e as ações proibidas na própria conta nem aparecem.
- [x] Testes com MSW cobrem criação, redefinição de senha, bloqueio por troca obrigatória, `403 PASSWORD_CHANGE_REQUIRED` e os erros principais.

## Implementação (2026-11-01)

- **API:** `usersApi` (`src/lib/api/users.ts`), `authApi.changePassword`, query keys `users.*` e os hooks pedidos em `hooks.ts`. Criação e redefinição recebem a `Idempotency-Key` de fora; os formulários geram uma chave nova a cada envio.
- **Cliente HTTP:** `403 PASSWORD_CHANGE_REQUIRED` em qualquer request chama `authTokenStore.setPasswordChangeRequiredHandler`; o `RequireAuth` marca a troca pendente no cache de `/auth/me` e leva à tela de troca. `changePassword` não usa a renovação automática: `401 INVALID_CREDENTIALS` vira mensagem; só um access token vencido renova e repete uma vez.
- **Rotas:** `/trocar-senha` (`src/pages/TrocarSenha.tsx`) fica fora do `AppShell`. Com `mustChangePassword`, o `RequireAuth` redireciona qualquer rota privada para ela e não renderiza as outras telas, então nenhuma query delas dispara. Na troca obrigatória só há "Sair"; na voluntária, "Cancelar". Ao concluir, o cache é limpo e o login mostra "Senha alterada. Entre com a nova senha."
- **Configurações:** a página virou `src/pages/Configuracoes/` com as abas "Vendedoras", "Comissão e prazos" (ainda no banco local, até a FRONT_14) e "Usuários". A aba tem busca, filtros de papel e status, paginação e a marca "Troca de senha pendente". Desativar e mudar papel pedem confirmação; o diálogo de redefinição avisa que a pessoa será deslogada. Na própria conta só aparece a edição de nome e e-mail.
- **Staff:** a rota segue restrita a owner; quem acessa direto vê o aviso "Esta área é restrita a sócios(as) da loja." e volta ao início. O login mostra mensagem própria para `USER_INACTIVE` e `RATE_LIMITED`.
- **Testes:** `TrocarSenha.test.tsx`, `Configuracoes/UsersTab.test.tsx` e casos novos em `auth.test.ts` e `http.test.ts`. O `src/test/setup.ts` ganhou um shim de `fetch` para o jsdom: o `Request` do Node recusa o `AbortSignal` do jsdom, o que impedia testes de componente com MSW.
- **Não verificado:** contra o backend real e em navegador. Fica para os E2E da FRONT_18. A confirmação de mudança de papel ganhou teste na FRONT_13, quando o `setup.ts` passou a ter os polyfills que o `Select` do Radix precisa no jsdom.

## Observações de dependência

Depende de FRONT_11, FRONT_12, FRONT_22 e BACK_19 (pronta). Fica na mesma página de Configurações da FRONT_14.
