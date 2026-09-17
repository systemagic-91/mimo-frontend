import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/lib/db";
import { createConsignment, getSeller } from "@/lib/domain";
import {
  addDays,
  formatCurrency,
  formatDate,
  fromDateInputValue,
  toDateInputValue,
} from "@/lib/format";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Vendedora", "Peças", "Prazo", "Revisão"];

export default function NovaConsignacao() {
  const db = useDb();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [sellerId, setSellerId] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(() =>
    toDateInputValue(addDays(new Date(), db.settings.defaultConsignmentDays)),
  );
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  const available = useMemo(
    () =>
      db.pieces
        .filter((p) => p.status === "etiquetada")
        .sort((a, b) => a.code.localeCompare(b.code)),
    [db],
  );

  const filteredAvailable = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (p) =>
        p.code.toLowerCase().includes(q) || p.type.toLowerCase().includes(q),
    );
  }, [available, query]);

  const selectedPieces = useMemo(
    () =>
      db.pieces.filter(
        (p) => selected.includes(p.id) && p.status === "etiquetada",
      ),
    [db, selected],
  );

  const totalValue = selectedPieces.reduce((s, p) => s + p.value, 0);
  const seller = getSeller(db, sellerId);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canContinue =
    (step === 0 && !!sellerId) ||
    (step === 1 && selected.length > 0) ||
    step === 2;

  const handleConfirm = () => {
    const consignment = createConsignment({
      sellerId,
      pieceIds: selected,
      dueAt: fromDateInputValue(dueDate),
      note: note || undefined,
    });
    if (!consignment) {
      toast.error("Não foi possível criar a consignação.");
      return;
    }
    toast.success("Consignação criada", {
      description: `${consignment.code} entregue para ${seller?.name}.`,
    });
    navigate(`/consignacao/${sellerId}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Nova consignação
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Entrega de maleta de peças para vendedora
        </p>
      </header>

      {/* Indicador de passos */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                i < step
                  ? "border-gold/40 bg-gold/15 text-gold"
                  : i === step
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:block",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* Passo 1 — Vendedora */}
      {step === 0 && (
        <section className="space-y-2">
          {db.sellers
            .filter((s) => s.status === "ativa")
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setSellerId(s.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors",
                  sellerId === s.id
                    ? "border-gold/50 bg-gold/5"
                    : "hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    sellerId === s.id
                      ? "border-gold bg-gold text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {sellerId === s.id && <Check className="h-3 w-3" />}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 font-serif text-gold">
                  {s.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {s.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {s.phone} · Comissão {s.commissionRate}%
                  </span>
                </span>
              </button>
            ))}
          {db.sellers.filter((s) => s.status === "ativa").length === 0 && (
            <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhuma vendedora ativa. Cadastre em Configurações.
            </p>
          )}
        </section>
      )}

      {/* Passo 2 — Peças */}
      {step === 1 && (
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou tipo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-hidden rounded-lg border bg-card shadow-none">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {filteredAvailable.length} peça
                {filteredAvailable.length === 1 ? "" : "s"} disponíve
                {filteredAvailable.length === 1 ? "l" : "is"}
              </span>
              <span className="text-sm font-medium text-foreground">
                {selected.length} selecionada{selected.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="max-h-96 divide-y divide-border overflow-y-auto">
              {filteredAvailable.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      checked ? "bg-gold/5" : "hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-gold bg-gold text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <PieceCode code={p.code} />
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      {p.type}
                    </span>
                    <span className="text-sm tabular-nums text-foreground">
                      {formatCurrency(p.value)}
                    </span>
                  </button>
                );
              })}
              {filteredAvailable.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma peça etiquetada disponível para consignação.
                </p>
              )}
            </div>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {selectedPieces.length} peça
                {selectedPieces.length === 1 ? "" : "s"} · valor total
              </span>
              <span className="font-semibold tabular-nums text-gold">
                {formatCurrency(totalValue)}
              </span>
            </div>
          )}
        </section>
      )}

      {/* Passo 3 — Prazo */}
      {step === 2 && (
        <section className="space-y-4 rounded-lg border bg-card p-5 shadow-none">
          <div className="space-y-1.5">
            <Label htmlFor="due">Prazo de devolução</Label>
            <Input
              id="due"
              type="date"
              value={dueDate}
              min={toDateInputValue(new Date())}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Prazo padrão: {db.settings.defaultConsignmentDays} dias
            </p>
          </div>
          <div className="flex gap-2">
            {[30, 45, 60].map((d) => (
              <Button
                key={d}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDueDate(toDateInputValue(addDays(new Date(), d)))
                }
              >
                +{d} dias
              </Button>
            ))}
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Condições do lote, combinações, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </section>
      )}

      {/* Passo 4 — Revisão */}
      {step === 3 && (
        <section className="space-y-4">
          <div className="rounded-lg border bg-card p-5 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Vendedora</p>
                <p className="font-medium text-foreground">{seller?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Devolução em</p>
                <p className="font-medium text-foreground">
                  {formatDate(dueDate)}
                </p>
              </div>
            </div>
            {note && (
              <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {note}
              </p>
            )}
            <Separator className="my-4" />
            <div className="space-y-1">
              {selectedPieces.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <PieceCode code={p.code} />
                    <span className="text-muted-foreground">{p.type}</span>
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatCurrency(p.value)}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedPieces.length} peça
                {selectedPieces.length === 1 ? "" : "s"}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimir relatório
            </Button>
          </div>
        </section>
      )}

      {/* Navegação */}
      <div className="no-print flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() =>
            step === 0 ? navigate("/consignacao") : setStep(step - 1)
          }
        >
          Voltar
        </Button>
        {step < 3 ? (
          <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
            Continuar
          </Button>
        ) : (
          <Button onClick={handleConfirm}>Confirmar entrega</Button>
        )}
      </div>

      {/* Relatório impresso */}
      <div
        className="print-only"
        style={{ color: "#1D1917", background: "#ffffff" }}
      >
        <div
          className="p-8"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <div
            className="flex items-center justify-between border-b pb-4"
            style={{ borderColor: "#e5ded5" }}
          >
            <div>
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: 26,
                  fontWeight: 500,
                }}
              >
                Luma
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                }}
              >
                semijoias
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontWeight: 600 }}>
                Relatório de itens entregues
              </div>
              <div style={{ fontSize: 12, color: "#6b6259" }}>
                Lote C-2026 · Consignação
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4" style={{ fontSize: 13 }}>
            <div>
              <div style={{ color: "#6b6259" }}>Vendedora</div>
              <div style={{ fontWeight: 600 }}>{seller?.name}</div>
            </div>
            <div>
              <div style={{ color: "#6b6259" }}>Prazo de devolução</div>
              <div style={{ fontWeight: 600 }}>{formatDate(dueDate)}</div>
            </div>
          </div>

          <table
            className="mt-5 w-full"
            style={{ borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr>
                <th
                  className="py-2 text-left"
                  style={{ borderBottom: "1px solid #e5ded5", fontWeight: 600 }}
                >
                  Código
                </th>
                <th
                  className="py-2 text-left"
                  style={{ borderBottom: "1px solid #e5ded5", fontWeight: 600 }}
                >
                  Tipo
                </th>
                <th
                  className="py-2 text-right"
                  style={{ borderBottom: "1px solid #e5ded5", fontWeight: 600 }}
                >
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedPieces.map((p) => (
                <tr key={p.id}>
                  <td
                    className="py-1.5"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {p.code}
                  </td>
                  <td className="py-1.5">{p.type}</td>
                  <td className="py-1.5 text-right">
                    {formatCurrency(p.value)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 font-semibold" colSpan={2}>
                  {selectedPieces.length} peça
                  {selectedPieces.length === 1 ? "" : "s"}
                </td>
                <td className="pt-2 text-right font-semibold">
                  {formatCurrency(totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-12 grid grid-cols-2 gap-10">
            <div
              style={{
                borderTop: "1px solid #1D1917",
                paddingTop: 6,
                fontSize: 11,
                color: "#6b6259",
              }}
            >
              Vendedora
            </div>
            <div
              style={{
                borderTop: "1px solid #1D1917",
                paddingTop: 6,
                fontSize: 11,
                color: "#6b6259",
              }}
            >
              Luma Semijoias
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
