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
- `paymentTerms` define os prazos de pagamento aceitos **nos lotes novos** (BACK_27): tirar um prazo faz o wizard deixar de oferecê-lo, mas não muda o prazo dos lotes já criados. Explicar isso na tela.
- Não inicializar formulários a partir do seed/`localStorage`.
- Loading/erro de leitura e estado de salvamento precisam ser distintos.
- A aba "Usuários" (FRONT_20) fica nesta mesma página; combinar a estrutura de abas.

## Critérios de aceite

- [x] Lista, criação, edição e ativação/inativação persistem no backend e sobrevivem a reload e a outro dispositivo.
- [x] Comissão e parâmetros inválidos exibem o erro de campo vindo da API.
- [x] A tela lida com lista vazia, loading, erro/retry e `403`.
- [x] Alterações atualizam os dados compartilhados sem refresh manual.
- [x] Nenhum cálculo de comissão histórica no front; os valores vêm da API.
- [x] Testes cobrem mutations, erros de campo e invalidação de queries.

## Implementação (2026-11-21)

- **Página** (`src/pages/Configuracoes/index.tsx`): ficou só com as abas. Cada aba é um componente: `SellersTab`, `SettingsTab` e `UsersTab` (FRONT_20).
- **Vendedoras** (`SellersTab`, `SellerRow`, `SellerFormDialog`):
  - lista por `useSellersQuery`, com busca por nome ou telefone (debounce), filtro Todas/Ativas/Inativas, ordem por nome e paginação de 20, tudo enviado à API;
  - mostra comissão, peças com a vendedora (`piecesInHand`) e status; estados de carregamento, lista vazia, erro com "Tentar novamente" e `403`;
  - cadastro e edição no mesmo diálogo. A edição envia só os campos alterados. Ao trocar a comissão, o diálogo avisa que ela só vale para lotes entregues daqui em diante;
  - o cadastro usa `useIdempotencyKey`, como na FRONT_13: repetir depois de uma falha de rede reaproveita a chave e não duplica a vendedora. Para isso, `sellersApi.create` e `useCreateSellerMutation` passaram a receber a chave de quem chama;
  - inativar pede confirmação e explica que os lotes em aberto continuam valendo; ativar é direto. Os dois usam `PATCH /sellers/{id}` com `status`;
  - as opções de comissão vêm de `commissionMin`/`commissionMax`/`commissionStep` de `GET /settings` (`commission-options.ts`). Sem as configurações carregadas, cadastro e edição ficam desabilitados, com aviso e "Tentar novamente". Uma taxa antiga fora da faixa atual continua aparecendo na edição.
- **Parâmetros** (`SettingsTab`, `SettingsForm`):
  - o formulário só monta depois que `GET /settings` carrega, e remonta com os valores salvos quando `updatedAt` muda;
  - envia sempre os quatro campos (o tipo `UpdateSettingsRequest` passou a exigir os quatro);
  - prazos 30/60/90 como caixas de marcar. O texto explica que os prazos valem para lotes novos e, ao desmarcar um, diz qual deixa de aparecer;
  - fuso horário escolhido entre os fusos do Brasil (o salvo aparece mesmo fora da lista). Trocar o fuso pede confirmação.
- **Erros:** `admin-errors.ts` traduz os códigos de `/sellers` e `/settings` e transforma `fields` do `400 VALIDATION_ERROR` em mensagens mostradas abaixo de cada campo (`FieldError`), com `aria-invalid`. A validação local (nome e telefone obrigatórios, ao menos um prazo, prazo de consignação ≥ 1) impede o envio, e os botões ficam desabilitados durante o salvamento.
- **Testes:** `SellersTab.test.tsx` e `SettingsTab.test.tsx` cobrem lista, filtros, vazio, erro com retry, `403`, cadastro (com a lista recarregada), chave reaproveitada no retry, validação local, erro de campo da API, edição parcial, inativação, ativação, envio dos quatro campos, invalidação de settings e vendedoras e a confirmação do fuso. O `setup.ts` ganhou um stub de `ResizeObserver`, usado pelo `Checkbox` e pelo `Switch` do Radix.
- **Limitações:**
  - nada foi verificado contra o backend real nem em navegador (fica para os E2E da FRONT_18);
  - as telas de consignação ainda leem as vendedoras do banco local até a FRONT_15, então quem é cadastrada pela API ainda não aparece nelas.

## Observações de dependência

Depende de FRONT_11 e BACK_06 (pronto). A FRONT_15 consome a lista de vendedoras, mas não precisa esperar esta task. A FRONT_20 adiciona a aba de usuários à mesma página.
