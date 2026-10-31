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

- [ ] Não existe seletor de idioma nem arquivos `en`/`zh-CN`; o app carrega em `pt-BR` em qualquer navegador.
- [ ] Todas as rotas e estados de erro, carregamento e vazio usam o `pt-BR.json`, inclusive os componentes compartilhados.
- [ ] Mensagens de erro da API vêm do mapeamento por `code`.
- [ ] Moeda e datas aparecem sempre no padrão brasileiro e no fuso da loja.
- [ ] O teste detecta chave ausente ou sem uso.
- [ ] Runtime e `CodeGuideline.md` concordam sobre a localização do arquivo de tradução.

## Observações de dependência

Não depende do backend; usa os códigos de erro e os enums já definidos no contrato. Fazer depois das telas migradas (FRONT_13 a 16, 20 e 24).
