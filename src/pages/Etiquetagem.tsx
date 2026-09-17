import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/lib/db";
import { confirmLabeling, nextPieceCode } from "@/lib/domain";
import { PIECE_TYPES } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import { PieceCode } from "@/components/piece-code";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Piece } from "@/lib/types";

const STEPS = ["Foto", "Dados", "Confirmação"];

function resizeToThumb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas indisponível"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("imagem inválida"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("leitura falhou"));
    reader.readAsDataURL(file);
  });
}

export default function Etiquetagem() {
  const db = useDb();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [type, setType] = useState<string>("Brinco");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [backFromBath, setBackFromBath] = useState(false);
  const [result, setResult] = useState<Piece | null>(null);

  const nextCode = nextPieceCode(db);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await resizeToThumb(file));
    } catch {
      toast.error("Não foi possível processar a foto.");
    }
  };

  const reset = () => {
    setStep(0);
    setPhoto(null);
    setType("Brinco");
    setValue("");
    setNote("");
    setBackFromBath(false);
    setResult(null);
  };

  const handleConfirm = () => {
    const parsed = parseFloat(value.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Informe o valor da peça.");
      return;
    }
    const piece = confirmLabeling({
      type,
      value: parsed,
      photo: photo ?? undefined,
      note: note || undefined,
      backFromBath,
    });
    setResult(piece);
    toast.success("Peça etiquetada", {
      description: `${piece.code} registrada com sucesso.`,
    });
  };

  // Tela de sucesso
  if (result) {
    return (
      <div className="mx-auto max-w-md space-y-5 pt-4 text-center">
        <div className="rounded-full border border-success/40 bg-success-bg p-3 text-success">
          <CheckCircle2 className="mx-auto h-8 w-8" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Peça etiquetada
          </h1>
          <PieceCode code={result.code} className="mt-2 inline-block text-xl" />
        </div>
        {result.photo && (
          <img
            src={result.photo}
            alt={result.code}
            crossOrigin="anonymous"
            className="mx-auto h-48 w-48 rounded-lg border object-cover"
          />
        )}
        <p className="text-sm text-muted-foreground">
          {result.type} · {formatCurrency(result.value)} · disponível em estoque
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button className="h-12 text-base" onClick={reset}>
            <Camera className="h-5 w-5" />
            Nova etiquetagem
          </Button>
          <Button
            variant="outline"
            className="h-12 text-base"
            onClick={() => navigate("/estoque")}
          >
            <Package className="h-5 w-5" />
            Ver no estoque
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Etiquetagem
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Registre a peça retornada do banho de ouro
        </p>
      </header>

      {/* Passos */}
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
                "text-sm",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* Passo 1 — Foto */}
      {step === 0 && (
        <section className="rounded-lg border bg-card p-5 shadow-none">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {photo ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="block w-full overflow-hidden rounded-lg border"
            >
              <img
                src={photo}
                alt="Peça"
                crossOrigin="anonymous"
                className="mx-auto max-h-72 w-full object-cover"
              />
            </button>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-14 text-center transition-colors hover:bg-muted/40"
            >
              <Camera className="h-10 w-10 text-gold" />
              <span className="text-sm font-medium text-foreground">
                Fotografar a peça
              </span>
              <span className="text-xs text-muted-foreground">
                Toque para abrir a câmera ou galeria
              </span>
            </button>
          )}
          <Button
            className="mt-4 h-12 w-full text-base"
            disabled={!photo}
            onClick={() => setStep(1)}
          >
            Continuar
          </Button>
        </section>
      )}

      {/* Passo 2 — Dados */}
      {step === 1 && (
        <section className="space-y-4 rounded-lg border bg-card p-5 shadow-none">
          {photo && (
            <img
              src={photo}
              alt="Peça"
              crossOrigin="anonymous"
              className="mx-auto h-32 w-32 rounded-lg border object-cover"
            />
          )}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">Código gerado</span>
            <PieceCode code={nextCode} className="text-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="etq-type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="etq-type">
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
              <Label htmlFor="etq-value">Valor (R$)</Label>
              <Input
                id="etq-value"
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                placeholder="99,90"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="etq-note">Observação (opcional)</Label>
            <Input
              id="etq-note"
              placeholder="Cor, acabamento, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button className="h-12 w-full text-base" onClick={() => setStep(2)}>
            Continuar
          </Button>
        </section>
      )}

      {/* Passo 3 — Confirmação */}
      {step === 2 && (
        <section className="space-y-5 rounded-lg border bg-card p-5 shadow-none">
          {photo && (
            <img
              src={photo}
              alt="Peça"
              crossOrigin="anonymous"
              className="mx-auto h-40 w-40 rounded-lg border object-cover"
            />
          )}
          <div className="space-y-1 text-center">
            <PieceCode code={nextCode} className="text-lg" />
            <p className="text-sm text-muted-foreground">
              {type} ·{" "}
              {value
                ? formatCurrency(parseFloat(value.replace(",", ".")))
                : "valor não informado"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Peça retornou do banho de ouro
              </p>
              <p className="text-xs text-muted-foreground">
                Confirme para registrar como etiquetada
              </p>
            </div>
            <Switch checked={backFromBath} onCheckedChange={setBackFromBath} />
          </div>
          <Button
            className="h-14 w-full text-base"
            disabled={!backFromBath}
            onClick={handleConfirm}
          >
            <Check className="h-5 w-5" />
            Confirmar etiquetagem
          </Button>
        </section>
      )}

      {/* Navegação */}
      {step > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setStep(step - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      )}
    </div>
  );
}
