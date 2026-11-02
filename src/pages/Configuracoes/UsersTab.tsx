import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCurrentUserQuery,
  useUpdateUserMutation,
  useUsersQuery,
} from "@/lib/api/hooks";
import type { UserDto, UserRole } from "@/lib/api/types";
import type { UserListParams } from "@/lib/api/users";
import { ROLE_LABEL } from "@/lib/status";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { UserFormDialog } from "./UserFormDialog";
import { UserRow } from "./UserRow";
import { getUserErrorMessage } from "./user-errors";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

type RoleFilter = "todos" | UserRole;
type StatusFilter = "todos" | "ativos" | "inativos";

type DialogState =
  | { kind: "form"; user: UserDto | null }
  | { kind: "reset"; user: UserDto }
  | { kind: "deactivate"; user: UserDto }
  | null;

export function UsersTab() {
  const currentUserId = useCurrentUserQuery().data?.user.id;
  const updateUser = useUpdateUserMutation();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("todos");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const params: UserListParams = {
    q: q || undefined,
    role: role === "todos" ? undefined : role,
    active: status === "todos" ? undefined : status === "ativos",
    page,
    pageSize: PAGE_SIZE,
    sort: ["name,asc"],
  };
  const users = useUsersQuery(params);
  const pagination = users.data?.pagination;

  const setActive = (user: UserDto, active: boolean) =>
    updateUser.mutate(
      { id: user.id, input: { active } },
      {
        onSuccess: () => {
          toast.success(active ? `${user.name} reativado(a).` : `${user.name} desativado(a).`);
          setDialog(null);
        },
        onError: (cause) => {
          setDialog(null);
          toast.error(getUserErrorMessage(cause));
        },
      },
    );

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-foreground">Usuários</h2>
          <p className="text-sm text-muted-foreground">
            {pagination
              ? `${pagination.total} usuário${pagination.total === 1 ? "" : "s"}`
              : "Contas de acesso ao sistema"}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ kind: "form", user: null })}>
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 border-b px-5 py-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar usuários"
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value as RoleFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filtrar por papel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os papéis</SelectItem>
            <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>
            <SelectItem value="staff">{ROLE_LABEL.staff}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.isPending ? (
        <RemoteQueryState state="loading" />
      ) : users.isError ? (
        <RemoteQueryState
          state="error"
          message={getUserErrorMessage(users.error)}
          onRetry={() => void users.refetch()}
        />
      ) : users.data.items.length === 0 ? (
        <RemoteQueryState state="empty" message="Nenhum usuário encontrado." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  busy={updateUser.isPending}
                  onEdit={() => setDialog({ kind: "form", user })}
                  onResetPassword={() => setDialog({ kind: "reset", user })}
                  onDeactivate={() => setDialog({ kind: "deactivate", user })}
                  onReactivate={() => setActive(user, true)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {dialog?.kind === "form" && (
        <UserFormDialog
          user={dialog.user}
          isSelf={dialog.user?.id === currentUserId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "reset" && (
        <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "deactivate" && (
        <ConfirmActionDialog
          open
          title="Desativar usuário?"
          description={`${dialog.user.name} será deslogado(a) na hora e não conseguirá mais entrar até ser reativado(a).`}
          confirmLabel="Desativar"
          pending={updateUser.isPending}
          onConfirm={() => setActive(dialog.user, false)}
          onCancel={() => setDialog(null)}
        />
      )}
    </section>
  );
}
