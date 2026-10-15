import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type RemoteQueryStateProps =
  | { state: "loading"; children?: never }
  | { state: "error"; message?: string; onRetry: () => void; children?: never }
  | { state: "empty"; message: string; children?: never }
  | { state: "success"; children: ReactNode };

export function RemoteQueryState(props: RemoteQueryStateProps) {
  if (props.state === "success") return <>{props.children}</>;

  if (props.state === "loading") {
    return (
      <div role="status" aria-live="polite" className="py-8 text-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (props.state === "error") {
    return (
      <div role="alert" className="space-y-3 py-8 text-center">
        <p className="text-sm text-destructive">
          {props.message || "Não foi possível carregar os dados."}
        </p>
        <Button type="button" variant="outline" onClick={props.onRetry}>
          Tentar novamente
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
