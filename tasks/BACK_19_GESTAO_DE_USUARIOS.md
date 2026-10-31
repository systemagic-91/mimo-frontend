# BACK_19 - Gestão de usuários e troca obrigatória de senha

**Prioridade:** 19 - bloqueia o uso real: hoje não existe forma de criar usuários staff.

## Contexto Motivador

O único usuário possível hoje é o owner criado pelas variáveis `BOOTSTRAP_OWNER_*`. Não há rota para cadastrar funcionários (staff), outros owners, desativar contas ou redefinir uma senha esquecida.

**Decisão de 2026-10-30:** menos de 15 pessoas vão usar o sistema, com um ou mais owners. O owner cadastra os usuários e define uma senha temporária, entregue pessoalmente; o sistema obriga a troca no primeiro login. Não haverá convite nem recuperação por e-mail.

## Objetivo

Permitir que owners administrem as contas da loja com segurança e sem depender de e-mail.

## Proposta de solução

- Migration: `users.must_change_password BOOLEAN NOT NULL DEFAULT false`.
- Endpoints exclusivos de owner, com `Idempotency-Key` nas mutations:
  - `GET /users`, paginado, com filtros `q`, `role` e `active`;
  - `POST /users` com `{ name, email, role, temporaryPassword }`: cria o usuário ativo, com `mustChangePassword = true`;
  - `PATCH /users/{id}` com `{ name?, role?, active? }`;
  - `POST /users/{id}/reset-password` com `{ temporaryPassword }`.
- `UserResponse` ganha `mustChangePassword`. Isso vale para login, `/auth/me` e `/users`.
- Enquanto `mustChangePassword` for `true`, o usuário só acessa `GET /auth/me`, `POST /auth/change-password` e `POST /auth/logout`; o resto retorna `403 PASSWORD_CHANGE_REQUIRED`. A checagem pode ficar no `AuthTokenValidator` ou num filtro, porque o validator já busca o usuário a cada request.
- `POST /auth/change-password` zera `mustChangePassword`.
- Desativar, mudar o papel ou redefinir a senha de alguém incrementa `authVersion` e revoga os refresh tokens dessa pessoa, que é deslogada na hora.
- Regras de proteção:
  - nunca deixar a loja sem owner ativo: `422 LAST_OWNER`;
  - o owner não pode desativar a si mesmo: `422 CANNOT_DEACTIVATE_SELF`;
  - e-mail único, sem diferenciar maiúsculas: `409 EMAIL_ALREADY_USED`.
- Auditoria: `USER_CREATED`, `USER_UPDATED` e `USER_PASSWORD_RESET`, sem gravar senha nem hash.

## Pontos de atenção

- A senha temporária é **digitada pelo owner**, com 12 a 72 caracteres, e nunca é devolvida pela API. Se fosse gerada pelo servidor e devolvida, ficaria salva em texto puro no corpo de resposta guardado pela idempotência.
- O bootstrap de owner continua existindo, só para criar o primeiro owner.
- Staff que tenta acessar `/users` recebe `403`.
- Dois owners desativando um ao outro ao mesmo tempo: travar as linhas (`FOR UPDATE`) antes de contar os owners ativos.

## Decisões (2026-10-31)

1. **Depois da troca obrigatória, a pessoa entra de novo.** `POST /auth/change-password` continua respondendo `204` e revogando todas as sessões, inclusive a atual; o frontend volta para o login.
2. **O owner não mexe no próprio papel nem na própria senha pela gestão de usuários.** Mudar o próprio papel retorna `422 CANNOT_CHANGE_OWN_ROLE` e redefinir a própria senha retorna `422 CANNOT_RESET_OWN_PASSWORD` (para isso existe a troca de senha). Editar o próprio nome e e-mail é permitido.
3. **O e-mail pode ser editado** no `PATCH /users/{id}`, já que não existe exclusão de usuário. Mudar nome ou e-mail não desloga a pessoa.
4. **Bloqueio pelo claim do JWT.** O access token leva `mustChangePassword`; como toda mudança desse campo incrementa o `authVersion`, um token com o valor antigo deixa de valer. O filtro `PasswordChangeRequiredFilter` lê o claim, sem consulta extra ao banco.
5. **`reset-password` responde `200` com o usuário atualizado**, no mesmo padrão do `PATCH`, em vez do `204` previsto antes.
6. **A senha temporária fica fora do fingerprint de idempotência.** O fingerprint é um SHA-256 sem sal guardado no banco; repetir a chave com outra senha devolve a primeira resposta em vez de `409`.

## Critérios de aceite

- [x] Owner cria, edita, desativa, reativa e redefine a senha de usuários.
- [x] Usuário novo ou com senha redefinida só consegue trocar a senha até concluir a troca.
- [x] Desativar, trocar o papel ou redefinir a senha desloga a pessoa imediatamente.
- [x] Não é possível ficar sem owner ativo nem desativar a própria conta.
- [x] Nenhuma senha aparece em resposta, log ou auditoria.
- [x] Testes unitários (JUnit 5 + Mockito) cobrem as regras de último owner, autodesativação, e-mail duplicado e o bloqueio por `mustChangePassword`.

## Observações de dependência

Depende de BACK_03 (autenticação). FRONT_20 consome estes endpoints. Deve estar pronta antes do primeiro uso real do sistema.
