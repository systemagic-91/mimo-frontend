import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PaginationBar } from "@/components/pagination-bar";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSellersQuery } from "@/lib/api/hooks";
import type { SellerDto } from "@/lib/api/types";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

/** Passo 1: só vendedoras ativas podem receber lotes. */
export function SellerStep({
  selected,
  onSelect,
}: {
  selected: SellerDto | null;
  onSelect: (seller: SellerDto) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const sellers = useSellersQuery({
    status: "ativa",
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: ["name,asc"],
  });

  return (
    <section className="space-y-3">
      <div className="relative">
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

      {sellers.isPending ? (
        <RemoteQueryState state="loading" />
      ) : sellers.isError ? (
        <RemoteQueryState
          state="error"
          message={getConsignmentErrorMessage(sellers.error)}
          onRetry={() => void sellers.refetch()}
        />
      ) : sellers.data.items.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          {q ? t("wizard.sellerSearchEmpty") : t("wizard.sellerEmpty")}
        </p>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label={t("wizard.sellerLabel")}>
          {sellers.data.items.map(({ seller }) => {
            const checked = selected?.id === seller.id;
            return (
              <button
                key={seller.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onSelect(seller)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors",
                  checked ? "border-gold/50 bg-gold/5" : "hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-gold bg-gold text-primary-foreground" : "border-border",
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 font-serif text-gold">
                  {seller.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{seller.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t("wizard.sellerLine", { phone: seller.phone, rate: seller.commissionRate })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <PaginationBar pagination={sellers.data?.pagination} onPageChange={setPage} />
    </section>
  );
}
