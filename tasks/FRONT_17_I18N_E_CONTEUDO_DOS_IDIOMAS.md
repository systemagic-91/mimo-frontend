# FRONT_17 - Textos em português pelo i18n

**Prioridade:** 17 - organiza os textos da interface e remove os idiomas que não existem de verdade.

## Contexto Motivador

O projeto tem i18next, um seletor de idiomas (`src/components/language-switcher.tsx`) e arquivos `en`/`zh-CN` (em `src/locales` e `public/locales`) com textos de exemplo. O fallback configurado em `i18n.config.json` é inglês, mas todo o produto está escrito em português e nenhuma página usa `useTranslation`. Mudar o seletor não traduz nada.

## Decisões (2026-10-31)

1. **Só português (`pt-BR`).** Não haverá inglês nem chinês. O seletor de idioma e os arquivos `en`/`zh-CN` saem. O i18n continua configurado, com `pt-BR` como único idioma e fallback, para que um idioma novo possa ser acrescentado no futuro sem refatoração.
2. **Moeda e datas sempre no padrão brasileiro:** `R$ 1.234,56` e `dd/mm/aaaa`, com as datas no fuso da loja (`settings.timezone`).

## Objetivo

Deixar o i18n coerente com o produto: um único idioma real, sem seletor falso, e os textos da interface centralizados num arquivo `pt-BR`.

## Proposta de solução

- **Configuração:**
  - `i18n.config.json` com `fallbackLng: "pt-BR"` e só o idioma `pt-BR` (`dir: "ltr"`);
  - remover `en.json` e `zh-CN.json` e o `language-switcher` (e onde ele é usado);
  - garantir `<html lang="pt-BR">`.
- **Um só caminho para as traduções:** hoje existem `src/locales` (usado pelo runtime) e `public/locales` (descrito no `CodeGuideline.md`). Escolher um caminho canônico, apagar o outro e atualizar a diretriz.
- **Textos:** migrar os textos fixos das páginas e dos componentes compartilhados (navegação, estados de carregamento, vazio e erro, toasts, validações e `aria-label`) para `useTranslation()` com chaves planas (`keySeparator: false`).
- **Erros da API:** a resposta traz `code` estável e `detail` em português. Mapear as mensagens a partir do `code`:
  - lista completa na tabela "Resposta de erro" do `BACKEND_API_CONTRACT.md`, mais `PASSWORD_CHANGE_REQUIRED`, `EMAIL_ALREADY_USED`, `USER_NOT_FOUND` e `ORIGIN_NOT_ALLOWED`;
  - usar o `detail` só como último recurso.
- **Enums da API → rótulos:** estágios da peça, status da vendedora (`ativa`/`inativa`), status visual do lote (`em_dia`/`atrasada`/`quitada`), status do item (`COM_VENDEDORA`/`VENDIDA`/`DEVOLVIDA`), papéis (`owner`/`staff`) e prazos de pagamento (`30 dias` etc.).
- **Formatação centralizada:** um helper único para moeda, data e data/hora, sempre `pt-BR`, com datas no fuso da loja. Nenhuma tela formata por conta própria.
- **Verificação:** um teste que falha se uma chave usada no código não existir no `pt-BR.json`, ou se o arquivo tiver chaves sem uso.

## Pontos de atenção

- Esta task mexe no texto de quase todas as telas. Fazer **depois** das FRONT_13 a 16, 20 e 24, para não conflitar com as migrações.
- `i18n.config.json` continua sendo a única fonte da lista de idiomas; não duplicar em TypeScript.
- Não traduzir códigos e enums enviados à API; só os rótulos exibidos.

## Critérios de aceite

- [x] Não existe seletor de idioma nem arquivos `en`/`zh-CN`; o app carrega em `pt-BR` em qualquer navegador.
- [x] Todas as rotas e estados de erro, carregamento e vazio usam o `pt-BR.json`, inclusive os componentes compartilhados.
- [x] Mensagens de erro da API vêm do mapeamento por `code`.
- [x] Moeda e datas aparecem sempre no padrão brasileiro e no fuso da loja.
- [x] O teste detecta chave ausente ou sem uso.
- [x] Runtime e `CodeGuideline.md` concordam sobre a localização do arquivo de tradução.

## Implementação (2026-11-21)

- **Configuração:** `i18n.config.json` só com `pt-BR` (fallback e único idioma). Saíram o seletor (`language-switcher.tsx`), os arquivos `en`/`zh-CN` de `src/locales` e `public/locales` e as dependências `i18next-http-backend` e `i18next-browser-languagedetector`. O caminho canônico é `src/locales/{code}.json`, embutido no build; o runtime abre sempre no `fallbackLng` e mantém `<html lang="pt-BR">`. O `CodeGuideline.md` foi atualizado.
- **Textos:** todas as telas e componentes compartilhados usam `useTranslation()` com chaves planas (`keySeparator: false`), inclusive `aria-label`, toasts, placeholders, estados de carregamento/vazio/erro e os cabeçalhos do CSV. Fora de componentes, `i18n.t`. Plurais com `_zero`/`_one`/`_other`.
- **Erros da API** (`src/lib/api-errors.ts`): mapeamento central por `code` para todos os códigos da tabela do contrato, mais `PASSWORD_CHANGE_REQUIRED`, `EMAIL_ALREADY_USED`, `USER_NOT_FOUND`, `ORIGIN_NOT_ALLOWED` e os do cliente HTTP (`NETWORK_ERROR`, `REQUEST_TIMEOUT`, `INVALID_RESPONSE`, `HTTP_ERROR`). Os módulos de cada área (`piece-errors`, `consignment-errors`, `report-errors`, `admin-errors`, `user-errors`, login e troca de senha) só trocam o texto de alguns códigos e campos. O `detail` do backend é o último recurso, e o corpo de uma resposta de erro sem JSON nunca vai para a tela.
- **Enums → rótulos** (`src/lib/status.ts`): estágios, papéis, status da vendedora e do lote leem o `pt-BR.json` (getters, então os pontos de uso não mudaram). Status do item e prazos ("30 dias") também vêm do arquivo.
- **Formatação** (`src/lib/format.ts`): `formatCents`, `formatDate`, `formatDateTime`, `formatLocalDate`, `formatLongDate`, `formatRelativeDays` e `formatList`, sempre em pt-BR e com datas no fuso da loja. As telas que formatavam data no fuso do navegador (detalhe da peça, linha do tempo, Estoque, Dashboard) passaram a usar `useStoreTimezone`.
- **Verificação** (`src/i18n/keys.test.ts`): falha se uma chave usada em `t()` ou citada num mapa de rótulos não existir no `pt-BR.json`, se o arquivo tiver chave sem uso ou se um plural não tiver `_zero`. Testes novos também em `format.test.ts` e `api-errors.test.ts`.
- **Limitações:** as mensagens técnicas internas (exceções de programação em `mappers.ts`, o `console.error` da página 404 e os títulos padrão do `ApiError`) continuam no código, porque não chegam à tela. Não foi aberto em navegador real.

## Observações de dependência

Não depende do backend; usa os códigos de erro e os enums já definidos no contrato. Fazer depois das telas migradas (FRONT_13 a 16, 20 e 24).
