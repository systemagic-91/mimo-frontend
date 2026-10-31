# FRONT_17 - i18n e conteúdo dos idiomas

**Prioridade:** 17 - torna o seletor de idioma funcional em todas as telas.

## Contexto Motivador

Há i18next, seletor de idiomas e arquivos `en`/`zh-CN`, mas esses JSONs contêm apenas textos placeholder. As páginas não chamam `useTranslation`, e o fallback configurado é inglês enquanto todo o produto está escrito em português; assim, mudar o seletor não traduz a aplicação.

## Objetivo

Definir idiomas suportados reais e externalizar mensagens de telas, validações, estados, navegação e relatórios para o sistema i18n existente.

## Proposta de solução

- Confirmar idiomas de produto e idioma de fallback. Incluir português (`pt-BR`) se for o idioma operacional e decidir se inglês/chinês são realmente suportados.
- Consolidar a fonte de traduções: runtime atualmente importa `src/locales`, enquanto `CodeGuideline.md` descreve `public/locales`; escolher um caminho canônico e atualizar configuração/diretriz.
- Migrar texto hardcoded em páginas, componentes compartilhados, status e feedback para `useTranslation()` e chaves planas conforme `keySeparator: false`.
- Completar o mesmo conjunto de chaves e placeholders em todos os idiomas suportados; tratar plurais, datas, moeda, códigos e formatação regional corretamente.
- Criar verificador de igualdade de chaves de locale e testes para idioma detectado, fallback, direção e primeira renderização.
- Não traduzir códigos de domínio/enum enviados pela API; mapear código estável para rótulo localizado no frontend.
- Mensagens de erro da API: o backend responde `ProblemDetail` com `code` estável e `detail` **sempre em português**. A tradução deve partir do `code` (lista completa na tabela "Resposta de erro" do `BACKEND_API_CONTRACT.md`, mais `PASSWORD_CHANGE_REQUIRED`, `EMAIL_ALREADY_USED`, `USER_NOT_FOUND` e `ORIGIN_NOT_ALLOWED`), usando o `detail` só como último recurso. Os erros de campo (`fields`) também trazem texto em português: mapear pelo nome do campo e pelo `code`.
- Enums da API a mapear para rótulos: estágios da peça, status da vendedora (`ativa`/`inativa`), status visual do lote (`em_dia`/`atrasada`/`quitada`), status do item (`COM_VENDEDORA`/`VENDIDA`/`DEVOLVIDA`) e papéis (`owner`/`staff`).

## Pontos de atenção

- Esta tarefa altera muitas telas e pode conflitar com FRONT_12 a FRONT_16; executar depois da migração dos fluxos.
- `i18n.config.json` é descrito como fonte dos idiomas; não duplicar a lista em TypeScript.
- Definir se valores e datas usam locale escolhido pelo usuário ou locale fixo `pt-BR` para moeda operacional.
- Não deixar texto visível em português quando outro idioma estiver selecionado, incluindo toasts, empty/error states e aria-labels.

## Critérios de aceite

- [ ] Idiomas no seletor correspondem a traduções completas e ao fallback definido por produto.
- [ ] Todas as rotas e estados de erro/loading/empty usam tradução, inclusive strings compartilhadas.
- [ ] Mudança de idioma atualiza conteúdo sem reload e persiste conforme configuração existente.
- [ ] Script/teste detecta chave ausente ou extra entre arquivos de idioma.
- [ ] Datas, pluralizações e moeda são apresentados conforme regra regional documentada.
- [ ] Runtime e `CodeGuideline.md` concordam sobre a localização canônica dos arquivos.

## Observações de dependência

Não depende do backend; usa os códigos de erro e enums já definidos no contrato. Para evitar conflitos em componentes compartilhados, aguardar FRONT_12 a FRONT_16 ou coordenar divisão explícita de arquivos. Pode ser trabalhada em branch separada após congelar os fluxos.
