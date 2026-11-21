import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { RemoteQueryState } from "@/components/remote-query-state";
import type { LoginNoticeState } from "@/components/auth/paths";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import i18n from "@/i18n/config";
import { apiErrorMessage } from "@/lib/api-errors";
import { ApiError } from "@/lib/api/http";
import { useCurrentUserQuery, useLoginMutation } from "@/lib/api/hooks";

function getLoginErrorMessage(error: unknown): string {
  // No login, qualquer 401 quer dizer e-mail ou senha errados.
  if (error instanceof ApiError && error.status === 401) return i18n.t("apiError.INVALID_CREDENTIALS");
  return apiErrorMessage(error, {
    codes: { RATE_LIMITED: "auth.login.rateLimited" },
    fallback: "auth.login.failed",
  });
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const { t } = useTranslation();
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
              <p>{t("auth.login.sessionCheckError")}</p>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() => void currentUser.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.login.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loginMutation.isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
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
            {loginMutation.isPending ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
