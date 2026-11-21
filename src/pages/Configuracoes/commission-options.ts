import type { SettingsDto } from "@/lib/api/types";

/** Opções de comissão montadas a partir da faixa de `GET /settings` (25 a 40%, de 5 em 5, nesta versão). */
export function commissionOptions(
  settings: Pick<SettingsDto, "commissionMin" | "commissionMax" | "commissionStep">,
): number[] {
  const { commissionMin, commissionMax, commissionStep } = settings;
  if (commissionStep <= 0) return [commissionMin];
  const options: number[] = [];
  for (let rate = commissionMin; rate <= commissionMax; rate += commissionStep) {
    options.push(rate);
  }
  return options;
}
