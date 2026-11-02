import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, CheckCircle2, ChevronLeft, Package } from "lucide-react";
import { toast } from "sonner";
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
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { ApiError } from "@/lib/api/http";
import { useLabelPieceMutation } from "@/lib/api/hooks";
import { centsToMoney } from "@/lib/api/mappers";
import { queryKeys } from "@/lib/api/query-keys";
import type { LabelPieceRequest, PieceDto } from "@/lib/api/types";
import { formatCurrency } from "@/lib/format";
import {
  centsToInputValue,
  getPieceErrorMessage,
  parseMoneyToCents,
} from "@/lib/piece-errors";
import { PIECE_TYPES } from "@/lib/status";
import { cn } from "@/lib/utils";
import { PhotoStep, type UploadedPhoto } from "./PhotoStep";
import { SourcePieceStep } from "./SourcePieceStep";

const STEPS = ["Peça", "Foto", "Dados", "Confirmação"];

/** O que fazer depois de um erro na etiquetagem. */
type Recovery = "retry" | "choose-piece" | "resend-photo";

function recoveryFor(error: unknown): Recovery {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_PIECE_TRANSITION" || error.code === "PIECE_NOT_FOUND") {
      return "choose-piece";
    }
    if (error.code === "PHOTO_NOT_FOUND") return "resend-photo";
  }
  return "retry";
}

export default function Etiquetagem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const label = useLabelPieceMutation();
  const idempotency = useIdempotencyKey();

  const [step, setStep] = useState(0);
  const [source, setSource] = useState<PieceDto | null>(null);
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [type, setType] = useState<string>(PIECE_TYPES[0]);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [backFromBath, setBackFromBath] = useState(false);
  const [error, setError] = useState<{ message: string; recovery: Recovery } | null>(null);
  const [result, setResult] = useState<PieceDto | null>(null);
  const valueCents = parseMoneyToCents(value);

  const selectSource = (piece: PieceDto) => {
    setSource(piece);
    setType(PIECE_TYPES.includes(piece.type) ? piece.type : PIECE_TYPES[0]);
    setValue(centsToInputValue(piece.valueCents));
  };

  const reset = () => {
    setStep(0);
    setSource(null);
    setPhoto(null);
    setType(PIECE_TYPES[0]);
    setValue("");
    setNote("");
    setBackFromBath(false);
    setError(null);
    setResult(null);
    idempotency.reset();
  };

  const handleConfirm = () => {
    if (!source || !photo || valueCents === null) return;
    setError(null);
    const input: LabelPieceRequest = {
      sourcePieceId: source.id,
      type,
      valueCents,
      photoId: photo.photoId,
      note: note.trim() || undefined,
      backFromBath: true,
    };
    label.mutate(
      { input, idempotencyKey: idempotency.keyFor(input) },
      {
        onSuccess: (piece) => {
          idempotency.reset();
          setResult(piece);
          toast.success("Peça etiquetada", {
            description: `${piece.code} disponível em estoque.`,
          });
        },
        onError: (cause) => {
          const recovery = recoveryFor(cause);
          // A lista de peças no banho mudou (alguém etiquetou antes): busca de novo.
          if (recovery === "choose-piece") {
            void queryClient.invalidateQueries({ queryKey: queryKeys.pieces.all });
          }
          setError({ message: getPieceErrorMessage(cause), recovery });
        },
      },
    );
  };

  const recover = (recovery: Recovery) => {
    setError(null);
    if (recovery === "choose-piece") {
      setSource(null);
      setStep(0);
    } else if (recovery === "resend-photo") {
      setPhoto(null);
      setStep(1);
    }
  };

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
        {result.photoUrl && (
          <img
            src={result.photoUrl}
            alt={`Foto da peça ${result.code}`}
            className="mx-auto h-48 w-48 rounded-lg border object-cover"
          />
        )}
        <p className="text-sm text-muted-foreground">
          {result.type} · {formatCurrency(centsToMoney(result.valueCents))} ·{" "}
          {result.currentLocation}
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
          Registre a peça que voltou do banho de ouro
        </p>
      </header>

      <ol className="flex items-center gap-2" aria-label="Passos">
        {STEPS.map((stepLabel, i) => (
          <li
            key={stepLabel}
            className="flex flex-1 items-center gap-2"
            aria-current={i === step ? "step" : undefined}
          >
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
                "hidden text-sm sm:inline",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stepLabel}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <SourcePieceStep
          selected={source}
          onSelect={selectSource}
          onContinue={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <PhotoStep photo={photo} onUploaded={setPhoto} onContinue={() => setStep(2)} />
      )}

      {step === 2 && source && (
        <section className="space-y-4 rounded-lg border bg-card p-5 shadow-none">
          {photo && (
            <img
              src={photo.photoUrl}
              alt="Foto enviada da peça"
              className="mx-auto h-32 w-32 rounded-lg border object-cover"
            />
          )}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">Código da peça</span>
            <PieceCode code={source.code} className="text-base" />
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
              <Label htmlFor="etq-value">Valor de venda (R$)</Label>
              <Input
                id="etq-value"
                inputMode="decimal"
                placeholder="84,90"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={value !== "" && valueCents === null}
              />
            </div>
          </div>
          {value !== "" && valueCents === null && (
            <p role="alert" className="text-sm text-late">
              Informe um valor maior que zero, com até 2 casas decimais (ex.: 84,90).
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="etq-note">Observação (opcional)</Label>
            <Input
              id="etq-note"
              placeholder="Cor, acabamento, etc."
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <Button
            className="h-12 w-full text-base"
            disabled={valueCents === null}
            onClick={() => setStep(3)}
          >
            Continuar
          </Button>
        </section>
      )}

      {step === 3 && source && (
        <section className="space-y-5 rounded-lg border bg-card p-5 shadow-none">
          {photo && (
            <img
              src={photo.photoUrl}
              alt="Foto enviada da peça"
              className="mx-auto h-40 w-40 rounded-lg border object-cover"
            />
          )}
          <div className="space-y-1 text-center">
            <PieceCode code={source.code} className="text-lg" />
            <p className="text-sm text-muted-foreground">
              {type} ·{" "}
              {valueCents !== null
                ? formatCurrency(centsToMoney(valueCents))
                : "valor não informado"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div>
              <Label htmlFor="etq-back-from-bath" className="text-sm font-medium text-foreground">
                Peça retornou do banho de ouro
              </Label>
              <p className="text-xs text-muted-foreground">
                Confirme para registrar como etiquetada
              </p>
            </div>
            <Switch
              id="etq-back-from-bath"
              checked={backFromBath}
              onCheckedChange={setBackFromBath}
              disabled={label.isPending}
            />
          </div>

          {error && (
            <div role="alert" className="space-y-2 rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
              <p>{error.message}</p>
              {error.recovery !== "retry" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => recover(error.recovery)}
                >
                  {error.recovery === "choose-piece"
                    ? "Escolher outra peça"
                    : "Enviar a foto de novo"}
                </Button>
              )}
            </div>
          )}

          <Button
            className="h-14 w-full text-base"
            disabled={
              !backFromBath ||
              label.isPending ||
              (error !== null && error.recovery !== "retry")
            }
            onClick={handleConfirm}
          >
            <Check className="h-5 w-5" />
            {label.isPending
              ? "Salvando…"
              : error?.recovery === "retry"
                ? "Tentar de novo"
                : "Confirmar etiquetagem"}
          </Button>
        </section>
      )}

      {step > 0 && (
        <Button
          variant="outline"
          className="w-full"
          disabled={label.isPending}
          onClick={() => {
            setError(null);
            setStep(step - 1);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      )}
    </div>
  );
}
