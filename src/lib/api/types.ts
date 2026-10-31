export type PieceStage =
  | "fabrica"
  | "banho_ouro"
  | "etiquetada"
  | "consignacao"
  | "vendida"
  | "devolvida";

export type SellerStatus = "ativa" | "inativa";
export type ConsignmentStatus = "aberta" | "quitada";
export type ConsignmentItemStatus = "com_vendedora" | "vendida" | "devolvida";

export type BackendPieceStage =
  | "FABRICA"
  | "BANHO_OURO"
  | "ETIQUETADA"
  | "CONSIGNACAO"
  | "VENDIDA"
  | "DEVOLVIDA"
  | PieceStage;
export type BackendSellerStatus = "ATIVA" | "INATIVA" | SellerStatus;
export type BackendConsignmentStatus = "ABERTA" | "QUITADA" | ConsignmentStatus;
export type BackendConsignmentItemStatus =
  | "COM_VENDEDORA"
  | "VENDIDA"
  | "DEVOLVIDA"
  | ConsignmentItemStatus;

export interface PageRequest {
  page?: number;
  pageSize?: number;
  sort?: string[];
}

export interface PageMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PageEnvelope<T> {
  items: T[];
  pagination: PageMetadata;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  active?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSession {
  loggedAt: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: ApiUser;
  session: ApiSession;
  accessToken: string;
}

export interface AuthSessionResponse {
  user: ApiUser;
  session: ApiSession;
}

export interface PieceEventDto {
  id: string;
  pieceId: string;
  stage: BackendPieceStage;
  occurredAt: string;
  actorUserId?: string | null;
  note?: string | null;
}

export interface PieceDto {
  id: string;
  code: string;
  type: string;
  valueCents: number;
  status: BackendPieceStage;
  currentLocation: string;
  photoUrl?: string | null;
  note?: string | null;
  /** Custos (BACK_23): sempre null para staff; null também significa "não informado". */
  factoryCostCents?: number | null;
  bathCostCents?: number | null;
  totalCostCents?: number | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

/** `GET /pieces`: `summary.totalValueCents` soma o preço de todas as peças filtradas, não só as da página (BACK_26). */
export interface PieceListResponse extends PageEnvelope<PieceDto> {
  summary: { totalValueCents: number };
}

export interface ReceivePieceRequest {
  type: string;
  valueCents: number;
  stage: "FABRICA" | "BANHO_OURO";
  note?: string;
  /** Só owner. */
  factoryCostCents?: number | null;
}

export interface ReceivePieceResponse {
  piece: PieceDto;
  events: PieceEventDto[];
}

export interface LabelPieceRequest {
  sourcePieceId: string;
  type: string;
  valueCents: number;
  photoId?: string;
  note?: string;
  backFromBath: boolean;
  /** Só owner. */
  bathCostCents?: number | null;
}

export interface UpdatePieceCostsRequest {
  /** Ausente não muda; null limpa. */
  factoryCostCents?: number | null;
  bathCostCents?: number | null;
}

export interface SellerDto {
  id: string;
  name: string;
  phone: string;
  commissionRate: number;
  status: BackendSellerStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SellerListItem {
  seller: SellerDto;
  piecesInHand: number;
  valueInHandCents: number;
  nextDueAt?: string | null;
  nextDueDays?: number | null;
  late: boolean;
  openLots: number;
}

export interface SellerStatsDto {
  inHand: number;
  inHandValueCents: number;
  totalSoldCount: number;
  totalSoldValueCents: number;
  totalCommissionCents: number;
}

export interface SellerCommissionDto {
  soldCount: number;
  soldValueCents: number;
  commissionCents: number;
}

export interface CreateSellerRequest {
  name: string;
  phone: string;
  commissionRate: number;
}

export interface UpdateSellerRequest {
  name?: string;
  phone?: string;
  commissionRate?: number;
  status?: SellerStatus;
}

export interface ConsignmentItemDto {
  id: string;
  consignmentId: string;
  pieceId: string;
  codeSnapshot: string;
  typeSnapshot: string;
  valueCentsSnapshot: number;
  commissionRateSnapshot: number;
  status: BackendConsignmentItemStatus;
  soldAt?: string | null;
  returnedAt?: string | null;
  version?: number;
}

export interface ConsignmentDto {
  id: string;
  code: string;
  sellerId: string;
  deliveredAt: string;
  dueAt: string;
  status: BackendConsignmentStatus;
  note?: string | null;
  createdById?: string;
  version?: number;
}

export interface ConsignmentListItem
  extends Omit<ConsignmentDto, "status"> {
  dueInDays: number;
  seller: SellerDto;
  piecesInHand: number;
  valueInHandCents: number;
  status: "em_dia" | "atrasada" | "quitada";
}

export interface ConsignmentDetailsDto extends ConsignmentDto {
  late: boolean;
  seller: SellerDto;
  items: ConsignmentItemDto[];
}

export interface CreateConsignmentRequest {
  sellerId: string;
  pieceIds: string[];
  dueDate: string;
  note?: string;
}

export interface DashboardResponse {
  kpis: {
    activeInHand: number;
    activeInHandValueCents: number;
    avgTurnoverDays: number | null;
    staleCount: number;
    staleValueCents: number;
    overdueSellers: number;
  };
  stageCounts: Record<PieceStage, number>;
  openConsignments: ConsignmentListItem[];
  overdueSellers: OverdueReportRow[];
}

export interface TurnoverReportRow {
  code: string;
  type: string;
  valueCents: number;
  soldAt: string;
  sellerId: string;
  sellerName: string;
  daysToSell: number;
  commissionCents: number;
  /** null quando nenhum custo foi informado. */
  totalCostCents: number | null;
  /** null enquanto faltar o custo da fábrica ou o do banho. */
  marginCents: number | null;
}

export interface TurnoverReportResponse {
  items: TurnoverReportRow[];
  summary: {
    soldCount: number;
    soldValueCents: number;
    marginCents: number | null;
    piecesWithoutFullCost: number;
  };
}

export interface OverdueReportRow {
  sellerId: string;
  sellerName: string;
  phone: string;
  lateLots: number;
  piecesInHand: number;
  valueAtRiskCents: number;
  maxOverdueDays: number;
}

export interface OverdueReportResponse {
  items: OverdueReportRow[];
}

export interface StalePieceReportRow {
  id: string;
  code: string;
  type: string;
  valueCents: number;
  daysStopped: number;
}

export interface StalePiecesReportResponse {
  items: StalePieceReportRow[];
  summary: { count: number; valueCents: number };
}

export interface SettingsDto {
  commissionMin: number;
  commissionMax: number;
  commissionStep: number;
  defaultCommissionRate: number;
  paymentTerms: number[];
  defaultConsignmentDays: number;
  timezone: string;
  updatedAt?: string;
  updatedById?: string | null;
}

export interface UpdateSettingsRequest {
  defaultCommissionRate?: number;
  paymentTerms?: number[];
  defaultConsignmentDays?: number;
  timezone?: string;
}

export interface UploadPiecePhotoResponse {
  photoId: string;
  photoUrl: string;
  width: number;
  height: number;
}
