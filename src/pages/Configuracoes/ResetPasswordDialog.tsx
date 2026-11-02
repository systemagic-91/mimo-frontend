import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createIdempotencyKey } from "@/lib/api/http";
import { useResetUserPasswordMutation } from "@/lib/api/hooks";
import type { UserDto } from "@/lib/api/types";
import {
  getUserErrorMessage,
  TEMPORARY_PASSWORD_MAX,
  TEMPORARY_PASSWORD_MIN,
} from "./user-errors";

/** Define uma senha temporária nova. O próprio diálogo é a confirmação: avisa que a pessoa será deslogada. */
export function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: UserDto;
  onClose: () => void;
}) {
  const resetPassword = useResetUserPasswordMutation();
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = resetPassword.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      temporaryPassword.length < TEMPORARY_PASSWORD_MIN ||
      temporaryPassword.length > TEMPORARY_PASSWORD_MAX
    ) {
      setError(
        `A senha temporária precisa ter de ${TEMPORARY_PASSWORD_MIN} a ${TEMPORARY_PASSWORD_MAX} caracteres.`,
      );
      return;
    }
    setError(null);
    resetPassword.mutate(
      {
        id: user.id,
        temporaryPassword,
        // Chave nova a cada envio: o backend não considera a senha na idempotência.
        idempotencyKey: createIdempotencyKey(),
      },
      {
        onSuccess: () => {
          toast.success(
            `Senha de ${user.name} redefinida. Entregue a senha temporária pessoalmente.`,
          );
          onClose();
        },
        onError: (cause) => setError(getUserErrorMessage(cause)),
        onSettled: () => setTemporaryPassword(""),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            {user.name} será deslogado(a) na hora e terá de trocar esta senha temporária no próximo acesso.
          </DialogDescription>
        </DialogHeader>

        <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-temporary-password">Nova senha temporária</Label>
            <Input
              id="reset-temporary-password"
              type="password"
              autoComplete="new-password"
              value={temporaryPassword}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              disabled={pending}
              required
            />
            <p className="text-xs text-muted-foreground">
              De {TEMPORARY_PASSWORD_MIN} a {TEMPORARY_PASSWORD_MAX} caracteres.
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="reset-password-form" disabled={pending}>
            {pending ? "Salvando…" : "Redefinir e deslogar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
