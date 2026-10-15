import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { RemoteQueryState } from "@/components/remote-query-state";
import { queryKeys } from "@/lib/api/query-keys";
import { authTokenStore } from "@/lib/api/http";
import { useCurrentUserQuery } from "@/lib/api/hooks";
import type { Role } from "@/lib/types";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUserQuery();
  const queryClient = useQueryClient();
  const location = useLocation();
  useEffect(() => {
    authTokenStore.setUnauthorizedHandler(() => {
      queryClient.setQueryData(queryKeys.auth.me(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    });
    return () => authTokenStore.setUnauthorizedHandler(undefined);
  }, [queryClient]);

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
  if (!currentUser.data) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
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
  if (!currentUser.data) return <Navigate to="/login" replace />;
  if (currentUser.data.user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
