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

- [ ] Busca por código/tipo, filtro de status, ordenação e paginação usam os parâmetros da API.
- [ ] Recebimento cria uma só peça (inclusive no retry) e mostra o código e o status devolvidos pelo servidor.
- [ ] Etiquetagem seleciona a peça no banho, envia a foto, liga o `photoId` e não cria duplicata.
- [ ] Detalhe mostra os dados e a timeline do backend em ordem estável, com a foto por `photoUrl`.
- [ ] Erros `400`/`404`/`409`/`413`/`422`/`429`, falha de rede e upload falho são recuperáveis e não mostram falso sucesso.
- [ ] Testes com MSW cobrem busca, recebimento, upload e etiquetagem.

## Observações de dependência

Depende de FRONT_11 e dos contratos BACK_05/BACK_07 (prontos). O card de valor total usa a BACK_26 (pronta). Os campos de custo ficam para a FRONT_24. Pode ser feita em paralelo a FRONT_14, FRONT_15 e FRONT_16.
