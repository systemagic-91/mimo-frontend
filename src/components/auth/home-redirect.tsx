import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { RemoteQueryState } from "@/components/remote-query-state";
import { useCurrentUserQuery } from "@/lib/api/hooks";
import Dashboard from "@/pages/Dashboard";

/** Página inicial: owner vê o Dashboard; staff cai no Estoque. */
export function HomeRedirect() {
  const currentUser = useCurrentUserQuery();
  const { t } = useTranslation();
  if (currentUser.isPending) return <RemoteQueryState state="loading" />;
  if (currentUser.isError) {
    return (
      <RemoteQueryState
        state="error"
        message={t("common.sessionCheckError")}
        onRetry={() => void currentUser.refetch()}
      />
    );
  }
  if (currentUser.data?.user.role === "owner") return <Dashboard />;
  if (!currentUser.data) return <Navigate to="/login" replace />;
  return <Navigate to="/estoque" replace />;
}
