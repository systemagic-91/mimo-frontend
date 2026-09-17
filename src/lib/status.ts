import type { PieceStage, Role } from "./types";

export const PIECE_STAGES: PieceStage[] = [
  "fabrica",
  "banho_ouro",
  "etiquetada",
  "consignacao",
  "vendida",
  "devolvida",
];

export const STAGE_LABEL: Record<PieceStage, string> = {
  fabrica: "Na fábrica",
  banho_ouro: "No banho de ouro",
  etiquetada: "Etiquetada",
  consignacao: "Em consignação",
  vendida: "Vendida",
  devolvida: "Devolvida",
};

export const PIECE_TYPES = [
  "Brinco",
  "Colar",
  "Pulseira",
  "Anel",
  "Pingente",
  "Tornozeleira",
];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Sócia(o)",
  staff: "Equipe",
};

export const CONSIGNMENT_STATUS_LABEL: Record<string, string> = {
  em_dia: "Em dia",
  atrasada: "Atrasado",
  quitada: "Quitado",
  aberta: "Em aberto",
};

export const SELLER_STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
};
