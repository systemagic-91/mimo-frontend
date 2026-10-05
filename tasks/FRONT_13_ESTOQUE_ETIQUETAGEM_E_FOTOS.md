# FRONT_13 - Estoque, etiquetagem e fotos

**Prioridade:** 13 - entrega persistência real para as peças.

## Contexto Motivador

`Estoque.tsx` filtra uma lista inteira local e cria peça sincronamente; `Etiquetagem.tsx` gera código local, converte foto em base64 e cria uma nova peça em vez de selecionar/atualizar a peça que retornou do banho. A timeline também depende de dados locais.

## Objetivo

Migrar inventário, detalhe, busca, recebimento e etiquetagem para os endpoints backend sem duplicar a mesma peça física.

## Proposta de solução

- Migrar listagem para `GET /pieces` com busca/status/paginação server-side e query total filtrado quando necessário.
- Migrar drawer para `GET /pieces/{id}` e `/events`; tratar carregamento/erro e URL de foto.
- Migrar recebimento para `POST /pieces/receive`, converter reais para centavos e atualizar cache após sucesso.
- Ajustar fluxo de etiquetagem: listar peças no banho, selecionar origem/código, enviar foto em `multipart/form-data`, receber `photoUrl` e chamar `POST /pieces/label` com `sourcePieceId`.
- Remover geração autoritativa de código local; exibir preview não garantido ou código final devolvido pelo servidor.
- Aplicar loading, disabled, retry, erro de conflito e feedback de sucesso; evitar sucesso otimista antes da resposta.

## Pontos de atenção

- A decisão de negócio recomendada é conservar o código da peça existente ao etiquetar retorno do banho; alinhar com BACK_05.
- Não manter base64 em `Piece.photo` ou no cache; limitar tamanho antes do upload e limpar campo de arquivo após sucesso.
- Query paginada exige adaptar contagem/valor exibidos; somar apenas os itens da página não equivale ao total filtrado.
- IDs serão UUID, substituindo assumptions atuais de strings seed simples.

## Critérios de aceite

- [ ] Busca por código/tipo, filtro status, ordenação e paginação refletem parâmetros da API.
- [ ] Recebimento cria uma só peça e mostra código/status devolvidos pelo servidor.
- [ ] Etiquetagem seleciona origem em banho, upload persiste URL e não cria duplicata.
- [ ] Detalhe mostra dados/timeline do backend em ordem estável.
- [ ] Erros `409`/`422`, rede e upload falho são recuperáveis e não mostram falso sucesso.
- [ ] Testes com MSW cobrem busca, recebimento, upload e etiquetagem.

## Observações de dependência

Depende de FRONT_11 e contratos BACK_05/BACK_07. Pode ser implementada em paralelo a FRONT_12, FRONT_14, FRONT_15 e FRONT_16; integração de origem/foto exige endpoints correspondentes.
