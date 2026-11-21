import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { ApiError } from "@/lib/api/http";
import { useCreateConsignmentMutation } from "@/lib/api/hooks";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ConsignmentDetailsDto,
  CreateConsignmentRequest,
  PieceDto,
  SellerDto,
  SettingsDto,
} from "@/lib/api/types";
import {
  getConsignmentErrorMessage,
  getConsignmentFieldErrors,
  getProblemPieceIds,
} from "@/lib/consignment-errors";
import { addDaysToDate, todayInZone } from "@/lib/store-time";
import { CreatedLot } from "./CreatedLot";
import { PiecesStep } from "./PiecesStep";
import { ReviewStep } from "./ReviewStep";
import { SellerStep } from "./SellerStep";
import { TermsStep } from "./TermsStep";
import { WizardSteps } from "./WizardSteps";

const STEPS = ["Vendedora", "Peças", "Prazo", "Revisão"];
const SELLER = 0;
const PIECES = 1;
const TERMS = 2;
const REVIEW = 3;

/** Erros que levam de volta a um passo anterior. */
const SELLER_ERRORS = new Set(["SELLER_INACTIVE", "SELLER_NOT_FOUND"]);
const PIECE_ERRORS = new Set(["PIECE_NOT_AVAILABLE", "PIECE_NOT_FOUND", "EMPTY_ITEMS"]);

export function ConsignmentWizard({ settings }: { settings: SettingsDto }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createConsignment = useCreateConsignmentMutation();
  const idempotency = useIdempotencyKey();
  const timeZone = settings.timezone;
  const today = todayInZone(timeZone);

  const [step, setStep] = useState(SELLER);
  const [seller, setSeller] = useState<SellerDto | null>(null);
  const [pieces, setPieces] = useState<Map<string, PieceDto>>(new Map());
  const [dueDate, setDueDate] = useState(() => addDaysToDate(today, settings.defaultConsignmentDays));
  // Com um prazo só, ele já vem escolhido; com mais de um, a pessoa precisa escolher.
  const [paymentTermDays, setPaymentTermDays] = useState<number | null>(
    settings.paymentTerms.length === 1 ? settings.paymentTerms[0] : null,
  );
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [created, setCreated] = useState<ConsignmentDetailsDto | null>(null);
  const pending = createConsignment.isPending;

  const togglePiece = (piece: PieceDto) =>
    setPieces((current) => {
      const next = new Map(current);
      if (next.has(piece.id)) next.delete(piece.id);
      else next.set(piece.id, piece);
      return next;
    });

  const validateTerms = () => {
    const errors: Record<string, string> = {};
    if (!dueDate || dueDate < today || dueDate > addDaysToDate(today, 365)) {
      errors.dueDate = "O vencimento precisa estar entre hoje e daqui a 365 dias.";
    }
    if (paymentTermDays === null || !settings.paymentTerms.includes(paymentTermDays)) {
      errors.paymentTermDays = "Escolha o prazo de pagamento.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    setStepError(null);
    if (step === TERMS && !validateTerms()) return;
    setStep(step + 1);
  };

  const handleError = (cause: unknown) => {
    const message = getConsignmentErrorMessage(cause);
    const code = cause instanceof ApiError ? cause.code : "";
    const fields = getConsignmentFieldErrors(cause);

    if (SELLER_ERRORS.has(code)) {
      setSeller(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all });
      setStepError(message);
      setStep(SELLER);
      return;
    }
    if (PIECE_ERRORS.has(code) || fields.pieceIds) {
      // Tira da seleção as peças que o backend recusou e recarrega a lista de disponíveis.
      const problemIds = getProblemPieceIds(cause);
      const removed = problemIds.map((id) => pieces.get(id)?.code).filter(Boolean);
      setPieces((current) => {
        const next = new Map(current);
        problemIds.forEach((id) => next.delete(id));
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pieces.all });
      setStepError(
        removed.length
          ? `${removed.join(", ")} não ${removed.length === 1 ? "está" : "estão"} mais disponíve${removed.length === 1 ? "l" : "is"} e ${removed.length === 1 ? "foi tirada" : "foram tiradas"} da seleção.`
          : message,
      );
      setStep(PIECES);
      return;
    }
    if (code === "DUE_DATE_IN_PAST" || fields.dueDate || fields.paymentTermDays || fields.note) {
      setFieldErrors(code === "DUE_DATE_IN_PAST" ? { dueDate: message } : fields);
      setStep(TERMS);
      return;
    }
    // Falha de rede ou do servidor: fica na revisão, e "Confirmar" de novo reaproveita a chave.
    setStepError(message);
  };

  const confirm = () => {
    if (pending || !seller || paymentTermDays === null) return;
    setStepError(null);
    const input: CreateConsignmentRequest = {
      sellerId: seller.id,
      pieceIds: [...pieces.keys()],
      dueDate,
      paymentTermDays,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    createConsignment.mutate(
      { input, idempotencyKey: idempotency.keyFor(input) },
      {
        onSuccess: (details) => {
          idempotency.reset();
          setCreated(details);
          toast.success("Consignação criada", {
            description: `${details.code} entregue para ${details.seller.name}.`,
          });
        },
        onError: handleError,
      },
    );
  };

  const restart = () => {
    setCreated(null);
    setStep(SELLER);
    setSeller(null);
    setPieces(new Map());
    setNote("");
    setFieldErrors({});
    setStepError(null);
  };

  if (created) return <CreatedLot consignment={created} timeZone={timeZone} onNew={restart} />;

  const canContinue =
    (step === SELLER && seller !== null) || (step === PIECES && pieces.size > 0) || step === TERMS;

  return (
    <div className="space-y-5">
      <WizardSteps steps={STEPS} current={step} />

      {stepError && (
        <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
          {stepError}
        </p>
      )}

      {step === SELLER && <SellerStep selected={seller} onSelect={setSeller} />}
      {step === PIECES && <PiecesStep selected={pieces} onToggle={togglePiece} />}
      {step === TERMS && (
        <TermsStep
          today={today}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          defaultConsignmentDays={settings.defaultConsignmentDays}
          paymentTerms={settings.paymentTerms}
          paymentTermDays={paymentTermDays}
          onPaymentTermChange={setPaymentTermDays}
          note={note}
          onNoteChange={setNote}
          errors={fieldErrors}
        />
      )}
      {step === REVIEW && seller && paymentTermDays !== null && (
        <ReviewStep
          seller={seller}
          pieces={[...pieces.values()]}
          dueDate={dueDate}
          paymentTermDays={paymentTermDays}
          note={note}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            setStepError(null);
            if (step === SELLER) navigate("/consignacao");
            else setStep(step - 1);
          }}
        >
          Voltar
        </Button>
        {step < REVIEW ? (
          <Button disabled={!canContinue} onClick={goNext}>
            Continuar
          </Button>
        ) : (
          <Button disabled={pending || pieces.size === 0} onClick={confirm}>
            {pending ? "Enviando…" : "Confirmar entrega"}
          </Button>
        )}
      </div>
    </div>
  );
}
