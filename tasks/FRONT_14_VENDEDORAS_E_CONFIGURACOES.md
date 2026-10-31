# FRONT_14 - Vendedoras e configurações

**Prioridade:** 14 - migra a administração da loja para persistência remota.

## Contexto Motivador

`Configuracoes.tsx` cadastra, edita e ativa vendedoras e persiste taxas e prazos localmente. As telas de consignação também calculam agregados a partir do banco local, e alterar a taxa atual pode refletir incorretamente sobre a comissão histórica.

O backend (BACK_06) está pronto e os hooks já existem: `useSellersQuery`, `useCreateSellerMutation`, `useUpdateSellerMutation`, `useSettingsQuery` e `useUpdateSettingsMutation`.

## Objetivo

Migrar o cadastro de vendedoras e os parâmetros da loja para a API, com validação, cache e estados de mutation.

## Contrato da API (estado em 2026-10-31)

Detalhes nas seções 3 e 7 do `BACKEND_API_CONTRACT.md`.

- `GET /sellers` (owner e staff):
  - query `status` (`ativa`/`inativa`), `q` (nome ou telefone, até 120 caracteres), `page`, `pageSize` e `sort` (`name`, `phone`, `commissionRate`, `status`, `createdAt`, `updatedAt`);
  - cada item traz `seller` e os agregados `piecesInHand`, `valueInHandCents`, `nextDueAt`, `nextDueDays`, `late` e `openLots`;
  - vendedoras inativas continuam listadas.
- `POST /sellers` (owner):
  - corpo `{ name, phone, commissionRate }`; os três são obrigatórios e `phone` tem até 40 caracteres;
  - a vendedora é criada `ativa`;
  - comissão fora da faixa ou do passo: `400 VALIDATION_ERROR` em `fields.commissionRate`.
- `PATCH /sellers/{id}` (owner):
  - aceita `name`, `phone`, `commissionRate` e `status` (`ativa`/`inativa`), com ao menos um campo;
  - a mesma operação edita e ativa/inativa;
  - inativar não apaga lotes; vendedora inativa só não recebe lotes novos.
- `GET /settings` (owner e staff): `commissionMin`, `commissionMax`, `commissionStep`, `defaultCommissionRate`, `paymentTerms`, `defaultConsignmentDays`, `timezone`, `updatedAt` e `updatedById`.
- `PATCH /settings` (owner):
  - **todos os campos são obrigatórios**: `defaultCommissionRate`, `paymentTerms`, `defaultConsignmentDays` e `timezone`;
  - `paymentTerms` é uma lista não vazia, sem repetição, só com 30, 60 e 90;
  - `defaultConsignmentDays` precisa ser `>= 1`;
  - `timezone` é um ID IANA;
  - erros em `400 VALIDATION_ERROR` com o campo em `fields`.
- A faixa de comissão (25 a 40%, de 5 em 5) e as opções de prazo (30/60/90) são **fixas nesta versão**: a tela só escolhe entre elas.
- `Idempotency-Key` é automática. Vendedora inexistente: `404 SELLER_NOT_FOUND`.

## Proposta de solução

- Lista com `useSellersQuery`, criação com `useCreateSellerMutation` e edição/ativação com `useUpdateSellerMutation`.
- Montar as opções de comissão a partir de `commissionMin`/`commissionMax`/`commissionStep` de `GET /settings`, sem constantes duplicadas.
- Formulário de configurações:
  - preenchido com `GET /settings` só depois de carregar;
  - envia sempre os quatro campos;
  - mostra os prazos 30/60/90 como opções marcáveis.
- Mostrar os erros de `fields` junto aos campos, impedir envio inválido e evitar submit duplicado.
- Atualizar as telas dependentes pela invalidação do React Query. Os hooks já fazem isso: a edição invalida os dados operacionais (vendedoras, peças, consignações, dashboard e relatórios), a criação invalida vendedoras e as configurações invalidam settings e vendedoras.
- A rota `/configuracoes` já é só para owner (`RequireRole`); tratar `403` vindo do backend com a UX padrão.

## Pontos de atenção

- Avisar na tela que mudar a comissão de uma vendedora só vale para **lotes novos**: o backend guarda a taxa no item no momento da entrega.
- Mudar `timezone` muda o que conta como "hoje" para vencimentos e relatórios. Pedir confirmação.
- Não inicializar formulários a partir do seed/`localStorage`.
- Loading/erro de leitura e estado de salvamento precisam ser distintos.
- A aba "Usuários" (FRONT_20) fica nesta mesma página; combinar a estrutura de abas.

## Critérios de aceite

- [ ] Lista, criação, edição e ativação/inativação persistem no backend e sobrevivem a reload e a outro dispositivo.
- [ ] Comissão e parâmetros inválidos exibem o erro de campo vindo da API.
- [ ] A tela lida com lista vazia, loading, erro/retry e `403`.
- [ ] Alterações atualizam os dados compartilhados sem refresh manual.
- [ ] Nenhum cálculo de comissão histórica no front; os valores vêm da API.
- [ ] Testes cobrem mutations, erros de campo e invalidação de queries.

## Observações de dependência

Depende de FRONT_11 e BACK_06 (pronto). A FRONT_15 consome a lista de vendedoras, mas não precisa esperar esta task. A FRONT_20 adiciona a aba de usuários à mesma página.
