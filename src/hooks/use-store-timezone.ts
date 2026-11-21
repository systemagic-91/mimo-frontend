import { useSettingsQuery } from "@/lib/api/hooks";
import { DEFAULT_STORE_TIMEZONE } from "@/lib/store-time";

/** Fuso da loja (`settings.timezone`); o padrão do backend enquanto `GET /settings` não carrega. */
export function useStoreTimezone(): string {
  return useSettingsQuery().data?.timezone ?? DEFAULT_STORE_TIMEZONE;
}
