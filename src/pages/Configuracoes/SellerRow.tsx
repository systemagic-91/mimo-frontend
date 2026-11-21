import { Pencil } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { fromBackendSellerStatus } from "@/lib/api/mappers";
import type { SellerListItem } from "@/lib/api/types";
import { SELLER_STATUS_LABEL } from "@/lib/status";

/** Uma linha da lista de vendedoras, com os agregados que vêm da API. */
export function SellerRow({
  item,
  busy,
  onEdit,
  onToggleActive,
}: {
  item: SellerListItem;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const { seller, piecesInHand } = item;
  const status = fromBackendSellerStatus(seller.status);
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="font-medium text-foreground">{seller.name}</TableCell>
      <TableCell className="text-muted-foreground">{seller.phone}</TableCell>
      <TableCell className="text-right tabular-nums text-foreground">
        {seller.commissionRate}%
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {piecesInHand}
      </TableCell>
      <TableCell>
        <StatusBadge status={status} label={SELLER_STATUS_LABEL[status]} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-3">
          <Switch
            checked={status === "ativa"}
            onCheckedChange={onToggleActive}
            disabled={busy}
            aria-label={status === "ativa" ? `Inativar ${seller.name}` : `Ativar ${seller.name}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={busy}
            aria-label={`Editar ${seller.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
