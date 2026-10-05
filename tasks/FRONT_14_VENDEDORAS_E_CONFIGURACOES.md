# FRONT_14 - Vendedoras e configurações

**Prioridade:** 14 - migra administração da loja para persistência remota.

## Contexto Motivador

`Configuracoes.tsx` cadastra/edita/ativa vendedoras e persiste taxas/prazos localmente. As listas das telas de consignação também calculam agregados a partir do banco local; alteração de taxa atual pode refletir incorretamente sobre comissão histórica.

## Objetivo

Migrar CRUD de vendedoras e parâmetros da loja para a API, com validação, cache e estados de mutation.

## Proposta de solução

- Buscar lista e agregados com `GET /sellers`, editar com `POST /sellers`/`PATCH /sellers/{id}`.
- Migrar `GET /settings` e `PATCH /settings`; preencher formulário de dados do servidor e sincronizar após salvar.
- Mostrar validações da API junto aos campos; impedir salvamento inválido e prevenir submits duplicados.
- Atualizar tabela e telas dependentes após mutations via invalidation React Query.
- Restringir a rota por role para UX e tratar `403` recebido do backend.
- Adaptar moeda/percentuais/termos aos DTOs e não recalcular comissão histórica no frontend.

## Pontos de atenção

- Settings pode carregar após render da tela; não inicializar formulários permanentemente a partir do seed/localStorage.
- Ativar/inativar uma vendedora não deve apagar lotes existentes.
- Faixa de comissão e termos permitidos devem ser obtidos da configuração/contrato, não duplicados em constantes divergentes.
- Loading/erro de leitura e estado de salvamento precisam ser distintos.

## Critérios de aceite

- [ ] Lista, criação, edição e ativação/inativação persistem no backend e sobrevivem a reload/dispositivo.
- [ ] Faixas de comissão inválidas e parâmetros inválidos exibem erro de campo vindo da API.
- [ ] A tela lida com lista vazia, loading, erro/retry e `403`.
- [ ] Alterações atualizam os dados compartilhados sem refresh manual.
- [ ] Dados históricos e cálculo de comissão usam a resposta de API, não taxa atual aplicada a posteriori.
- [ ] Testes cobrem mutations e invalidação de queries.

## Observações de dependência

Depende de FRONT_11 e BACK_06. Pode ser paralelizada com outros fluxos de frontend; FRONT_15 consome a lista de vendedoras, mas não precisa esperar a implementação visual desta task.
