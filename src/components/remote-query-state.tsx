import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type RemoteQueryStateProps =
  | { state: "loading"; children?: never }
  | { state: "error"; message?: string; onRetry: () => void; children?: never }
  | { state: "empty"; message: string; children?: never }
  | { state: "success"; children: ReactNode };

export function RemoteQueryState(props: RemoteQueryStateProps) {
  const { t } = useTranslation();
  if (props.state === "success") return <>{props.children}</>;

  if (props.state === "loading") {
    return (
      <div role="status" aria-live="polite" className="py-8 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (props.state === "error") {
    return (
      <div role="alert" className="space-y-3 py-8 text-center">
        <p className="text-sm text-destructive">
          {props.message || t("common.loadError")}
        </p>
        <Button type="button" variant="outline" onClick={props.onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="py-8 text-center text-sm text-muted-foreground">
      {props.message}
    </div>
  );
}
