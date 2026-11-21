import { RemoteQueryState } from "@/components/remote-query-state";
import { useSettingsQuery } from "@/lib/api/hooks";
import { getAdminErrorMessage } from "./admin-errors";
import { SettingsForm } from "./SettingsForm";

/** Aba "Comissão e prazos": o formulário só aparece depois que `GET /settings` carrega. */
export function SettingsTab() {
  const settings = useSettingsQuery();

  return (
    <section className="rounded-lg border bg-card p-5 shadow-none">
      <h2 className="font-serif text-lg font-medium text-foreground">Comissão e prazos</h2>
      {settings.isPending ? (
        <RemoteQueryState state="loading" />
      ) : settings.isError ? (
        <RemoteQueryState
          state="error"
          message={getAdminErrorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : (
        // A chave remonta o formulário com os valores salvos quando as configurações mudam.
        <SettingsForm key={settings.data.updatedAt ?? "settings"} settings={settings.data} />
      )}
    </section>
  );
}
