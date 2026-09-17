import { useMemo, useState } from "react";
import { PackagePlus, Search } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/lib/db";
import { receivePiece } from "@/lib/domain";
import { PIECE_STAGES, PIECE_TYPES, STAGE_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { PieceCode } from "@/components/piece-code";
import { StatusBadge } from "@/components/status-badge";
import { PieceDetailSheet } from "@/components/piece-detail-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Piece, PieceStage } from "@/lib/types";

export default function Estoque() {
  const db = useDb();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<Piece | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Dialog de recebimento
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<string>("Brinco");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<PieceStage>("fabrica");
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.pieces
      .filter((p) => {
        const matchStatus =
          statusFilter === "todos" || p.status === statusFilter;
        if (!matchStatus) return false;
        if (!q) return true;
        return (
          p.code.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [db, query, statusFilter]);

  const totalValue = filtered.reduce((s, p) => s + p.value, 0);

  const handleReceive = () => {
    const parsed = parseFloat(value.replace(",", "."));
    if (!type || isNaN(parsed) || parsed <= 0) {
      toast.error("Informe o tipo e o valor da peça.");
      return;
    }
    const piece = receivePiece({
      type,
      value: parsed,
      stage,
      note: note || undefined,
    });
    toast.success("Peça recebida", {
      description: `${piece.code} registrada como ${STAGE_LABEL[piece.status]}.`,
    });
    setDialogOpen(false);
    setValue("");
    setNote("");
    setStage("fabrica");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Estoque
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtered.length} peça{filtered.length === 1 ? "" : "s"} ·{" "}
            {formatCurrency(totalValue)}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PackagePlus className="h-4 w-4" />
          Receber peça
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou tipo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {PIECE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section className="overflow-hidden rounded-lg border bg-card shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden md:table-cell">
                Localização
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Atualizado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma peça encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelected(p);
                  setSheetOpen(true);
                }}
              >
                <TableCell>
                  <PieceCode code={p.code} />
                </TableCell>
                <TableCell className="text-foreground">{p.type}</TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {formatCurrency(p.value)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {p.currentLocation}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={p.status}
                    label={STAGE_LABEL[p.status]}
                  />
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                  {formatDate(p.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <PieceDetailSheet
        piece={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber peça</DialogTitle>
            <DialogDescription>
              Registre a chegada da peça da fábrica ou o retorno do banho de
              ouro. O código é gerado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-type">Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="rec-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIECE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-value">Valor (R$)</Label>
                <Input
                  id="rec-value"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="99,90"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-stage">Onde chegou</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as PieceStage)}
              >
                <SelectTrigger id="rec-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fabrica">Fábrica</SelectItem>
                  <SelectItem value="banho_ouro">Banho de ouro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-note">Observação (opcional)</Label>
              <Input
                id="rec-note"
                placeholder="Lote do fornecedor, cor, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceive}>Confirmar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
