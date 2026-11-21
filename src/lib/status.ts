import i18n from "@/i18n/config";
import type { PieceStage, UserRole as Role } from "./api/types";

/**
 * Rótulos dos enums da API. O texto vem do pt-BR.json; o valor enviado à API nunca é traduzido.
 * Os getters leem a tradução no momento do uso.
 */
const t = (key: string) => i18n.t(key);

export const PIECE_STAGES: PieceStage[] = [
  "fabrica",
  "banho_ouro",
  "etiquetada",
  "consignacao",
  "vendida",
  "devolvida",
];

export const STAGE_LABEL: Record<PieceStage, string> = {
  get fabrica() { return t("stage.fabrica"); },
  get banho_ouro() { return t("stage.banho_ouro"); },
  get etiquetada() { return t("stage.etiquetada"); },
  get consignacao() { return t("stage.consignacao"); },
  get vendida() { return t("stage.vendida"); },
  get devolvida() { return t("stage.devolvida"); },
};

/** Tipos de peça aceitos pela API: são dados, não rótulos, e vão para o backend como estão. */
export const PIECE_TYPES = [
  "Brinco",
  "Colar",
  "Pulseira",
  "Anel",
  "Pingente",
  "Tornozeleira",
];

export const ROLE_LABEL: Record<Role, string> = {
  get owner() { return t("role.owner"); },
  get staff() { return t("role.staff"); },
};

export const CONSIGNMENT_STATUS_LABEL: Record<string, string> = {
  get em_dia() { return t("lotStatus.em_dia"); },
  get atrasada() { return t("lotStatus.atrasada"); },
  get quitada() { return t("lotStatus.quitada"); },
  get aberta() { return t("lotStatus.aberta"); },
};

export const SELLER_STATUS_LABEL: Record<string, string> = {
  get ativa() { return t("sellerStatus.ativa"); },
  get inativa() { return t("sellerStatus.inativa"); },
};

/** "30 dias"; também serve para qualquer contagem de dias. */
export function daysLabel(count: number): string {
  return i18n.t("common.days", { count });
}
