import { useCurrentUserQuery } from "@/lib/api/hooks";

/**
 * A pessoa logada é owner? Decide o que mostrar e o que consultar pelo papel, nunca pela presença de
 * `null` nos dados (para owner, `null` também quer dizer "não informado"). Quem garante a regra é o backend.
 */
export function useIsOwner(): boolean {
  return useCurrentUserQuery().data?.user.role === "owner";
}
