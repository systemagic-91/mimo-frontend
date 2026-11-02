/** Limites do backend (BACK_07): JPEG, PNG ou WebP, até 1 MB e 2000×2000 px. */
export const MAX_PHOTO_BYTES = 1024 * 1024;
/** A foto é reduzida no navegador para este lado maior (fica com 20 a 40 KB). */
export const THUMB_MAX_SIDE = 320;
/** Foto de câmera que nem vale a pena tentar ler. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export class PhotoValidationError extends Error {}

/** Valida o arquivo escolhido antes de processar ou enviar. */
export function validatePhotoSource(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new PhotoValidationError("Escolha uma imagem (JPEG, PNG ou WebP).");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoValidationError("A imagem é grande demais. Escolha uma foto menor.");
  }
}

/**
 * Reduz a foto para no máximo 320 px e devolve um JPEG pronto para o upload.
 * Usa um object URL (liberado em seguida), sem guardar base64.
 */
export function resizePhoto(file: File): Promise<File> {
  validatePhotoSource(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new PhotoValidationError("Não foi possível processar a foto."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new PhotoValidationError("Não foi possível processar a foto."));
          if (blob.size > MAX_PHOTO_BYTES) {
            return reject(new PhotoValidationError("A foto passou de 1 MB. Escolha outra imagem."));
          }
          resolve(new File([blob], "peca.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.72,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PhotoValidationError("Não foi possível ler esta imagem. Escolha outra foto."));
    };
    img.src = url;
  });
}
