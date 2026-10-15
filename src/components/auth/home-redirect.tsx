import { Navigate } from "react-router-dom";
import { RemoteQueryState } from "@/components/remote-query-state";
import { useCurrentUserQuery } from "@/lib/api/hooks";
import Dashboard from "@/pages/Dashboard";

/** Página inicial: owner vê o Dashboard; staff cai no Estoque. */
export function HomeRedirect() {
  const currentUser = useCurrentUserQuery();
  if (currentUser.isPending) return <RemoteQueryState state="loading" />;
  if (currentUser.isError) {
    return (
      <RemoteQueryState
        state="error"
        message="Não foi possível validar sua sessão."
        onRetry={() => void currentUser.refetch()}
      />
    );
  }
  if (currentUser.data?.user.role === "owner") return <Dashboard />;
  if (!currentUser.data) return <Navigate to="/login" replace />;
  return <Navigate to="/estoque" replace />;
}
