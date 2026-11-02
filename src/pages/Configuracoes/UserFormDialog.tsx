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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createIdempotencyKey } from "@/lib/api/http";
import { useCreateUserMutation, useUpdateUserMutation } from "@/lib/api/hooks";
import type { UpdateUserRequest, UserDto, UserRole } from "@/lib/api/types";
import { ROLE_LABEL } from "@/lib/status";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import {
  getUserErrorMessage,
  TEMPORARY_PASSWORD_MAX,
  TEMPORARY_PASSWORD_MIN,
} from "./user-errors";

/**
 * Cria um usuário (com senha temporária) ou edita nome, e-mail e papel.
 * Montado só enquanto aberto, para o formulário (e a senha) não sobreviverem ao fechamento.
 */
export function UserFormDialog({
  user,
  isSelf,
  onClose,
}: {
  /** `null` cria um usuário novo. */
  user: UserDto | null;
  isSelf: boolean;
  onClose: () => void;
}) {
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "staff");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingRole, setConfirmingRole] = useState(false);
  const pending = createUser.isPending || updateUser.isPending;

  const handleError = (cause: unknown) => {
    setConfirmingRole(false);
    setError(getUserErrorMessage(cause));
  };

  const create = () => {
    if (
      temporaryPassword.length < TEMPORARY_PASSWORD_MIN ||
      temporaryPassword.length > TEMPORARY_PASSWORD_MAX
    ) {
      setError(
        `A senha temporária precisa ter de ${TEMPORARY_PASSWORD_MIN} a ${TEMPORARY_PASSWORD_MAX} caracteres.`,
      );
      return;
    }
    createUser.mutate(
      {
        input: { name: name.trim(), email: email.trim(), role, temporaryPassword },
        // Chave nova a cada envio: o backend não considera a senha na idempotência.
        idempotencyKey: createIdempotencyKey(),
      },
      {
        onSuccess: (created) => {
          toast.success(
            `${created.name} cadastrado(a). Entregue a senha temporária pessoalmente.`,
          );
          onClose();
        },
        onError: handleError,
        onSettled: () => setTemporaryPassword(""),
      },
    );
  };

  const update = (current: UserDto) => {
    const input: UpdateUserRequest = {};
    if (name.trim() !== current.name) input.name = name.trim();
    if (email.trim() !== current.email) input.email = email.trim();
    if (!isSelf && role !== current.role) input.role = role;
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    updateUser.mutate(
      { id: current.id, input },
      {
        onSuccess: () => {
          toast.success("Usuário atualizado.");
          onClose();
        },
        onError: handleError,
      },
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Informe o nome e o e-mail.");
      return;
    }
    if (!user) return create();
    // Mudar o papel desloga a pessoa: confirmar antes.
    if (!isSelf && role !== user.role) return setConfirmingRole(true);
    update(user);
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {user
                ? "Atualize os dados de acesso."
                : "A pessoa entra com a senha temporária e precisa trocá-la no primeiro acesso."}
            </DialogDescription>
          </DialogHeader>

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nome</Label>
              <Input
                id="user-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">E-mail</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                maxLength={320}
                onChange={(event) => setEmail(event.target.value)}
                disabled={pending}
                required
              />
            </div>
            {!isSelf && (
              <div className="space-y-1.5">
                <Label htmlFor="user-role">Papel</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                  disabled={pending}
                >
                  <SelectTrigger id="user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{ROLE_LABEL.staff}</SelectItem>
                    <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!user && (
              <div className="space-y-1.5">
                <Label htmlFor="user-temporary-password">Senha temporária</Label>
                <Input
                  id="user-temporary-password"
                  type="password"
                  autoComplete="new-password"
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  disabled={pending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  De {TEMPORARY_PASSWORD_MIN} a {TEMPORARY_PASSWORD_MAX} caracteres. Não é enviada por e-mail.
                </p>
              </div>
            )}

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
            <Button type="submit" form="user-form" disabled={pending}>
              {pending ? "Salvando…" : user ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user && (
        <ConfirmActionDialog
          open={confirmingRole}
          title="Mudar o papel?"
          description={`${user.name} passa a ser ${ROLE_LABEL[role]} e será deslogado(a) na hora.`}
          confirmLabel="Mudar papel"
          pending={updateUser.isPending}
          onConfirm={() => update(user)}
          onCancel={() => setConfirmingRole(false)}
        />
      )}
    </>
  );
}
