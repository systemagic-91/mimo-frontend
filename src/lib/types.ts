export type Role = "owner" | "staff";

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  loggedAt: string;
}

export type PieceStage =
  | "fabrica"
  | "banho_ouro"
  | "etiquetada"
  | "consignacao"
  | "vendida"
  | "devolvida";

export interface Piece {
  id: string;
  code: string; // LU-0813
  type: string;
  value: number;
  status: PieceStage;
  currentLocation: string;
  photo?: string; // thumbnail base64
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PieceEvent {
  id: string;
  pieceId: string;
  stage: PieceStage;
  occurredAt: string;
  note?: string;
}

export interface Seller {
  id: string;
  name: string;
  phone: string;
  commissionRate: number; // 25-40%
  status: "ativa" | "inativa";
  createdAt: string;
}

export type ConsignmentItemStatus = "com_vendedora" | "vendida" | "devolvida";

export interface ConsignmentItem {
  pieceId: string;
  code: string;
  type: string;
  value: number;
  status: ConsignmentItemStatus;
  soldAt?: string;
  returnedAt?: string;
}

export type ConsignmentStatus = "aberta" | "quitada";

export interface Consignment {
  id: string;
  code: string; // C-2026-005
  sellerId: string;
  deliveredAt: string;
  dueAt: string;
  status: ConsignmentStatus;
  note?: string;
  items: ConsignmentItem[];
}

export interface Settings {
  commissionRanges: { min: number; max: number; step: number };
  defaultCommissionRate: number;
  paymentTerms: number[]; // [30, 60, 90]
  defaultConsignmentDays: number;
}

export interface Db {
  version: number;
  seq: number; // contador de código de peça (LU-XXXX)
  pieces: Piece[];
  events: PieceEvent[];
  sellers: Seller[];
  consignments: Consignment[];
  settings: Settings;
  users: DbUser[];
  session: Session | null;
}
