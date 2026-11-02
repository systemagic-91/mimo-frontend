import { useCallback, useRef } from "react";
import { createIdempotencyKey } from "@/lib/api/http";

/**
 * Uma `Idempotency-Key` por envio de formulário.
 *
 * `keyFor(payload)` devolve a mesma chave enquanto o conteúdo enviado for o mesmo: o "tentar de novo"
 * depois de uma falha de rede reaproveita a chave, e o backend devolve a resposta salva em vez de criar
 * outra peça. Se o conteúdo mudar, gera uma chave nova (a antiga daria `409 IDEMPOTENCY_KEY_REUSED`).
 * `reset()` descarta a chave depois de um envio concluído.
 */
export function useIdempotencyKey() {
  const current = useRef<{ payload: string; key: string } | null>(null);

  const keyFor = useCallback((payload: unknown) => {
    const serialized = JSON.stringify(payload);
    if (current.current?.payload !== serialized) {
      current.current = { payload: serialized, key: createIdempotencyKey() };
    }
    return current.current.key;
  }, []);

  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return { keyFor, reset };
}
