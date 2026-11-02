import { useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { useUploadPiecePhotoMutation } from "@/lib/api/hooks";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import { PhotoValidationError, resizePhoto } from "./photo";

export interface UploadedPhoto {
  photoId: string;
  photoUrl: string;
}

/**
 * Passo 2: fotografar, reduzir no navegador e enviar ao backend. Só o `photoId`/`photoUrl` sobe para o
 * formulário. Se a etiquetagem não acontecer, a foto fica órfã e o backend a apaga na limpeza diária.
 */
export function PhotoStep({
  photo,
  onUploaded,
  onContinue,
}: {
  photo: UploadedPhoto | null;
  onUploaded: (photo: UploadedPhoto) => void;
  onContinue: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const selections = useRef(0);
  const upload = useUploadPiecePhotoMutation();
  const idempotency = useIdempotencyKey();
  // Foto já reduzida que falhou no envio: o "tentar de novo" reenvia o mesmo arquivo com a mesma chave.
  const [failed, setFailed] = useState<{ file: File; selection: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = processing || upload.isPending;

  const send = (file: File, selection: number) => {
    setError(null);
    upload.mutate(
      { file, idempotencyKey: idempotency.keyFor({ selection }) },
      {
        onSuccess: (response) => {
          idempotency.reset();
          setFailed(null);
          onUploaded({ photoId: response.photoId, photoUrl: response.photoUrl });
        },
        onError: (cause) => {
          setFailed({ file, selection });
          setError(getPieceErrorMessage(cause));
        },
      },
    );
  };

  const handleFile = async (file: File | undefined) => {
    // Limpa o campo para a mesma foto poder ser escolhida de novo.
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setError(null);
    setFailed(null);
    setProcessing(true);
    try {
      const resized = await resizePhoto(file);
      selections.current += 1;
      send(resized, selections.current);
    } catch (cause) {
      setError(
        cause instanceof PhotoValidationError
          ? cause.message
          : "Não foi possível processar a foto.",
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="rounded-lg border bg-card p-5 shadow-none">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="hidden"
        aria-label="Arquivo da foto"
        data-testid="photo-input"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {photo ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="Trocar a foto"
          className="block w-full overflow-hidden rounded-lg border"
        >
          <img
            src={photo.photoUrl}
            alt="Foto enviada da peça"
            className="mx-auto max-h-72 w-full object-cover"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-14 text-center transition-colors hover:bg-muted/40"
        >
          <Camera className="h-10 w-10 text-gold" />
          <span className="text-sm font-medium text-foreground">
            {busy ? "Enviando foto…" : "Fotografar a peça"}
          </span>
          <span className="text-xs text-muted-foreground">
            Toque para abrir a câmera ou galeria
          </span>
        </button>
      )}

      {busy && photo && (
        <p role="status" className="mt-3 text-center text-sm text-muted-foreground">
          Enviando foto…
        </p>
      )}

      {error && (
        <div role="alert" className="mt-4 space-y-2 rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
          <p>{error}</p>
          {failed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => send(failed.file, failed.selection)}
            >
              <RotateCcw className="h-4 w-4" />
              Tentar de novo
            </Button>
          )}
        </div>
      )}

      <Button
        className="mt-4 h-12 w-full text-base"
        disabled={!photo || busy}
        onClick={onContinue}
      >
        Continuar
      </Button>
    </section>
  );
}
