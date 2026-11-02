import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { RemoteQueryState } from "@/components/remote-query-state";
import { queryKeys } from "@/lib/api/query-keys";
import { authTokenStore } from "@/lib/api/http";
import { useCurrentUserQuery } from "@/lib/api/hooks";
import type { AuthSessionResponse } from "@/lib/api/types";
import type { Role } from "@/lib/types";
import { CHANGE_PASSWORD_PATH } from "./paths";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUserQuery();
  const queryClient = useQueryClient();
  const location = useLocation();
  useEffect(() => {
    const removeDomainQueries = () =>
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    authTokenStore.setUnauthorizedHandler(() => {
      queryClient.setQueryData(queryKeys.auth.me(), null);
      removeDomainQueries();
    });
    // A senha foi redefinida por um owner enquanto a pessoa usava o app: marca a troca pendente e
    // deixa o guard abaixo levar à tela de troca.
    authTokenStore.setPasswordChangeRequiredHandler(() => {
      const session = queryClient.getQueryData<AuthSessionResponse | null>(
        queryKeys.auth.me(),
      );
      if (session) {
        queryClient.setQueryData<AuthSessionResponse>(queryKeys.auth.me(), {
          ...session,
          user: { ...session.user, mustChangePassword: true },
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      }
      removeDomainQueries();
    });
    return () => {
      authTokenStore.setUnauthorizedHandler(undefined);
      authTokenStore.setPasswordChangeRequiredHandler(undefined);
    };
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
  // Com a troca pendente, toda outra rota responde 403; nada além da tela de troca é renderizado,
  // para nenhuma query de outra tela disparar.
  if (
    currentUser.data.user.mustChangePassword &&
    location.pathname !== CHANGE_PASSWORD_PATH
  ) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
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
  if (currentUser.data.user.role !== role) return <RestrictedRedirect />;
  return <>{children}</>;
}

/** Explica por que a pessoa saiu da página antes de levá-la ao início. */
function RestrictedRedirect() {
  useEffect(() => {
    toast.info("Esta área é restrita a sócios(as) da loja.", {
      id: "restricted-route",
    });
  }, []);
  return <Navigate to="/" replace />;
}
