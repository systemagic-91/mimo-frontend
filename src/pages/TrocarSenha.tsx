import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { RemoteQueryState } from "@/components/remote-query-state";
import type { LoginNoticeState } from "@/components/auth/paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import i18n from "@/i18n/config";
import { apiErrorMessage } from "@/lib/api-errors";
import { ApiError } from "@/lib/api/http";
import {
  useChangePasswordMutation,
  useCurrentUserQuery,
  useLogoutMutation,
} from "@/lib/api/hooks";

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 72;

function getChangePasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CREDENTIALS") return i18n.t("auth.changePassword.wrongCurrent");
    if (error.status === 401) return i18n.t("auth.changePassword.sessionExpired");
    if (error.code === "VALIDATION_ERROR") {
      return i18n.t("auth.changePassword.length", { min: MIN_PASSWORD, max: MAX_PASSWORD });
    }
  }
  return apiErrorMessage(error, { fallback: "auth.changePassword.failed" });
}

function validate(current: string, next: string, confirmation: string): string | null {
  if (next.length < MIN_PASSWORD || next.length > MAX_PASSWORD) {
    return i18n.t("auth.changePassword.length", { min: MIN_PASSWORD, max: MAX_PASSWORD });
  }
  if (next === current) return i18n.t("apiError.PASSWORD_UNCHANGED");
  if (next !== confirmation) return i18n.t("auth.changePassword.mismatch");
  return null;
}

export default function TrocarSenha() {
  const navigate = useNavigate();
  const currentUser = useCurrentUserQuery();
  const changePassword = useChangePasswordMutation();
  const logout = useLogoutMutation();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const user = currentUser.data?.user;
  if (!user) return <RemoteQueryState state="loading" />;
  const forced = Boolean(user.mustChangePassword);
  const pending = changePassword.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = validate(currentPassword, newPassword, confirmation);
    setError(invalid);
    if (invalid) return;
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          const state: LoginNoticeState = {
            notice: t("auth.changePassword.done"),
          };
          navigate("/login", { replace: true, state });
        },
        onError: (cause) => setError(getChangePasswordErrorMessage(cause)),
        // As senhas não ficam no estado depois do envio.
        onSettled: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmation("");
        },
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
          aria-busy={pending}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-none"
        >
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 font-serif text-xl font-medium text-foreground">
              <KeyRound className="h-5 w-5 text-gold" />
              {t("auth.changePassword.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {forced
                ? t("auth.changePassword.forcedHint")
                : t("auth.changePassword.hint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="current-password">{t("auth.changePassword.current")}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t("auth.changePassword.new")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={pending}
              aria-describedby="new-password-hint"
              required
            />
            <p id="new-password-hint" className="text-xs text-muted-foreground">
              {t("auth.changePassword.newHint", { min: MIN_PASSWORD, max: MAX_PASSWORD })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{t("auth.changePassword.confirm")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("common.saving") : t("auth.changePassword.submit")}
          </Button>

          {forced ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => logout.mutate()}
              disabled={pending || logout.isPending}
            >
              {t("auth.changePassword.logout")}
            </Button>
          ) : (
            <Button asChild type="button" variant="ghost" className="w-full text-muted-foreground">
              <Link to="/">{t("common.cancel")}</Link>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
