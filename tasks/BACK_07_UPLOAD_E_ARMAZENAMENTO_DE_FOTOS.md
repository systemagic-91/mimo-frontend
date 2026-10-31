# BACK_07 - Upload e armazenamento de fotos

**Prioridade:** 7 - substitui base64 local por arquivo persistente.

## Contexto Motivador

A tela de etiquetagem converte a imagem para JPEG base64 e a persiste dentro do objeto da peça em `localStorage`. Isso aumenta o payload, não sincroniza dispositivos e não oferece validação ou política de acesso.

**Decisão de 2026-10-30:** o projeto é acadêmico e roda no Railway (backend + PostgreSQL), sem S3 ou outro storage externo. As fotos ficam **no próprio PostgreSQL**. O frontend já reduz cada imagem para 320 px, então cada foto tem de 20 a 40 KB; mil peças ocupam cerca de 30 MB.

## Objetivo

Guardar as fotos das peças no banco, com validação segura, e servi-las por uma URL estável usada pelo frontend.

## Proposta de solução

- Migration nova:
  - tabela `piece_photos` (`id UUID PK`, `content BYTEA NOT NULL`, `content_type`, `width`, `height`, `size_bytes`, `created_by FK users`, `created_at`);
  - em `pieces`, trocar `photo_url` por `photo_id UUID NULL FK -> piece_photos(id)`.
- `POST /api/v1/uploads/piece-photo` (owner/staff), `multipart/form-data` com o campo `file`, exigindo `Idempotency-Key`:
  - aceitar só JPEG, PNG ou WebP, identificados pela assinatura dos bytes;
  - limitar a 1 MB e a 2000×2000 px;
  - gerar um UUID aleatório como ID;
  - responder `201 { photoId, photoUrl: "/api/v1/photos/{photoId}", width, height }`.
- `GET /api/v1/photos/{photoId}` **público**, porque uma `<img>` não envia o token. A proteção vem do ID aleatório. Responde com:
  - o `Content-Type` salvo;
  - `Cache-Control: public, max-age=31536000, immutable`;
  - `X-Content-Type-Options: nosniff`.
- `POST /pieces/label` passa a receber `photoId` no lugar de `photoUrl`. O service confere se a foto existe e a liga à peça. `PieceResponse.photoUrl` passa a ser derivado do `photo_id`.
- Fotos órfãs (sem peça ligada há mais de 24 horas) são apagadas por um `@Scheduled` diário.
- Rate limit de upload por usuário, por exemplo 30 por minuto.
- Configurar `spring.servlet.multipart.max-file-size` e `max-request-size` coerentes com o limite de 1 MB.

## Pontos de atenção

- Ao integrar, o frontend precisa converter a imagem em `Blob`/`File`; não enviar string base64 no JSON (FRONT_13).
- SVG e formatos com script são proibidos; nunca confiar na extensão nem no `Content-Type` enviado pelo cliente.
- Não registrar o conteúdo binário nos logs.
- Carregar o `bytea` sob demanda: a listagem de peças nunca deve trazer o conteúdo da foto, só o `photo_id`.
- Fotos antigas substituídas por uma nova também viram órfãs e entram na limpeza.

## Critérios de aceite

- [x] Imagem válida é salva no PostgreSQL e retorna `photoId` e `photoUrl` reutilizáveis.
- [x] Arquivo inválido, com dimensões excessivas ou de tipo não suportado retorna `400` previsível; acima de 1 MB retorna `413 PHOTO_TOO_LARGE` (decisão de 2026-10-30).
- [x] `GET /photos/{id}` devolve a imagem com cache e `nosniff`; ID inexistente retorna `404`.
- [x] Etiquetagem liga a foto pelo `photoId`, sem base64 e sem URL externa na peça.
- [x] Fotos órfãs com mais de 24 horas são removidas.
- [x] Testes unitários (JUnit 5 + Mockito) cobrem a validação de assinatura, tamanho e dimensões, a ligação com a peça e a limpeza de órfãs.

## Observações de dependência

Depende de BACK_01, BACK_02 e BACK_05 (etiquetagem). FRONT_13 precisa deste endpoint. Pode ser feita em paralelo com BACK_08.
