import { FileDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function ExportButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <FileDown className="h-4 w-4" />
      {t("reports.export")}
    </Button>
  );
}
