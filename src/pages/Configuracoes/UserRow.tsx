import { KeyRound, Pencil, UserCheck, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="font-medium text-foreground">
        {user.name}
        {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">{t("users.row.you")}</span>}
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell className="text-foreground">{ROLE_LABEL[user.role]}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            status={user.active ? "ativa" : "inativa"}
            label={user.active ? t("users.row.active") : t("users.row.inactive")}
          />
          {user.mustChangePassword && (
            <StatusBadge
              status="atrasada"
              dot={false}
              label={t("users.row.pendingPassword")}
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
            aria-label={t("users.row.edit", { name: user.name })}
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
                aria-label={t("users.row.resetPassword", { name: user.name })}
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              {user.active ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDeactivate}
                  disabled={busy}
                  aria-label={t("users.row.deactivate", { name: user.name })}
                >
                  <UserX className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReactivate}
                  disabled={busy}
                  aria-label={t("users.row.reactivate", { name: user.name })}
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
