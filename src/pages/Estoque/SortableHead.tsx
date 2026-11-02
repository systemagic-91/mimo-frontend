import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortField = "code" | "type" | "valueCents" | "status" | "updatedAt";
export type SortDirection = "asc" | "desc";
export interface SortState {
  field: SortField;
  direction: SortDirection;
}

/** Cabeçalho de coluna que ordena pela API; clicar de novo inverte a direção. */
export function SortableHead({
  field,
  label,
  sort,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  sort: SortState;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </TableHead>
  );
}
