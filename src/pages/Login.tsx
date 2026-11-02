import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { RemoteQueryState } from "@/components/remote-query-state";
import type { LoginNoticeState } from "@/components/auth/paths";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/http";
import { useCurrentUserQuery, useLoginMutation } from "@/lib/api/hooks";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "E-mail ou senha inválidos.";
    if (error.code === "USER_INACTIVE") {
      return "Esta conta está desativada. Fale com um(a) sócio(a) da loja para reativá-la.";
    }
    if (error.code === "RATE_LIMITED") {
      return "Muitas tentativas de login. Aguarde alguns minutos e tente de novo.";
    }
    if (error.status === 0 || error.status === 408) {
      return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
    }
  }
  return "Não foi possível entrar. Tente novamente.";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const locationState = location.state as
    | ({ from?: unknown } & LoginNoticeState)
    | null;
  const notice =
    typeof locationState?.notice === "string" ? locationState.notice : null;
  const requestedPath = locationState?.from;
  const requestedPathname =
    typeof requestedPath === "string"
      ? requestedPath.split(/[?#]/, 1)[0]
      : null;
  const from =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    requestedPathname !== "/login"
      ? requestedPath
      : "/";

  if (currentUser.isPending) return <RemoteQueryState state="loading" />;
  if (!currentUser.isError && currentUser.data) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => navigate(from, { replace: true }),
        onError: (cause) => setError(getLoginErrorMessage(cause)),
      },
    );
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="horizontal" size="lg" />
        </div>

        <form
          onSubmit={handleSubmit}
          aria-busy={loginMutation.isPending}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-none"
        >
          {notice && !error && (
            <p role="status" className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
              {notice}
            </p>
          )}

          {currentUser.isError && (
            <div role="alert" className="space-y-2 rounded-md border p-3 text-sm">
              <p>Não foi possível validar uma sessão existente.</p>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() => void currentUser.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@luma.com.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loginMutation.isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loginMutation.isPending}
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
