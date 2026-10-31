# BACK_10 - Auditoria, operação e observabilidade

**Prioridade:** 10 - hardening antes de disponibilizar o backend real.

## Contexto Motivador

O backend já tem os fluxos de negócio (BACK_03 a BACK_09), mas ainda não está pronto para operar em produção: a auditoria não cobre todas as mutations, as chaves de idempotência nunca são apagadas, não há métricas nem tracing, os logs são texto simples, o CI só roda os testes e não existe um manual de operação (deploy, backup, restauração).

## Objetivo

Fechar os requisitos operacionais antes do primeiro deploy: auditoria completa, limpeza de dados técnicos, métricas, tracing, logs estruturados, CI que valida migrations e runbook.

## Decisões (2026-10-31)

1. **Sem testes integrados e sem Testcontainers.** O backend fica com testes unitários (JUnit 5 + Mockito) e os testes de contexto/HTTP com H2 (`LumaApplicationTests`). Não haverá cenários automatizados API → banco nem testes de concorrência. As garantias que dependem do PostgreSQL (constraints, triggers, índice parcial, locks) ficam no próprio banco; as migrations passam a ser validadas no CI (decisão 5). A concorrência foi verificada manualmente durante as BACK_07 a BACK_09.
2. **Tracing só com IDs nos logs.** Micrometer Tracing (bridge OpenTelemetry) gera `traceId`/`spanId` para cada requisição. Eles aparecem em toda linha de log e num header da resposta, para achar nos logs do Railway tudo o que aconteceu numa requisição. Sem exportador nem serviço externo por enquanto; dá para ligar um depois sem mudar o código.
3. **Métricas protegidas para owner.** Micrometer com `/actuator/metrics` e `/actuator/prometheus` acessíveis só com JWT de `OWNER` (staff `403`, anônimo `401`). `/actuator/health` continua público, respondendo só `UP`/`DOWN`. Além das métricas técnicas (HTTP, JVM, pool do banco), criar métricas de negócio: lotes criados, peças vendidas e devolvidas, uploads e logins com falha.
4. **Logs em JSON só em produção.** Perfil `prod` usa o structured logging nativo do Spring Boot, com `requestId`, `traceId` e `spanId`. Local continua em texto legível, mostrando também o `traceId`.
5. **CI do backend liberado para mudança.** Passa a rodar `./gradlew clean check` em Java 21, sobe um PostgreSQL como _service container_ do GitHub Actions (não é Testcontainers) para aplicar todas as migrations num banco limpo e validar o schema, e publica o `.jar` como artefato. Migration inválida deixa o CI vermelho.
6. **Backup manual com `pg_dump`.** O runbook explica passo a passo o backup pela URL do Railway e a restauração com `pg_restore`, incluindo um teste de restauração num PostgreSQL local. Sem automação nem custo.
7. **Limpeza das chaves de idempotência.** Job diário (madrugada, fuso da loja) apaga as chaves vencidas há mais de 7 dias. A folga permite investigar algo recente.
8. **Documentação em linguagem simples.** Além do runbook, criar no backend um `TRACING.md` e um `METRICAS.md` explicando, de forma fácil de entender, o que foi feito, por que foi feito e com exemplos de código.

## Proposta de solução

- **Auditoria:** completar o registro para recebimento e etiquetagem de peças e upload de fotos (login, troca de senha, vendedoras, configurações, consignação, venda e devolução já são auditados). Sempre com ator, ação, entidade e estado depois, sem segredos.
- **Idempotência:** manter o comportamento atual (replay com a mesma chave, `409` para payload diferente) e adicionar o job de limpeza da decisão 7.
- **Tracing:** dependências `micrometer-tracing-bridge-otel`, propagação do `traceId` no header da resposta e nos logs (decisão 2).
- **Métricas:** expor `metrics` e `prometheus` no Actuator protegidos para owner e registrar os contadores de negócio (decisão 3).
- **Logs:** formato JSON no perfil `prod`, texto local (decisão 4).
- **CI:** atualizar `.github/workflows/ci.yml` conforme a decisão 5.
- **Runbook:** documentar execução local, variáveis de ambiente, bootstrap seguro do owner, migrations, deploy no Railway e backup/restauração (decisão 6).
- **Docs:** `TRACING.md` e `METRICAS.md` (decisão 8).

## Pontos de atenção

- Nunca guardar tokens, senhas ou conteúdo de fotos em logs, auditoria, métricas ou spans.
- Tags de métricas não podem conter dados pessoais nem valores de alta cardinalidade (nome ou ID de vendedora, código de peça): usar só valores fixos, como resultado ou tipo de ação.
- O endpoint de métricas exige JWT de owner, então um Prometheus externo não conseguiria coletar sem um token próprio; isso fica para quando houver um coletor.
- Tracing sem exportador tem custo baixo; ao ligar um exportador no futuro, revisar a taxa de amostragem.
- Esta task não bloqueia o desenvolvimento de features; é bloqueio apenas para o primeiro deploy.

## Critérios de aceite

- [x] Auditoria registra ator, ação e entidade de todas as mutations (incluindo recebimento, etiquetagem e upload), sem campos secretos, com testes unitários.
- [x] Retry com a mesma chave não duplica a operação; payload diferente falha; chaves vencidas há mais de 7 dias são apagadas pelo job diário (testado).
- [x] Toda resposta traz o `traceId` em header e todo log inclui `traceId`/`spanId`; no perfil `prod` os logs saem em JSON.
- [x] `/actuator/metrics` e `/actuator/prometheus` respondem `401` sem login, `403` para staff e `200` para owner; `/actuator/health` continua público e sem detalhes; as métricas de negócio aparecem.
- [x] CI roda `./gradlew clean check` em Java 21, aplica as migrations num PostgreSQL limpo, falha para migration inválida e publica o `.jar`.
- [x] Runbook documenta configuração, variáveis, bootstrap do owner, deploy no Railway e backup/restauração testada.
- [x] `TRACING.md` e `METRICAS.md` explicam em linguagem simples o que foi feito e por quê, com exemplos de código.

## Observações de dependência

Depende das BACK_03 a BACK_09 (concluídas). Pode ser feita antes das BACK_19, BACK_21 e BACK_23; cada uma delas registra a auditoria das próprias ações seguindo o padrão definido aqui.
