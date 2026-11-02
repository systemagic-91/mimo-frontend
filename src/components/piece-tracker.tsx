import { useState } from "react";
import { Briefcase, Droplets, Factory, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import { piecesApi } from "@/lib/api/pieces";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import type { PieceStage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STEPS: { stage: PieceStage; label: string; icon: typeof Factory }[] = [
  { stage: "fabrica", label: "Fábrica", icon: Factory },
  { stage: "banho_ouro", label: "Banho de ouro", icon: Droplets },
  { stage: "etiquetada", label: "Etiquetada", icon: Tag },
  { stage: "consignacao", label: "Com vendedora", icon: Briefcase },
];

export function PieceTracker({
  counts,
  onOpenPiece,
}: {
  counts: Record<PieceStage, number>;
  onOpenPiece: (pieceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // A API busca por trecho do código; aqui só abre a peça com o código exato.
  const handleSearch = async () => {
    const q = query.trim().toUpperCase();
    if (!q || searching) return;
    setSearching(true);
    try {
      const { items } = await piecesApi.list({ q, pageSize: 20 });
      const piece = items.find((p) => p.code.toUpperCase() === q);
      if (piece) {
        onOpenPiece(piece.id);
      } else {
        toast.error("Peça não encontrada", {
          description: `Nenhuma peça com o código ${q}.`,
        });
      }
    } catch (error) {
      toast.error(getPieceErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-none md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-serif text-lg font-medium text-foreground">
          Ciclo da peça
        </h3>
        <div className="flex w-full gap-2 sm:max-w-xs">
          <Input
            placeholder="Buscar código (ex: LU-0813)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            className="font-mono text-[13px]"
          />
          <Button
            variant="outline"
            size="icon"
            disabled={searching}
            onClick={() => void handleSearch()}
            aria-label="Buscar peça"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="absolute left-[12.5%] right-[12.5%] top-[19px] h-px bg-border" />
        <div className="relative grid grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.stage}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-background">
                <s.icon className="h-4 w-4 text-gold" />
              </span>
              <span className="text-lg font-semibold tabular-nums leading-none text-foreground">
                {counts[s.stage]}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
