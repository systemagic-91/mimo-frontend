# FRONT_12 - Login, sessão e guards

**Prioridade:** 12 - substitui autenticação de demonstração.

## Contexto Motivador

`Login.tsx` chama login síncrono local, enquanto `DbUser.password` existe no browser e `RequireAuth`/`RequireRole` confiam em `localStorage`. Após reload, a sessão não é validada com o servidor e não há expiração nem refresh.

## Objetivo

Conectar login, restauração de sessão, renovação e logout à API, mantendo a navegação e os papéis corretos durante o carregamento.

## Proposta de solução

- Migrar tela para mutation `POST /auth/login` e obter estado do usuário via `GET /auth/me` no bootstrap.
- Implementar loading inicial de sessão para não redirecionar antes de verificar `/auth/me`.
- Migrar guards e `HomeRedirect` para estado remoto: owner vai ao dashboard; staff ao estoque; role checado pelo frontend para UX, sempre com autorização também no servidor.
- Implementar refresh seguro e logout remoto `POST /auth/logout`, limpar credenciais/cache e navegar ao login.
- Preservar rota original após login, incluindo pathname e query quando aplicável.
- Remover formulário/credenciais de demonstração (`DEMO_USERS`, senha fixa) da UI de produção.

## Pontos de atenção

- Coordenar token e cookies com BACK_03; não guardar refresh token persistente em localStorage.
- Trata-se de operações assíncronas: desabilitar submit durante envio, evitar duplo login e mostrar erros de credencial/rede diferenciados sem revelar existência do usuário.
- Evitar manter sessão antiga no cache após logout ou refresh inválido.
- Routes privadas devem manter fallback acessível enquanto a sessão carrega.

## Critérios de aceite

- [x] Login válido abre a rota original e sessão sobrevive ao reload via validação server-side.
- [x] Credenciais inválidas e falhas de rede mostram feedback e permitem nova tentativa.
- [x] Token expirado é renovado ou encerra sessão de forma previsível.
- [x] Logout revoga sessão no servidor, limpa cache e não permite voltar a área privada por navegação.
- [x] A navegação e guards refletem owner/staff e estados de carregamento.
- [x] Nenhuma senha de demo ou credencial seed é enviada ao bundle.

## Observações de dependência

Depende de FRONT_11 e dos endpoints de BACK_03; pode ser desenvolvido usando MSW antes do backend. A integração final deve validar o mecanismo de cookie/Bearer escolhido.
