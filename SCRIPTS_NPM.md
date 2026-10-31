# Ajustes nos scripts do `package.json`

Este documento explica, de forma simples, o que mudou nos comandos do projeto e por quê.

## Resumo rápido

| Comando             | Antes                                         | Agora                                                  |
| ------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `npm run build`     | Não funcionava no Windows                     | Funciona em Windows, Mac e Linux                       |
| `npm run check`     | Dependia do `pnpm` e não verificava os tipos  | Usa só `npm` e verifica os tipos de verdade            |
| `npm run typecheck` | Não existia                                   | Novo: verifica os tipos do TypeScript                  |
| `npm run pInstall`  | Rodava `pnpm install`                         | Removido: use `npm install`                            |

## 1. O `build` não funcionava no Windows

O comando era:

```
NODE_ENV=development vite build --mode development
```

Esse jeito de escrever, `NOME=valor comando`, define uma variável de ambiente
antes de rodar o comando. Ele funciona no terminal do Mac e do Linux, mas o
Windows (PowerShell e CMD) não entende essa sintaxe e dá erro.

**O que fizemos:** instalamos uma ferramenta pequena chamada `cross-env`, feita
exatamente para isso. Ela define a variável do jeito certo em qualquer sistema:

```
cross-env NODE_ENV=development vite build --mode development
```

O resultado do build continua o mesmo de antes; só mudou a forma de rodar.

## 2. O projeto misturava `npm` e `pnpm`

`npm` e `pnpm` são dois programas que instalam as bibliotecas do projeto. O
projeto usa o **npm**: tem o arquivo `package-lock.json`, que é do npm, e o
`README.md` manda rodar `npm install`. Mesmo assim, alguns scripts chamavam o
`pnpm`, e ele estava até listado como dependência do projeto.

Misturar os dois é ruim porque cada um tem seu próprio arquivo de "trava" de
versões. Usando os dois, cada pessoa pode acabar com versões diferentes das
bibliotecas.

**O que fizemos:**

- O `check` agora usa `npm run ...` em vez de `pnpm ...`.
- Removemos o script `pInstall`, que só rodava `pnpm install`.
- Removemos o `pnpm` da lista de dependências.

Agora a regra é uma só: **use sempre `npm`**.

## 3. O `check` dizia "tudo certo" sem verificar os tipos

O `check` rodava `tsc --noEmit`, que é o verificador de tipos do TypeScript.
Só que, do jeito que o projeto está configurado, o arquivo `tsconfig.json`
principal não aponta para nenhum arquivo: ele só indica outros dois
(`tsconfig.app.json` para o código da aplicação e `tsconfig.node.json` para o
`vite.config.ts`). Resultado: o comando terminava sem erro, mas sem ter olhado
nenhum arquivo.

**O que fizemos:** criamos o script `typecheck`, que verifica de verdade as
duas configurações, e o `check` passou a usá-lo:

```
"typecheck": "tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json"
"check": "npm run lint && npm run typecheck"
```

## 4. Erros que estavam escondidos

Quando o `typecheck` passou a funcionar, apareceram 3 erros de tipo que já
existiam e ninguém via. Todos foram corrigidos sem mudar o comportamento do app:

- `src/lib/api/mappers.ts`: a função `toBackendPieceStage` devolvia "qualquer
  etapa", mesmo quando recebia só `fabrica` ou `banho_ouro`. Agora ela devolve
  exatamente a etapa correspondente, e o recebimento de peças (`pieces.ts`)
  aceita o valor sem erro.
- `src/pages/Estoque.tsx`: o campo "Onde chegou" guardava uma etapa qualquer,
  mas só pode ser `fabrica` ou `banho_ouro`. O tipo agora diz isso.
- `vite.config.ts`: o tipo `PluginOption` era importado de `vitest/config`, que
  não o exporta. Agora vem de `vite`, que é de onde ele vem de fato.

## Como usar no dia a dia

```
npm install         # instala as bibliotecas
npm run dev         # sobe o app em http://localhost:5173
npm test            # roda os testes
npm run check       # lint + verificação de tipos (rode antes de abrir PR)
npm run build:prod  # build de produção
```
