# BACK_28 - Logs dos fluxos do backend

**Prioridade:** 28 - permite acompanhar pelo Railway o que acontece em produção.

## Contexto Motivador

O painel de logs do Railway fica praticamente vazio. A infraestrutura já existe desde a BACK_10: cada requisição recebe `requestId`, `traceId` e `spanId` no MDC, e no perfil `prod` os logs saem em JSON (`logging.structured.format.console: logstash`). O que falta é o que logar: o código inteiro tem só cinco chamadas de log, todas em casos raros:

- `ConsignmentApplicationService`: dois `warn` de dados inconsistentes;
- `IdempotencyCleanupJob` e `PhotoCleanupJob`: um `info` por limpeza diária;
- `ApiExceptionHandler`: um `error` para falha inesperada (500), **sem a stack trace**, só com o tipo da exceção.

Fora isso, o Spring em nível `INFO` só registra a subida da aplicação. Não há log de acesso, de login, de venda ou de recusa de segurança. Quando alguém da loja diz "deu erro na venda da LU-0042 às 15h", não há o que procurar.

## Objetivo

Registrar com SLF4J os eventos que ajudam a entender e depurar o uso real (quem fez o quê, o que falhou e por quê), sem expor senha, token ou dado pessoal, e de forma que cada linha possa ser cruzada pelo `requestId`/`traceId`.

## Decisões

1. **SLF4J com o padrão que o código já usa:** `private static final Logger LOGGER = LoggerFactory.getLogger(Classe.class);`. O Lombok está no projeto, mas os arquivos atuais não usam `@Slf4j`; manter um padrão só.
2. **Mensagem curta em inglês, com campos `chave=valor`**, como as linhas que já existem (`"Orphan piece photos deleted count={}"`). Sempre com placeholders `{}`, nunca concatenando strings. No JSON de produção a linha inteira vira o campo `message`, e o MDC vira campos próprios.
3. **Níveis:**
   - `ERROR`: falha inesperada que precisa de atenção (500), sempre com a exceção como último argumento, para sair a stack trace;
   - `WARN`: recusa de segurança, conflito de concorrência, limite atingido, dado inconsistente;
   - `INFO`: mudança de estado de negócio (criou, vendeu, devolveu, mudou) e o log de acesso;
   - `DEBUG`: detalhes úteis para investigar, desligados em produção.
4. **Os logs podem ser ligados e desligados** para economizar recursos do Railway, sem mudar código: por variável de ambiente (vale a partir do próximo restart) ou pelo Actuator (vale na hora). **O padrão é econômico** (`root: WARN`, `br.com.luma: ERROR`, acesso `OFF`). Detalhes em "Ligar e desligar os logs".
6. **As vendas são sempre registradas**, num logger próprio (`br.com.luma.sales`) que não pode ser desligado por variável nem pelo Actuator.
7. **Identificar por ID, não por dado pessoal:** UUIDs, códigos de peça (`LU-0042`) e de lote (`C-2026-003`), papel do usuário. Nome, telefone e e-mail não entram nos logs (o e-mail só mascarado, veja abaixo).

## Proposta de solução

### 1. Log de acesso (uma linha por requisição)

- Filtro depois da autenticação que registra, ao fim de cada requisição, em `INFO`:
  `HTTP request method=POST path=/api/v1/consignments status=201 durationMs=87`.
- Usa um logger com nome próprio, `br.com.luma.access`, para poder ser desligado separado dos eventos de negócio. É o log de maior volume.
- Quando esse logger está desligado, o filtro não faz nada (confere `isInfoEnabled()`/`isWarnEnabled()` antes de medir o tempo e montar a linha).
- Só o caminho, **sem a query string** (a busca `q` pode ter texto digitado pela pessoa).
- Pular `/actuator/health` e `/actuator/prometheus`, que o Railway e o monitoramento chamam o tempo todo.
- Requisições acima de um limite (ex.: `LOG_SLOW_REQUEST_MS`, padrão 1000 ms) saem em `WARN` com `slow=true`.

### 2. Quem fez: `userId` e papel no MDC

- Depois que o JWT é validado, colocar `userId` e `role` no MDC e retirar no fim da requisição.
- Acrescentar os dois ao `logging.pattern.level` do perfil local; no JSON de produção o MDC já sai como campo.
- Assim toda linha de uma requisição autenticada diz quem estava usando, sem repetir isso em cada log.

### 3. Autenticação e segurança

| Evento | Nível | Campos |
|---|---|---|
| Login com sucesso | INFO | `userId`, `role` |
| Login recusado (credenciais erradas ou usuário inativo) | WARN | `reason`, `email` mascarado (`l***@email.com`), `ip` |
| Rate limit de login atingido | WARN | `ip`, `email` mascarado |
| Reuso de refresh token (todas as sessões revogadas) | WARN | `userId` |
| Refresh token vencido ou de usuário inativo | INFO | `userId` |
| Logout | INFO | `userId` |
| Troca de senha concluída (normal ou obrigatória) | INFO | `userId`, `forced` |
| Troca de senha recusada (senha atual errada) | WARN | `userId`, `ip` |
| Requisição bloqueada por `PASSWORD_CHANGE_REQUIRED` | DEBUG | `userId`, `path` |
| Origem recusada pelo `OriginGuard` | WARN | `origin`, `path` |
| Owner criado pelo bootstrap na subida / bootstrap ignorado | INFO | `userId` (nunca a senha) |

### 4. Usuários (`/users`)

`INFO` para cadastro, edição, mudança de papel, desativação, reativação e redefinição de senha, com `actorId`, `targetUserId` e, quando couber, `role`/`previousRole`. Recusas de regra (`LAST_OWNER`, `CANNOT_*`) entram pelo item 9.

### 5. Vendedoras e configurações

- Vendedora criada, editada e ativada/inativada: `INFO` com `sellerId`, `status` e os **nomes** dos campos alterados (`changedFields=[commissionRate]`).
- Configurações salvas: `INFO` com `changedFields`. Troca de fuso horário também com `previousTimezone` e `timezone`, porque muda o que conta como "hoje".

### 6. Peças, etiquetagem, custos e fotos

- Peça recebida: `INFO` com `pieceId`, `code`, `stage`.
- Peça etiquetada: `INFO` com `pieceId`, `code`, `photoId` (ou `withoutPhoto=true`).
- Custos alterados: `INFO` com `pieceId` e `changedFields`, **sem os valores**.
- Foto enviada: `INFO` com `photoId`, `bytes`, `width`, `height`, `contentType`.
- Foto recusada (formato, tamanho) e rate limit de upload: `WARN` com o motivo e `bytes`.

### 7. Consignações

- Lote criado: `INFO` com `consignmentId`, `code`, `sellerId`, `pieceCount`, `dueDate`, `paymentTermDays`.
- **Venda: sempre registrada**, no logger próprio `br.com.luma.sales` (veja "Vendas: sempre ligadas"), em `INFO`:
  `Sale registered consignmentId=… consignmentCode=C-2026-003 pieceId=… pieceCode=LU-0042 sellerId=… valueCents=8490 commissionRate=30 soldAt=2026-11-21T18:03:00Z retroactive=false`.
  O `userId` de quem registrou vem do MDC. Sai só depois do commit, então uma venda desfeita por erro não aparece.
- Peça devolvida: `INFO` no logger normal, com `consignmentId`, `pieceId`, `code` e `retroactive=true` quando veio com data.
- Lote quitado (última peça saiu da vendedora): `INFO` com `consignmentId`, `code`.
- Os dois `warn` de inconsistência que já existem continuam.

### 8. Idempotência

- Resposta salva devolvida num retry: `INFO` com `scope` e os 8 primeiros caracteres da chave.
- Mesma chave com outro conteúdo (`IDEMPOTENCY_KEY_REUSED`) ou envio ainda em andamento (`IDEMPOTENCY_IN_PROGRESS`): `WARN`, com os mesmos campos.

### 9. Erros devolvidos pela API (`ApiExceptionHandler`)

Um ponto só, em vez de log em cada `throw`:

- `400` (validação, paginação, requisição inválida): `INFO` com `code`, `path` e os **nomes** dos campos de `fields` (nunca os valores enviados);
- `401`, `403`, `409`, `422`, `429`: `WARN` com `code` e `path`;
- `404`: `INFO` com `code` e `path`;
- `500`: `ERROR` **com a stack trace** (passar a exceção para o logger), `code` e `path`.

O `requestId`, o `traceId` e o `userId` já vêm do MDC.

### 10. Jobs agendados

Os jobs de limpeza já logam o resultado; acrescentar `durationMs`. Falha num job: `ERROR` com a stack trace.

### 11. Relatórios e dashboard

Sem log por consulta (o log de acesso já cobre). Só `WARN` quando a consulta passar do limite de requisição lenta, com o período (`from`, `to`) ou os `days`.

## Ligar e desligar os logs

O objetivo é deixar os logs no mínimo no dia a dia, para gastar menos recursos do Railway, e ligar tudo só para investigar um problema. **O padrão já é econômico** (decisão de 2026-11-21): saem os erros inesperados, os avisos das bibliotecas e as vendas.

### Por variável de ambiente (permanente)

Três variáveis no `application.yml`, com os valores padrão entre parênteses, e o logger de vendas fixo:

| Variável | Controla | Valores |
|---|---|---|
| `LOG_LEVEL_APP` (`ERROR`) | eventos do backend (`br.com.luma`): auth, negócio, erros | `OFF`, `ERROR`, `WARN`, `INFO`, `DEBUG` |
| `LOG_LEVEL_ACCESS` (`OFF`) | a linha por requisição (`br.com.luma.access`) | `OFF`, `WARN` (só as lentas), `INFO` |
| `LOG_LEVEL_ROOT` (`WARN`) | bibliotecas (Spring, Hibernate, Tomcat) | `OFF`, `ERROR`, `WARN`, `INFO` |
| — (fixo em `INFO`) | as vendas (`br.com.luma.sales`) | sem variável: sempre ligado |

```yaml
logging:
  level:
    root: ${LOG_LEVEL_ROOT:WARN}
    br.com.luma: ${LOG_LEVEL_APP:ERROR}
    br.com.luma.access: ${LOG_LEVEL_ACCESS:OFF}
    br.com.luma.sales: INFO
```

Por que este padrão:

- `br.com.luma` em `ERROR`, e não `OFF`: o erro 500 é registrado pelo `ApiExceptionHandler`, dentro desse pacote, e não chega ao Tomcat. Com `OFF`, um 500 em produção não deixaria rastro, e ligar depois só pega o próximo erro. Em `ERROR` o custo é quase zero, porque só sai linha quando algo quebra.
- `root` em `WARN`: as bibliotecas falam bastante em `INFO` (sobretudo na subida), mas avisos e erros delas, como queda da conexão com o banco, continuam aparecendo.
- O acesso desligado é o que mais economiza; liga-se pelo Actuator quando precisar.

Combinações prontas, para documentar no `LOGS.md`/`RUNBOOK.md` (as vendas saem em todas):

| Modo | `LOG_LEVEL_APP` | `LOG_LEVEL_ACCESS` | `LOG_LEVEL_ROOT` | O que sai, além das vendas |
|---|---|---|---|---|
| Padrão (econômico) | `ERROR` | `OFF` | `WARN` | erros inesperados (500), falhas de job e avisos das bibliotecas |
| Problemas | `WARN` | `WARN` | `WARN` | também recusas de segurança, conflitos e requisições lentas |
| Completo (investigar) | `INFO` | `INFO` | `INFO` | tudo da proposta |
| Desligado | `OFF` | `OFF` | `OFF` | nada além das vendas (não recomendado: um erro 500 passa sem rastro) |

No Railway, mudar uma variável reinicia o serviço (cerca de um minuto fora do ar), por isso este é o jeito de definir o modo padrão.

### Vendas: sempre ligadas

- Toda venda registrada (`POST /consignments/{id}/items/{pieceId}/sold`, inclusive com data retroativa) gera uma linha no logger `br.com.luma.sales`.
- Esse logger tem nível explícito `INFO`, sem variável de ambiente. No logback, um logger com nível próprio não herda o do pai, então ele continua ligado mesmo com `br.com.luma` em `ERROR` ou `OFF`.
- Ele também não pode ser alterado pelo Actuator: `POST /actuator/loggers/br.com.luma.sales` responde `403`. Para desligar seria preciso mudar o código, o que é proposital.
- O log não substitui o banco: a venda continua gravada no lote, no evento da peça e na auditoria. O log serve para acompanhar as vendas pelo painel do Railway e some com a retenção do plano.
- O volume é pequeno (uma linha por peça vendida).

### Pelo Actuator (na hora, sem reiniciar)

- Expor o endpoint `loggers` do Actuator (`management.endpoints.web.exposure.include: health,metrics,prometheus,loggers`) com a **mesma proteção das métricas: só owner** (`SecurityConfiguration`).
- Mudar um nível com a aplicação rodando:

  ```bash
  curl -X POST https://mimo-backend-production-2b7f.up.railway.app/actuator/loggers/br.com.luma.access \
    -H "Authorization: Bearer <accessToken do owner>" \
    -H "Content-Type: application/json" \
    -d '{"configuredLevel":"OFF"}'
  ```

  `GET /actuator/loggers/br.com.luma` mostra o nível atual; `{"configuredLevel":null}` volta ao valor da variável.
- A exceção é o logger de vendas: `POST /actuator/loggers/br.com.luma.sales` é recusado com `403`. Mudar `br.com.luma` ou o `ROOT` não o afeta, porque ele tem nível próprio.
- A mudança vale até o próximo restart ou deploy, quando voltam os valores das variáveis. Serve para ligar o modo completo por algumas horas enquanto se investiga algo, sem derrubar o serviço.
- A mudança de nível em si é registrada em `INFO` no logger `br.com.luma` (quem mudou, qual logger, de qual nível para qual), para não ficar um "buraco" sem explicação nos logs. Se `br.com.luma` estiver em `OFF`, essa linha também não sai.

## O que nunca pode aparecer nos logs

- Senhas, inclusive temporárias, e hashes de senha.
- Access token, refresh token, o cookie `luma_refresh` e o header `Authorization`.
- Corpo de requisição ou de resposta, e os bytes das fotos.
- Telefone e nome de vendedoras e usuários; e-mail só mascarado.
- Valores digitados que voltaram como erro de validação (só o nome do campo).

## Pontos de atenção

- **Volume:** o Railway guarda os logs por tempo limitado conforme o plano. Uma linha de acesso por requisição mais os eventos de negócio é pouco para o uso da loja; não logar em loops nem por item de listagem.
- **Não duplicar a auditoria:** a tabela de auditoria (BACK_10) continua sendo o registro oficial de quem mudou o quê; os logs servem para acompanhar e depurar, e somem com o tempo.
- **Log depois do commit:** eventos de negócio devem sair só se a transação confirmar (por exemplo, com `TransactionSynchronization.afterCommit`, como já faz o `BusinessMetrics`), para não registrar uma venda que foi desfeita.
- **Mascaramento num lugar só:** um helper para o e-mail (`l***@email.com`), para não haver formatos diferentes.
- **MDC limpo:** retirar `userId` e `role` no `finally` do filtro, para não vazar para a próxima requisição da mesma thread.

## Critérios de aceite

- [ ] Toda requisição (fora health e prometheus) gera uma linha de acesso com método, caminho sem query, status e duração.
- [ ] Linhas de requisições autenticadas trazem `userId` e `role` (no JSON de produção e no padrão local).
- [ ] Login, logout, troca de senha, recusas de segurança e reuso de refresh token são logados nos níveis da tabela.
- [ ] Criação e mudanças de usuários, vendedoras, configurações, peças, fotos e consignações geram `INFO` com os IDs, só depois do commit.
- [ ] O `ApiExceptionHandler` loga os erros devolvidos pelo nível do status, e o `500` sai com a stack trace.
- [ ] O padrão do `application.yml` é `root: ${LOG_LEVEL_ROOT:WARN}`, `br.com.luma: ${LOG_LEVEL_APP:ERROR}`, `br.com.luma.access: ${LOG_LEVEL_ACCESS:OFF}` e `br.com.luma.sales: INFO`.
- [ ] As três variáveis ligam e desligam os três grupos de log sem alterar código; com `LOG_LEVEL_ACCESS=OFF` o filtro de acesso não mede nem monta nada.
- [ ] Toda venda (inclusive retroativa) gera uma linha `Sale registered` em `br.com.luma.sales`, depois do commit, mesmo com `LOG_LEVEL_APP=OFF`; uma venda que falhou não gera linha.
- [ ] `/actuator/loggers` muda o nível na hora, só para owner (staff e anônimo recebem `403`/`401`), recusa mudar `br.com.luma.sales` (`403`) e a mudança volta ao valor da variável no restart.
- [ ] O documento explica os modos (padrão, problemas, completo, desligado), que as vendas saem sempre, e como trocar de modo pelo Railway e pelo Actuator.
- [ ] Testes com `OutputCaptureExtension` cobrem os eventos principais e garantem que senha, token e cookie nunca aparecem na saída (login, troca de senha, criação de usuário com senha temporária, refresh).
- [ ] Um documento em linguagem simples (`LOGS.md` no backend, ou uma seção no `RUNBOOK.md`) lista os eventos, os níveis e como achar no Railway as linhas de uma requisição pelo `requestId`.

## Verificação sugerida

Depois do deploy, repetir pelo front um fluxo completo no Railway (login, recebimento, etiquetagem, lote, venda, devolução, um erro de validação e um login errado) e conferir no painel de logs que cada passo aparece uma vez, com `requestId` e `userId`, e que nenhuma senha ou token aparece. Esse roteiro roda no modo completo, ligado pelo Actuator. Depois, voltar ao padrão (`{"configuredLevel":null}`) e conferir que só saem erros, avisos das bibliotecas e as vendas: uma venda nova aparece, um login não. Por fim, conferir que `POST /actuator/loggers/br.com.luma.sales` é recusado.

## Observações de dependência

Depende da BACK_10 (MDC com `requestId`/`traceId`, JSON no perfil `prod`, `BusinessMetrics` com `afterCommit`). Não muda o contrato da API nem o front.
