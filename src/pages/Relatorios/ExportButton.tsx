import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <FileDown className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}
