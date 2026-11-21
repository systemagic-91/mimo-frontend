import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { PageMetadata } from "@/lib/api/types";

/** Anterior/Próxima para listas paginadas pela API. Some quando há uma página só. */
export function PaginationBar({
  pagination,
  onPageChange,
  disabled = false,
}: {
  pagination: PageMetadata | undefined;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  return (
    <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
      <span>{t("pagination.page", { page, total: totalPages })}</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("pagination.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}
