# BACK_05 - Gestão de peças e histórico

**Prioridade:** 5 - primeiro fluxo central de estoque.

## Contexto Motivador

Estoque, rastreador do dashboard e etiquetagem usam arrays locais e geram códigos no browser. `confirmLabeling` cria uma peça nova mesmo quando existe uma peça em banho, o que pode duplicar o mesmo item físico. Os eventos não têm ator autenticado.

## Objetivo

Implementar consulta e mutações de peças no servidor, com geração de códigos atômica, estados válidos e timeline imutável.

## Proposta de solução

- Implementar `GET /pieces`, `GET /pieces/{id}`, `GET /pieces/{id}/events`, `GET /pieces/next-code` (prévia) e `POST /pieces/receive`.
- Implementar `POST /pieces/label` com `sourcePieceId`; política recomendada: atualizar a peça existente em `BANHO_OURO`, manter código e anexar evento `ETIQUETADA`.
- Consultas devem suportar busca por código/tipo, status, paginação e ordenação segura; detalhamento retorna localização, foto e observações.
- Gerar código `LU-XXXX` em sequência transacional PostgreSQL; não confiar no endpoint de preview para persistir.
- Validar stage inicial, valor positivo, tipo permitido e transições; gravar `PieceEvent` com ator e instante do servidor na mesma transação.
- Adaptar status/location ao domínio e criar testes para recebimento direto na fábrica, no banho, etiquetagem e retorno de consignação.

## Pontos de atenção

- O formulário de etiquetagem atual não seleciona qual peça existente voltou; será necessária mudança de UX para escolher/ler a peça em banho.
- `backFromBath=false` hoje permite um fluxo semanticamente inconsistente; definir se deve ser removido da API ou representar encaminhamento sem conclusão.
- A tela mostra preview de código que pode mudar sob concorrência; não usar esse preview como identificador.
- Eventos de devolução e reetiquetagem podem compartilhar timestamp, portanto ordenação deve ter desempate determinístico.

## Critérios de aceite

- [x] Código único é emitido mesmo com requisições simultâneas.
- [x] Receber peça cria registros/eventos esperados em uma transação.
- [x] Etiquetagem não duplica uma peça física e rejeita origem em estado inválido.
- [x] Busca, filtro, detalhe e timeline retornam os dados exigidos pelas telas.
- [x] Eventos preservam ator, data e histórico anterior; não há edição destrutiva.
- [x] Testes unitários e integração validam transitions inválidas e concorrência.

## Observações de dependência

Depende de BACK_01, BACK_02 e dos padrões de BACK_04. Pode ser desenvolvido em paralelo com BACK_06 (vendedoras/configurações) e BACK_07 (upload) após os DTOs compartilhados. FRONT_13 integra suas rotas.
