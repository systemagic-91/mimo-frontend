# BACK_06 - Vendedoras e configurações

**Prioridade:** 6 - necessário para preparar e administrar consignações.

## Contexto Motivador

A UI permite cadastrar/editar/ativar vendedoras e alterar comissão padrão, faixas e prazos, mas tudo é salvo no `localStorage`. Não há validação server-side nem preservação formal da comissão histórica.

## Objetivo

Disponibilizar CRUD controlado de vendedoras e leitura/atualização de configurações da loja, com validação e métricas agregadas requeridas pela UI.

## Proposta de solução

- Criar `GET /sellers` com filtros `status`, `q`, paginação e campos agregados de posse/valor/próximo vencimento/lotes em aberto.
- Criar `POST /sellers`, `GET /sellers/{id}`, `PATCH /sellers/{id}`, `GET /sellers/{id}/stats` e `GET /sellers/{id}/commission?from&to`.
- Restringir create/edit/status a `OWNER`; permitir leitura operacional conforme política definida para `STAFF`.
- Validar nome, telefone, faixa e passo de comissão; novas vendedoras começam ativas; inativação bloqueia novas consignações mas mantém histórico.
- Criar `GET /settings` e `PATCH /settings` para comissão padrão, termos e prazo; usar Bean Validation e timezone de loja.
- Apurar comissão usando snapshot congelado no item de consignação e valores em centavos.
- Provisionar o primeiro usuário OWNER pelo bootstrap one-shot já existente (`BOOTSTRAP_OWNER_ENABLED`, nome, e-mail e senha via ambiente), sem credenciais fixas em migration; documentar no README como escolher as credenciais e entrar pelo Swagger e frontend.

## Pontos de atenção

- Confirmar se a lista de vendedoras da tela de consignação deve incluir inativas (a criação de lote só pode usar ativas).
- Definir unicidade de telefone/email, pois o frontend atual não estabelece essa regra.
- Valores permitidos hoje são 25, 30, 35 e 40%, e prazos de pagamento 30/60/90; configurações precisam decidir se as opções são fixas ou administráveis.
- Consistência de estatísticas com consignações exige compartilhar as regras com BACK_08.

**Decisões desta implementação:** staff pode consultar lista, detalhe e histórico; apenas owner pode mutar vendedoras, consultar stats/comissão e alterar settings. A faixa de comissão 25-40% em passos de 5 e os termos 30/60/90 ficam fixos nesta versão. A comissão de vendas usa o snapshot do item. Vendedoras inativas permanecem consultáveis, mas não podem receber consignações novas.

## Critérios de aceite

- [x] Owner consegue criar, editar e inativar/reativar vendedora; staff recebe `403` nessas mutações.
- [x] Vendedora inativa não é aceita em nova consignação e histórico permanece consultável.
- [x] Taxas e parâmetros fora da faixa são rejeitados com erro padronizado.
- [x] Stats e comissão retornam valores corretos em centavos e período inclusivo.
- [x] Alterar taxa atual não altera comissão de venda histórica.
- [x] Testes cobrem permissões, validações, agregados e alterações concorrentes.

## Observações de dependência

Depende de BACK_01, BACK_02 e BACK_04. Pode avançar em paralelo com BACK_05 (peças) e BACK_07 (fotos). BACK_08 (consignações) precisa da entidade Seller e Settings definidos. FRONT_14 consome estas rotas.
