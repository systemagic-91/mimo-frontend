# Sessão, tokens e cookies: o que vamos mudar e por quê

Este documento explica, sem jargão, como o login funciona hoje, qual é o risco e o que as tasks **BACK_21** e **FRONT_22** vão fazer.

---

## 1. Como o login funciona hoje

Quando alguém faz login, o backend devolve **dois "crachás"** (chamados de _tokens_):

| Crachá            | Para que serve                                              | Validade   |
| ----------------- | ----------------------------------------------------------- | ---------- |
| **Access token**  | Mostrado em toda chamada à API, como um crachá de entrada.  | 15 minutos |
| **Refresh token** | Usado só para pegar um access token novo quando o atual vence. | 30 dias    |

O access token dura pouco de propósito: se alguém o roubar, ele vence logo. O refresh token dura muito para a pessoa não precisar digitar a senha toda hora. **É por isso que ele é o mais valioso.**

Hoje o front guarda:

- o **access token** na memória da página (some ao recarregar). Isso está ótimo;
- o **refresh token** no `sessionStorage` do navegador. **Aqui está o problema.**

## 2. Qual é o problema

O `sessionStorage` pode ser lido por **qualquer código JavaScript** que rode na página.

Imagine que, um dia, entre um código malicioso no site: um pacote npm comprometido, um texto mal tratado que vira script... Esse tipo de ataque se chama **XSS**. O código pode ler o refresh token e mandá-lo para o atacante, que passa a ter acesso ao sistema por até 30 dias, sem precisar da senha.

## 3. A solução: guardar o refresh token num cookie "HttpOnly"

Um **cookie** é um dado que o navegador guarda e envia sozinho para o servidor. Um cookie marcado como **`HttpOnly`** tem uma característica especial: **o JavaScript não consegue lê-lo**. Só o navegador o vê, e só o envia ao servidor.

Então, mesmo que um código malicioso rode na página, ele **não consegue roubar** o refresh token.

O cookie vai ter estas "etiquetas" de segurança:

| Etiqueta               | O que significa em português                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `HttpOnly`             | O JavaScript não lê o cookie.                                                                |
| `Secure`               | O cookie só viaja em conexão segura (HTTPS).                                                 |
| `SameSite=Strict`      | O cookie só é enviado quando o pedido vem **do nosso próprio site**, nunca de outro site.    |
| `Path=/api/v1/auth`    | O cookie só é enviado para as rotas de login/renovação, e não em toda chamada.               |
| `Max-Age`              | Quanto tempo o cookie vive (igual à validade do token: 30 dias).                             |

O access token continua como está: na memória da página.

## 4. O detalhe da Vercel e do Railway

O front vai ficar na **Vercel** (ex.: `mimo.vercel.app`) e o backend no **Railway** (ex.: `mimo-api.up.railway.app`). São **dois endereços diferentes**.

Para o navegador, um cookie que vem de um endereço diferente do site que você está usando é um **"cookie de terceiros"**. Hoje, vários navegadores **bloqueiam** esse tipo de cookie, sendo o **Safari** o mais rígido. Resultado: no Safari, o login "esqueceria" a pessoa a cada recarregamento.

### A solução: a Vercel faz de "intermediária" (proxy)

Em vez de o navegador falar direto com o Railway, ele fala **só com a Vercel**:

```
Navegador ──► mimo.vercel.app/api/...  ──(a Vercel repassa)──►  mimo-api.up.railway.app/api/...
```

Para o navegador, tudo vem de `mimo.vercel.app`, então o cookie é **"do próprio site"** e funciona em qualquer navegador. Isso se configura num arquivo `vercel.json`, de graça, sem comprar domínio.

No desenvolvimento local, fazemos a mesma coisa com o Vite: o front em `localhost:5173` repassa `/api` para o backend em `localhost:8080`. Assim, o comportamento local e o de produção ficam iguais.

Bônus: como o navegador só fala com um endereço, deixamos de depender de configuração de CORS, uma fonte comum de erros.

## 5. E o tal do "CSRF"?

**CSRF** é quando um site malicioso tenta fazer o _seu navegador_ mandar um pedido para o _nosso_ sistema, aproveitando que o navegador envia cookies sozinho.

Nossa proteção tem duas camadas:

1. **`SameSite=Strict`:** o navegador simplesmente **não envia** o cookie quando o pedido nasce em outro site.
2. **Conferência de origem:** o backend olha o cabeçalho `Origin` (que diz de qual site veio o pedido) e recusa o pedido se não for o nosso.

Além disso, mesmo que um atacante conseguisse disparar uma renovação, a resposta (com o access token novo) **não pode ser lida** por outro site. O navegador bloqueia isso.

## 6. Um ajuste extra no backend: o IP real do usuário

O backend limita as tentativas de login a 5 por IP a cada 15 minutos, para dificultar quem tenta adivinhar senhas. Só que, atrás da Vercel e do Railway, o backend enxerga o **IP do intermediário**, e não o do usuário. Sem ajuste, **todo mundo pareceria a mesma pessoa**, e 5 erros de qualquer usuário bloqueariam o login de todos.

A correção é uma linha de configuração (`server.forward-headers-strategy: framework`). Com ela, o backend lê o IP real que o intermediário informa no cabeçalho `X-Forwarded-For`.

## 7. O que muda na prática

**Para quem usa o sistema:**

- Nada visível no login.
- A sessão passa a sobreviver a fechar e reabrir a aba (antes, fechar a aba deslogava). Ela continua expirando em 30 dias sem uso, ou no logout.

**No backend (BACK_21):**

- Login e renovação gravam o refresh token no cookie, e não mais no corpo da resposta.
- Renovação e logout leem o token do cookie.
- Logout apaga o cookie.
- Os pedidos de renovação e logout têm a origem conferida.
- Ativar o IP real atrás de proxy.

**No frontend (FRONT_22):**

- Apagar todo uso de `sessionStorage` para tokens.
- Criar o `vercel.json` (proxy + rotas do React).
- Configurar o proxy no Vite.
- Usar `VITE_API_BASE_URL=/api/v1`.

**As duas tasks precisam ir para o ar juntas**, senão o front espera o token num lugar e o back manda em outro.

## 8. Perguntas rápidas

**"Não seria mais simples deixar como está?"**
Para um projeto acadêmico, funcionaria. Mas o risco é real e a mudança é pequena, já que a autenticação acabou de ser feita.

**"Preciso comprar um domínio?"**
Não. O proxy da Vercel resolve sem domínio próprio. Se no futuro vocês tiverem um domínio (ex.: `app.mimo.com.br` e `api.mimo.com.br`), também funciona.

**"E o access token? Ele também pode ser roubado?"**
Em tese, sim, porque está na memória da página. Mas ele vale só 15 minutos e some ao recarregar. Esse é o equilíbrio recomendado pelo mercado.

**"Como testar no meu computador?"**
Do mesmo jeito de hoje: suba o backend (`gradlew bootRun`) e o front (`npm run dev`) e acesse `http://localhost:5173`. O proxy do Vite cuida do resto.
