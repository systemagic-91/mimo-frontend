import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackagePlus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PaginationBar } from "@/components/pagination-bar";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSellersQuery } from "@/lib/api/hooks";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { SellerConsignmentRow } from "./SellerConsignmentRow";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

/** Vendedoras com o que está com cada uma; os agregados vêm prontos de `GET /sellers`. */
export default function Consignacao() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [page, setPage] = useState(1);
  const sellers = useSellersQuery({
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: ["name,asc"],
  });
  const pagination = sellers.data?.pagination;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">{t("consignment.title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pagination
              ? t("consignment.sellersCount", { count: pagination.total })
              : t("consignment.subtitle")}
          </p>
        </div>
        <Button onClick={() => navigate("/consignacao/nova")}>
          <PackagePlus className="h-4 w-4" />
          {t("consignment.new")}
        </Button>
      </header>

      <section className="overflow-hidden rounded-lg border bg-card shadow-none">
        <div className="border-b px-5 py-3">
          <div className="relative max-w-md">
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
        </div>

        {sellers.isPending ? (
          <RemoteQueryState state="loading" />
        ) : sellers.isError ? (
          <RemoteQueryState
            state="error"
            message={getConsignmentErrorMessage(sellers.error)}
            onRetry={() => void sellers.refetch()}
          />
        ) : sellers.data.items.length === 0 ? (
          <RemoteQueryState
            state="empty"
            message={q ? t("consignment.emptySearch") : t("consignment.empty")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("consignment.column.seller")}</TableHead>
                  <TableHead className="text-right">{t("consignment.column.piecesInHand")}</TableHead>
                  <TableHead className="text-right">{t("consignment.column.valueInHand")}</TableHead>
                  <TableHead>{t("consignment.column.nextDue")}</TableHead>
                  <TableHead className="text-right">{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.data.items.map((item) => (
                  <SellerConsignmentRow
                    key={item.seller.id}
                    item={item}
                    onOpen={() => navigate(`/consignacao/${item.seller.id}`)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <PaginationBar pagination={pagination} onPageChange={setPage} />
      </section>
    </div>
  );
}
