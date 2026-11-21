import { StatusBadge } from "@/components/status-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { useStoreTimezone } from "@/hooks/use-store-timezone";
import { fromBackendSellerStatus } from "@/lib/api/mappers";
import type { SellerListItem } from "@/lib/api/types";
import { formatCents, formatDate, formatRelativeDays } from "@/lib/format";

const STATUS_LABEL = { em_dia: "Em dia", atrasada: "Atrasado", inativa: "Inativa" } as const;

/** Uma vendedora na lista da consignação. Atraso e vencimento vêm da API; nada é recalculado aqui. */
export function SellerConsignmentRow({
  item,
  onOpen,
}: {
  item: SellerListItem;
  onOpen: () => void;
}) {
  const timeZone = useStoreTimezone();
  const { seller } = item;
  const status =
    fromBackendSellerStatus(seller.status) === "inativa"
      ? "inativa"
      : item.late
        ? "atrasada"
        : "em_dia";

  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 font-serif text-sm text-gold">
            {seller.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{seller.name}</p>
            <p className="truncate text-xs text-muted-foreground">{seller.phone}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-foreground">{item.piecesInHand}</TableCell>
      <TableCell className="text-right tabular-nums text-foreground">
        {formatCents(item.valueInHandCents)}
      </TableCell>
      <TableCell>
        {item.nextDueAt ? (
          <>
            <span className="text-foreground">{formatDate(item.nextDueAt, timeZone)}</span>
            {item.nextDueDays != null && (
              <span className="ml-2 text-xs text-muted-foreground">
                {formatRelativeDays(item.nextDueDays)}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <StatusBadge status={status} label={STATUS_LABEL[status]} />
      </TableCell>
    </TableRow>
  );
}
