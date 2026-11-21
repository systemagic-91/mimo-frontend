import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PaginationBar } from "@/components/pagination-bar";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useSellersQuery,
  useSettingsQuery,
  useUpdateSellerMutation,
} from "@/lib/api/hooks";
import type { SellerListParams } from "@/lib/api/sellers";
import type { SellerDto, SellerStatus } from "@/lib/api/types";
import { getAdminErrorMessage } from "./admin-errors";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { SellerFormDialog } from "./SellerFormDialog";
import { SellerRow } from "./SellerRow";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

type StatusFilter = "todas" | SellerStatus;

type DialogState =
  | { kind: "form"; seller: SellerDto | null }
  | { kind: "deactivate"; seller: SellerDto; piecesInHand: number }
  | null;

export function SellersTab() {
  const { t } = useTranslation();
  // As opções de comissão vêm da faixa de `GET /settings`.
  const settings = useSettingsQuery();
  const updateSeller = useUpdateSellerMutation();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);

  const params: SellerListParams = {
    q: q || undefined,
    status: status === "todas" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
    sort: ["name,asc"],
  };
  const sellers = useSellersQuery(params);
  const pagination = sellers.data?.pagination;

  const setActive = (seller: SellerDto, active: boolean) =>
    updateSeller.mutate(
      { id: seller.id, input: { status: active ? "ativa" : "inativa" } },
      {
        onSuccess: () => {
          toast.success(t(active ? "sellers.activated" : "sellers.deactivated", { name: seller.name }));
          setDialog(null);
        },
        onError: (cause) => {
          setDialog(null);
          toast.error(getAdminErrorMessage(cause));
        },
      },
    );

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-foreground">{t("sellers.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {pagination
              ? t("sellers.count", { count: pagination.total })
              : t("sellers.subtitle")}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setDialog({ kind: "form", seller: null })}
          disabled={!settings.data}
        >
          <Plus className="h-4 w-4" />
          {t("sellers.new")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 border-b px-5 py-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("sellers.search")}
            placeholder={t("sellers.searchPlaceholder")}
            className="pl-9"
            maxLength={120}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label={t("common.filterStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">{t("sellers.filter.all")}</SelectItem>
            <SelectItem value="ativa">{t("sellers.filter.active")}</SelectItem>
            <SelectItem value="inativa">{t("sellers.filter.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.isError && (
        <p role="alert" className="border-b px-5 py-3 text-sm text-late">
          {t("sellers.rangeError")}{" "}
          <button type="button" className="underline" onClick={() => void settings.refetch()}>
            {t("common.retry")}
          </button>
        </p>
      )}

      {sellers.isPending ? (
        <RemoteQueryState state="loading" />
      ) : sellers.isError ? (
        <RemoteQueryState
          state="error"
          message={getAdminErrorMessage(sellers.error)}
          onRetry={() => void sellers.refetch()}
        />
      ) : sellers.data.items.length === 0 ? (
        <RemoteQueryState
          state="empty"
          message={
            q || status !== "todas"
              ? t("sellers.emptySearch")
              : t("sellers.empty")
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.phone")}</TableHead>
                <TableHead className="text-right">{t("common.commission")}</TableHead>
                <TableHead className="text-right">{t("sellers.column.piecesInHand")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.data.items.map((item) => (
                <SellerRow
                  key={item.seller.id}
                  item={item}
                  busy={updateSeller.isPending || !settings.data}
                  onEdit={() => setDialog({ kind: "form", seller: item.seller })}
                  onToggleActive={(active) =>
                    active
                      ? setActive(item.seller, true)
                      : setDialog({
                          kind: "deactivate",
                          seller: item.seller,
                          piecesInHand: item.piecesInHand,
                        })
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar pagination={pagination} onPageChange={setPage} />

      {dialog?.kind === "form" && settings.data && (
        <SellerFormDialog
          seller={dialog.seller}
          settings={settings.data}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "deactivate" && (
        <ConfirmActionDialog
          open
          title={t("sellers.deactivate.title")}
          description={`${t("sellers.deactivate.description", { name: dialog.seller.name })} ${t(
            "sellers.deactivate.openLots",
            { count: dialog.piecesInHand },
          )}`}
          confirmLabel={t("sellers.deactivate.confirm")}
          pending={updateSeller.isPending}
          onConfirm={() => setActive(dialog.seller, false)}
          onCancel={() => setDialog(null)}
        />
      )}
    </section>
  );
}
