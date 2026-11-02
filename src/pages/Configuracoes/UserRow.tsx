import { KeyRound, Pencil, UserCheck, UserX } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { UserDto } from "@/lib/api/types";
import { ROLE_LABEL } from "@/lib/status";

/** Uma linha da lista de usuários. Na própria conta, só a edição (nome e e-mail) aparece. */
export function UserRow({
  user,
  isSelf,
  busy,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: {
  user: UserDto;
  isSelf: boolean;
  busy: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="font-medium text-foreground">
        {user.name}
        {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(você)</span>}
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell className="text-foreground">{ROLE_LABEL[user.role]}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            status={user.active ? "ativa" : "inativa"}
            label={user.active ? "Ativo" : "Inativo"}
          />
          {user.mustChangePassword && (
            <StatusBadge
              status="atrasada"
              dot={false}
              label="Troca de senha pendente"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={busy}
            aria-label={`Editar ${user.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!isSelf && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onResetPassword}
                disabled={busy}
                aria-label={`Redefinir senha de ${user.name}`}
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              {user.active ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDeactivate}
                  disabled={busy}
                  aria-label={`Desativar ${user.name}`}
                >
                  <UserX className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReactivate}
                  disabled={busy}
                  aria-label={`Reativar ${user.name}`}
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
