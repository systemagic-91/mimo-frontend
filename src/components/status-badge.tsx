import { cn } from "@/lib/utils";

const STYLE: Record<string, string> = {
  // Concluído / em dia
  vendida: "bg-success-bg text-success border-success/30",
  quitada: "bg-success-bg text-success border-success/30",
  em_dia: "bg-success-bg text-success border-success/30",
  ativa: "bg-success-bg text-success border-success/30",
  // Pendência
  atrasada: "bg-late-bg text-late border-late/30",
  // Em andamento / dourado
  consignacao: "bg-gold/15 text-gold border-gold/30",
  // Neutros
  fabrica: "bg-muted text-muted-foreground border-border",
  banho_ouro: "bg-muted text-muted-foreground border-border",
  etiquetada: "bg-muted text-muted-foreground border-border",
  devolvida: "bg-muted text-muted-foreground border-border",
  inativa: "bg-muted text-muted-foreground border-border",
  aberta: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  label,
  dot = true,
  className,
}: {
  status: string;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        STYLE[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {label}
    </span>
  );
}
