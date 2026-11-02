import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { RemoteQueryState } from "@/components/remote-query-state";
import type { LoginNoticeState } from "@/components/auth/paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (error.code === "INVALID_CREDENTIALS") return "A senha atual está incorreta.";
    if (error.status === 401) return "Sua sessão expirou. Saia e entre novamente.";
    if (error.code === "PASSWORD_UNCHANGED") {
      return "A nova senha precisa ser diferente da atual.";
    }
    if (error.code === "VALIDATION_ERROR") {
      return `A nova senha precisa ter de ${MIN_PASSWORD} a ${MAX_PASSWORD} caracteres.`;
    }
    if (error.code === "RATE_LIMITED") {
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    }
    if (error.status === 0 || error.status === 408) {
      return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
    }
  }
  return "Não foi possível trocar a senha. Tente novamente.";
}

function validate(current: string, next: string, confirmation: string): string | null {
  if (next.length < MIN_PASSWORD || next.length > MAX_PASSWORD) {
    return `A nova senha precisa ter de ${MIN_PASSWORD} a ${MAX_PASSWORD} caracteres.`;
  }
  if (next === current) return "A nova senha precisa ser diferente da atual.";
  if (next !== confirmation) return "A confirmação não confere com a nova senha.";
  return null;
}

export default function TrocarSenha() {
  const navigate = useNavigate();
  const currentUser = useCurrentUserQuery();
  const changePassword = useChangePasswordMutation();
  const logout = useLogoutMutation();
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
            notice: "Senha alterada. Entre com a nova senha.",
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
              Trocar senha
            </h1>
            <p className="text-sm text-muted-foreground">
              {forced
                ? "Sua senha é temporária. Defina uma senha nova para continuar."
                : "Depois da troca, todas as suas sessões são encerradas e você entra de novo."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="current-password">Senha atual</Label>
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
            <Label htmlFor="new-password">Nova senha</Label>
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
              De {MIN_PASSWORD} a {MAX_PASSWORD} caracteres.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
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
            {pending ? "Salvando…" : "Trocar senha"}
          </Button>

          {forced ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => logout.mutate()}
              disabled={pending || logout.isPending}
            >
              Sair
            </Button>
          ) : (
            <Button asChild type="button" variant="ghost" className="w-full text-muted-foreground">
              <Link to="/">Cancelar</Link>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
