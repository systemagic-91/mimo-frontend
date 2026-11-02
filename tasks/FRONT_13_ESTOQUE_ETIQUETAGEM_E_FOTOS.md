# FRONT_13 - Estoque, etiquetagem e fotos

**Prioridade:** 13 - entrega persistência real para as peças.

## Contexto Motivador

`Estoque.tsx` filtra uma lista inteira local e cria peça sincronamente; `Etiquetagem.tsx` gera código local, converte foto em base64 e cria uma nova peça em vez de atualizar a peça que retornou do banho. A timeline também depende de dados locais.

O backend (BACK_05 e BACK_07) está pronto, e o cliente também: `piecesApi` e os hooks `usePiecesQuery`, `usePieceQuery`, `usePieceEventsQuery`, `useReceivePieceMutation`, `useLabelPieceMutation` e `useUploadPiecePhotoMutation` já existem em `src/lib/api`. Falta ligar as telas a eles.

## Objetivo

Migrar inventário, detalhe, busca, recebimento e etiquetagem para os endpoints do backend, sem duplicar a mesma peça física.

## Decisões (2026-10-31)

1. **Valor total do estoque vem da API:** a BACK_26 adiciona `summary.totalValueCents` em `GET /pieces`, com a soma de todas as peças filtradas.

## Contrato da API (estado em 2026-10-31)

Detalhes nas seções 2 e 8 do `BACKEND_API_CONTRACT.md`. Todas as rotas aceitam owner e staff.

- `GET /pieces`:
  - query `q` (código ou tipo, até 120 caracteres), `status` (`PieceStage` em maiúsculas; usar `toBackendPieceStage`), `page` (base 1), `pageSize` (padrão 50, máximo 200) e `sort` (`campo,asc|desc`; campos `code`, `type`, `valueCents`, `status`, `currentLocation`, `createdAt`, `updatedAt`);
  - resposta `{ items, pagination: { page, pageSize, total, totalPages } }`;
  - e `summary.totalValueCents` (BACK_26, pronta): a soma do preço de **todas** as peças filtradas, não só da página. Tipo `PieceListResponse`.
- `GET /pieces/{id}` e `GET /pieces/{id}/events` (lista completa, em ordem crescente de `occurredAt`). Peça inexistente: `404 PIECE_NOT_FOUND`.
- `GET /pieces/next-code`: só uma **prévia** do próximo código; o código definitivo vem na resposta do recebimento.
- `POST /pieces/receive`:
  - corpo `{ type, valueCents, stage, note? }`;
  - `type` só pode ser `Brinco`, `Colar`, `Pulseira`, `Anel`, `Pingente` ou `Tornozeleira` (outro valor: `400 VALIDATION_ERROR`);
  - `stage` só pode ser `FABRICA` ou `BANHO_OURO` (outro: `422 INVALID_INITIAL_STAGE`);
  - resposta `201 { piece, events }`. Para `BANHO_OURO` vêm dois eventos (`FABRICA` e `BANHO_OURO`).
- `POST /uploads/piece-photo`:
  - `multipart/form-data` com o campo `file`;
  - JPEG, PNG ou WebP (identificados pelo conteúdo), até 1 MB e 2000×2000 px;
  - limite de 30 envios por minuto por usuário;
  - resposta `201 { photoId, photoUrl, width, height }`;
  - erros: `400 VALIDATION_ERROR` em `fields.file`, `413 PHOTO_TOO_LARGE` e `429 RATE_LIMITED`.
- `POST /pieces/label`:
  - corpo `{ sourcePieceId, type, valueCents, photoId?, note?, backFromBath: true }`;
  - atualiza a peça em `BANHO_OURO` **mantendo o código**, muda para `ETIQUETADA`/`Estoque` e devolve `200 PieceResponse`;
  - erros: `409 INVALID_PIECE_TRANSITION` (peça não está no banho ou `backFromBath` falso), `404 PIECE_NOT_FOUND` e `404 PHOTO_NOT_FOUND` (nesse caso a peça não muda).
- `GET /photos/{id}`: pública e com cache eterno. Usar o `photoUrl` direto no `<img>`, sem token. O caminho relativo `/api/v1/...` funciona pelo proxy do Vite e da Vercel.
- Toda mutation recebe `Idempotency-Key` automaticamente do `apiRequest`.

## Proposta de solução

- **Lista do estoque:**
  - usar `usePiecesQuery` com busca (com debounce), filtro de status, ordenação e paginação, todos enviados à API;
  - card de resumo com a quantidade (`pagination.total`) e o **valor total** (`summary.totalValueCents`, da BACK_26). Nunca somar os itens da página.
- **Detalhe (drawer):** `usePieceQuery` + `usePieceEventsQuery`, com estados de carregamento e erro e foto por `photoUrl`.
- **Recebimento:**
  - `useReceivePieceMutation` com `moneyToCents`;
  - select de tipo limitado aos seis tipos aceitos;
  - mostrar o código devolvido em `piece.code` (o de `next-code` aparece só como prévia).
- **Etiquetagem:**
  - listar as peças de origem com `usePiecesQuery({ status: "banho_ouro" })`;
  - ao escolher a peça, preencher tipo e valor a partir dela;
  - reduzir a foto no navegador (como hoje, para cerca de 320 px) e enviá-la com `useUploadPiecePhotoMutation`;
  - guardar só `photoId`/`photoUrl` e chamar `useLabelPieceMutation` com `sourcePieceId` e `photoId`;
  - se a etiquetagem falhar depois do upload, a foto fica sem uso e o backend a apaga na limpeza diária de fotos órfãs. O front não precisa apagar nada.
- **Repetição segura:** gerar a `Idempotency-Key` uma vez por envio do formulário e reutilizá-la no "tentar de novo". Hoje cada chamada gera uma chave nova: um retry depois de uma falha de rede pode criar a peça duas vezes se a primeira tentativa tiver chegado ao servidor. Acrescentar um parâmetro de chave em `piecesApi.receive`/`label`/`uploadPhoto`, como já existe em `consignmentsApi.create`.
- Remover a geração de código e o base64 locais.
- Aplicar loading, disabled, retry, mensagens de erro por `code` e feedback de sucesso só depois da resposta.

## Pontos de atenção

- A etiquetagem atualiza a peça existente e mantém o código (decisão implementada na BACK_05).
- Não manter base64 em `Piece.photo` nem no cache. Validar tamanho e formato antes do upload e limpar o campo de arquivo depois do sucesso.
- Com paginação, somar só os itens da página não equivale ao total filtrado.
- IDs são UUID, e não as strings simples do seed atual.
- Os campos de custo (`factoryCostCents`, `bathCostCents`, `totalCostCents`) ficam para a FRONT_24. Para staff eles vêm sempre `null`.
- `403 PASSWORD_CHANGE_REQUIRED` e `401` são tratados de forma global (FRONT_12/FRONT_20), não por tela.

## Critérios de aceite

- [x] Busca por código/tipo, filtro de status, ordenação e paginação usam os parâmetros da API.
- [x] Recebimento cria uma só peça (inclusive no retry) e mostra o código e o status devolvidos pelo servidor.
- [x] Etiquetagem seleciona a peça no banho, envia a foto, liga o `photoId` e não cria duplicata.
- [x] Detalhe mostra os dados e a timeline do backend em ordem estável, com a foto por `photoUrl`.
- [x] Erros `400`/`404`/`409`/`413`/`422`/`429`, falha de rede e upload falho são recuperáveis e não mostram falso sucesso.
- [x] Testes com MSW cobrem busca, recebimento, upload e etiquetagem.

## Implementação (2026-11-01)

- **Idempotência:** `piecesApi.receive`, `label` e `uploadPhoto` recebem a `Idempotency-Key` de quem chama, como `consignmentsApi.create`. O hook `useIdempotencyKey` (`src/hooks/`) devolve a mesma chave enquanto o conteúdo enviado for igual: o "Tentar de novo" depois de uma falha de rede reaproveita a chave e não cria a peça (nem a foto) duas vezes. Se o conteúdo mudar, gera outra; depois do sucesso, descarta.
- **Estoque** (`src/pages/Estoque/`):
  - busca com debounce, filtro de status, ordenação pelos cabeçalhos (com desempate por `code,asc`) e paginação de 50, tudo enviado à API;
  - o resumo usa `pagination.total` e `summary.totalValueCents`, nunca a soma da página;
  - o recebimento mostra o `next-code` só como prévia; depois de salvar, avisa com o código e o status devolvidos e abre o detalhe da peça criada;
  - valor digitado como "84,90", convertido com `moneyToCents`.
- **Detalhe** (`piece-detail-sheet.tsx`): recebe `pieceId` e lê `GET /pieces/{id}` e `/events`, com carregamento, erro e "Tentar novamente". A timeline ordena por `occurredAt` com desempate por `id`, como o backend. A foto vem de `photoUrl`.
- **Etiquetagem** (`src/pages/Etiquetagem/`), em quatro passos:
  1. escolher a peça em `BANHO_OURO` (com busca e paginação); o tipo e o valor vêm dela;
  2. foto validada, reduzida para 320 px em JPEG no navegador (object URL, sem base64) e enviada na hora; falha de upload mostra a mensagem e "Tentar de novo" com o mesmo arquivo e a mesma chave;
  3. dados;
  4. confirmação com `sourcePieceId` e `photoId`.
  - `409 INVALID_PIECE_TRANSITION` e `404 PIECE_NOT_FOUND` levam a "Escolher outra peça" (a lista é recarregada); `404 PHOTO_NOT_FOUND` leva a "Enviar a foto de novo".
- **Dashboard:** a busca por código do "Ciclo da peça" consulta a API e abre o detalhe novo. Os contadores do Dashboard continuam no banco local até a FRONT_16.
- **Compartilhado:** `PaginationBar` (`src/components/`), `useDebouncedValue` (`src/hooks/`, também usado na aba Usuários) e as mensagens por `code` em `src/lib/piece-errors.ts`.
- **Testes:** `Estoque/Estoque.test.tsx` e `Etiquetagem/Etiquetagem.test.tsx`, com fixtures em `src/test/fixtures.ts`. O `setup.ts` ganhou polyfills para o `Select` do Radix no jsdom e passou a descartar os toasts ao fim de cada teste (o estado do `sonner` é global e vazava entre testes). Com o `Select` funcionando, a confirmação de mudança de papel da FRONT_20 também ganhou teste.
- **Limitações:**
  - no jsdom não há canvas, então a redução da foto é simulada nos testes; a validação de formato roda de verdade;
  - o corpo multipart do upload não é inspecionado nos testes (o `FormData` do jsdom não passa pelo `Request` do Node), só a chamada e a chave;
  - nada foi verificado contra o backend real nem em navegador (fica para os E2E da FRONT_18);
  - como Consignação, Dashboard e Relatórios ainda leem o banco local, as peças criadas pela API ainda não aparecem nelas até as FRONT_15 e 16.

## Observações de dependência

Depende de FRONT_11 e dos contratos BACK_05/BACK_07 (prontos). O card de valor total usa a BACK_26 (pronta). Os campos de custo ficam para a FRONT_24. Pode ser feita em paralelo a FRONT_14, FRONT_15 e FRONT_16.
