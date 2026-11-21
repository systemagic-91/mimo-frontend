import { RemoteQueryState } from "@/components/remote-query-state";
import { useSettingsQuery } from "@/lib/api/hooks";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { ConsignmentWizard } from "./ConsignmentWizard";

/** Nova consignação. O assistente só monta depois de `GET /settings` (prazo padrão, prazos e fuso). */
export default function NovaConsignacao() {
  const settings = useSettingsQuery();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="no-print">
        <h1 className="font-serif text-2xl font-medium text-foreground">Nova consignação</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Entrega de maleta de peças para vendedora</p>
      </header>

      {settings.isPending ? (
        <RemoteQueryState state="loading" />
      ) : settings.isError ? (
        <RemoteQueryState
          state="error"
          message={getConsignmentErrorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : (
        <ConsignmentWizard settings={settings.data} />
      )}
    </div>
  );
}
