# FRONT_20 - Gestão de usuários e troca obrigatória de senha

**Prioridade:** 20 - interface da BACK_19.

## Contexto Motivador

O backend passa a permitir que o owner cadastre usuários com senha temporária e obrigue a troca no primeiro login (BACK_19). O frontend não tem tela de usuários nem de troca de senha.

## Objetivo

Dar ao owner uma tela para administrar as contas e garantir que quem entra com senha temporária a troque antes de usar o sistema.

## Proposta de solução

- Hooks React Query: `useUsersQuery`, `useCreateUserMutation`, `useUpdateUserMutation`, `useResetUserPasswordMutation` e `useChangePasswordMutation`, com query keys `users.*`.
- Aba "Usuários" em Configurações, visível só para owner:
  - lista com nome, e-mail, papel, status e a marca "troca de senha pendente";
  - criar usuário (nome, e-mail, papel, senha temporária);
  - editar nome e papel, ativar/desativar e redefinir a senha.
- Tela `/trocar-senha` (senha atual, nova senha e confirmação). Quando `user.mustChangePassword` for `true`, os guards redirecionam para ela em qualquer rota privada; ao concluir, a sessão é atualizada e a pessoa segue para a home.
- Mostrar os erros da API junto ao campo ou em mensagens claras: `EMAIL_ALREADY_USED`, `LAST_OWNER`, `CANNOT_DEACTIVATE_SELF` e `PASSWORD_CHANGE_REQUIRED`.
- Acrescentar a opção "Trocar senha" no menu do usuário, para qualquer pessoa trocar a própria senha quando quiser.

## Pontos de atenção

- Não guardar a senha temporária em estado global, cache nem `localStorage`; limpar o formulário após o envio.
- Confirmar antes de desativar alguém ou redefinir uma senha.
- Um `403 PASSWORD_CHANGE_REQUIRED` vindo de qualquer request deve levar à tela de troca, mesmo que o guard ainda não saiba.

## Critérios de aceite

- [ ] Owner lista, cria, edita, desativa, reativa e redefine a senha de usuários.
- [ ] Staff não vê a aba e recebe UX adequada se acessar a rota diretamente.
- [ ] Usuário com `mustChangePassword` não consegue sair da tela de troca até concluir.
- [ ] Erros de regra (último owner, e-mail repetido, autodesativação) aparecem de forma compreensível.
- [ ] Testes com MSW cobrem criação, redefinição de senha, bloqueio por troca obrigatória e os erros principais.

## Observações de dependência

Depende de FRONT_11, FRONT_12 e BACK_19. Pode ser feita com MSW antes do backend ficar pronto.
