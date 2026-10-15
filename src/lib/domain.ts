import { getDb, setDb, uid } from "./db";
import type {
  Consignment,
  ConsignmentItem,
  Db,
  Piece,
  PieceEvent,
  PieceStage,
  Seller,
  Settings,
} from "./types";

// ---------------------------------------------------------------- helpers

export const nowIso = () => new Date().toISOString();

function pushEvent(
  db: Db,
  pieceId: string,
  stage: PieceStage,
  occurredAt: string,
  note?: string,
) {
  db.events.push({ id: uid(), pieceId, stage, occurredAt, note });
}

export function pieceEvents(db: Db, pieceId: string): PieceEvent[] {
  return db.events
    .filter((e) => e.pieceId === pieceId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

// ------------------------------------------------------------------- peças

export function nextPieceCode(db: Db): string {
  return `LU-${String(db.seq).padStart(4, "0")}`;
}

export function createPiece(input: {
  code: string;
  type: string;
  value: number;
  status: PieceStage;
  currentLocation: string;
  photo?: string;
  note?: string;
  events?: { stage: PieceStage; note?: string; occurredAt?: string }[];
}): Piece {
  const at = nowIso();
  let created: Piece | undefined;
  setDb((db) => {
    created = {
      id: uid(),
      code: input.code,
      type: input.type,
      value: input.value,
      status: input.status,
      currentLocation: input.currentLocation,
      photo: input.photo,
      note: input.note,
      createdAt: at,
      updatedAt: at,
    };
    db.pieces.push(created);
    db.seq += 1;
    const events = input.events ?? [{ stage: input.status }];
    for (const e of events) {
      pushEvent(db, created.id, e.stage, e.occurredAt ?? at, e.note);
    }
    return db;
  });
  return created!;
}

/** Recebimento de peça da fábrica ou do banho de ouro. */
export function receivePiece(input: {
  type: string;
  value: number;
  stage: "fabrica" | "banho_ouro";
  note?: string;
}): Piece {
  const db = getDb();
  const code = nextPieceCode(db);
  const events =
    input.stage === "banho_ouro"
      ? [
          { stage: "fabrica" as const, note: "Recebida da fábrica" },
          {
            stage: "banho_ouro" as const,
            note: "Encaminhada ao banho de ouro",
          },
        ]
      : [{ stage: "fabrica" as const, note: "Recebida da fábrica" }];
  return createPiece({
    code,
    type: input.type,
    value: input.value,
    status: input.stage,
    currentLocation:
      input.stage === "banho_ouro" ? "No banho de ouro" : "Fábrica",
    note: input.note,
    events,
  });
}

/** Etiquetagem: peça retornou do banho e recebe etiqueta com código. */
export function confirmLabeling(input: {
  type: string;
  value: number;
  photo?: string;
  note?: string;
  backFromBath: boolean;
}): Piece {
  const db = getDb();
  const code = nextPieceCode(db);
  const status: PieceStage = input.backFromBath ? "etiquetada" : "banho_ouro";
  const events = [
    ...(input.backFromBath
      ? ([
          { stage: "banho_ouro" as const, note: "Retorno do banho de ouro" },
          { stage: "etiquetada" as const, note: `Etiquetada ${code}` },
        ] as const)
      : []),
  ];
  return createPiece({
    code,
    type: input.type,
    value: input.value,
    status,
    currentLocation: status === "etiquetada" ? "Estoque" : "No banho de ouro",
    photo: input.photo,
    note: input.note,
    events,
  });
}

// -------------------------------------------------------------- consignação

export function nextConsignmentCode(db: Db): string {
  const year = new Date().getFullYear();
  const n =
    db.consignments.filter((c) => c.code.startsWith(`C-${year}`)).length + 1;
  return `C-${year}-${String(n).padStart(3, "0")}`;
}

export function createConsignment(input: {
  sellerId: string;
  pieceIds: string[];
  dueAt: string;
  note?: string;
}): Consignment | null {
  const at = nowIso();
  let result: Consignment | null = null;
  setDb((db) => {
    const seller = db.sellers.find((s) => s.id === input.sellerId);
    const pieces = db.pieces.filter(
      (p) => input.pieceIds.includes(p.id) && p.status === "etiquetada",
    );
    if (!seller || pieces.length === 0) return db;

    const code = nextConsignmentCode(db);
    const items: ConsignmentItem[] = pieces.map((p) => ({
      pieceId: p.id,
      code: p.code,
      type: p.type,
      value: p.value,
      status: "com_vendedora",
    }));
    result = {
      id: uid(),
      code,
      sellerId: seller.id,
      deliveredAt: at,
      dueAt: input.dueAt,
      status: "aberta",
      note: input.note ?? "",
      items,
    };
    db.consignments.push(result);

    for (const p of pieces) {
      p.status = "consignacao";
      p.currentLocation = `Com: ${seller.name}`;
      p.updatedAt = at;
      pushEvent(db, p.id, "consignacao", at, `Lote ${code}`);
    }
    return db;
  });
  return result;
}

export function markItemSold(consignmentId: string, pieceId: string) {
  const at = nowIso();
  setDb((db) => {
    const c = db.consignments.find((x) => x.id === consignmentId);
    if (!c) return db;
    const item = c.items.find((i) => i.pieceId === pieceId);
    if (!item || item.status !== "com_vendedora") return db;
    item.status = "vendida";
    item.soldAt = at;
    const p = db.pieces.find((x) => x.id === pieceId);
    if (p) {
      p.status = "vendida";
      p.currentLocation = "Vendida";
      p.updatedAt = at;
      pushEvent(db, p.id, "vendida", at, `Lote ${c.code}`);
    }
    if (c.items.every((i) => i.status !== "com_vendedora")) {
      c.status = "quitada";
    }
    return db;
  });
}

export function markItemReturned(consignmentId: string, pieceId: string) {
  const at = nowIso();
  setDb((db) => {
    const c = db.consignments.find((x) => x.id === consignmentId);
    if (!c) return db;
    const item = c.items.find((i) => i.pieceId === pieceId);
    if (!item || item.status !== "com_vendedora") return db;
    item.status = "devolvida";
    item.returnedAt = at;
    const p = db.pieces.find((x) => x.id === pieceId);
    if (p) {
      p.status = "etiquetada";
      p.currentLocation = "Estoque";
      p.updatedAt = at;
      pushEvent(db, p.id, "devolvida", at, `Lote ${c.code}`);
      pushEvent(db, p.id, "etiquetada", at, "Reetiquetada após devolução");
    }
    if (c.items.every((i) => i.status !== "com_vendedora")) {
      c.status = "quitada";
    }
    return db;
  });
}

// ----------------------------------------------------------------- vendedoras

export function upsertSeller(input: {
  id?: string;
  name: string;
  phone: string;
  commissionRate: number;
  status?: "ativa" | "inativa";
}) {
  setDb((db) => {
    if (input.id) {
      const idx = db.sellers.findIndex((s) => s.id === input.id);
      if (idx >= 0) {
        db.sellers[idx] = {
          ...db.sellers[idx],
          name: input.name,
          phone: input.phone,
          commissionRate: input.commissionRate,
          status: input.status ?? db.sellers[idx].status,
        };
      }
      return db;
    }
    db.sellers.push({
      id: uid(),
      name: input.name,
      phone: input.phone,
      commissionRate: input.commissionRate,
      status: input.status ?? "ativa",
      createdAt: nowIso(),
    });
    return db;
  });
}

export function updateSettings(patch: Partial<Settings>) {
  setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

// -------------------------------------------------------------- seletores

export function getSeller(db: Db, id: string): Seller | undefined {
  return db.sellers.find((s) => s.id === id);
}

export function isConsignmentLate(c: Consignment): boolean {
  return c.status === "aberta" && new Date(c.dueAt).getTime() < Date.now();
}

export type ConsignmentViewStatus = "em_dia" | "atrasada" | "quitada";

export function consignmentViewStatus(c: Consignment): ConsignmentViewStatus {
  if (c.status === "quitada") return "quitada";
  return isConsignmentLate(c) ? "atrasada" : "em_dia";
}

export function getOpenConsignments(db: Db): Consignment[] {
  return db.consignments
    .filter((c) => c.status === "aberta")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export interface SellerRow {
  seller: Seller;
  piecesInHand: number;
  valueInHand: number;
  nextDueAt: string | null;
  nextDueDays: number | null;
  late: boolean;
  openLots: number;
}

export function getSellersTable(db: Db): SellerRow[] {
  return db.sellers.map((seller) => {
    const open = db.consignments.filter(
      (c) => c.sellerId === seller.id && c.status === "aberta",
    );
    const items = open.flatMap((c) =>
      c.items.filter((i) => i.status === "com_vendedora"),
    );
    const dueDates = open.map((c) => new Date(c.dueAt).getTime());
    const next = dueDates.length ? new Date(Math.min(...dueDates)) : null;
    return {
      seller,
      piecesInHand: items.length,
      valueInHand: items.reduce((s, i) => s + i.value, 0),
      nextDueAt: next ? next.toISOString() : null,
      nextDueDays: next
        ? Math.ceil((next.getTime() - Date.now()) / 86_400_000)
        : null,
      late: open.some(isConsignmentLate),
      openLots: open.length,
    };
  });
}

export function getConsignmentsForSeller(
  db: Db,
  sellerId: string,
): Consignment[] {
  return db.consignments
    .filter((c) => c.sellerId === sellerId)
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
}

export function daysToSell(db: Db, item: ConsignmentItem): number | null {
  const events = pieceEvents(db, item.pieceId);
  const etiquetada = events.find((e) => e.stage === "etiquetada");
  const base = etiquetada?.occurredAt ?? undefined;
  const p = db.pieces.find((x) => x.id === item.pieceId);
  const from = base ?? p?.createdAt;
  if (!from || !item.soldAt) return null;
  return Math.max(
    0,
    Math.round(
      (new Date(item.soldAt).getTime() - new Date(from).getTime()) / 86_400_000,
    ),
  );
}

export interface Kpis {
  activeInHand: number;
  activeInHandValue: number;
  avgTurnoverDays: number | null;
  staleCount: number;
  staleValue: number;
  overdueSellers: number;
}

export function getKpis(db: Db): Kpis {
  const open = db.consignments.filter((c) => c.status === "aberta");
  const inHand = open.flatMap((c) =>
    c.items.filter((i) => i.status === "com_vendedora"),
  );
  const soldItems = db.consignments.flatMap((c) =>
    c.items.filter((i) => i.status === "vendida" && i.soldAt),
  );
  const turnDays = soldItems
    .map((i) => daysToSell(db, i))
    .filter((d): d is number => d !== null);
  const avgTurnoverDays = turnDays.length
    ? Math.round(turnDays.reduce((a, b) => a + b, 0) / turnDays.length)
    : null;

  const stale = getStalePieces(db, 60);
  const overdueSellerIds = new Set(
    open.filter(isConsignmentLate).map((c) => c.sellerId),
  );

  return {
    activeInHand: inHand.length,
    activeInHandValue: inHand.reduce((s, i) => s + i.value, 0),
    avgTurnoverDays,
    staleCount: stale.length,
    staleValue: stale.reduce((s, p) => s + p.value, 0),
    overdueSellers: overdueSellerIds.size,
  };
}

export function getStageCounts(db: Db): Record<PieceStage, number> {
  const counts: Record<PieceStage, number> = {
    fabrica: 0,
    banho_ouro: 0,
    etiquetada: 0,
    consignacao: 0,
    vendida: 0,
    devolvida: 0,
  };
  for (const p of db.pieces) counts[p.status] += 1;
  return counts;
}

/** Peças etiquetadas paradas há mais de `days` dias no estoque. */
export interface StalePiece extends Piece {
  daysStopped: number;
}

export function getStalePieces(db: Db, days = 60): StalePiece[] {
  const now = Date.now();
  const list: StalePiece[] = [];
  for (const p of db.pieces) {
    if (p.status !== "etiquetada") continue;
    const events = pieceEvents(db, p.id);
    const labeled = [...events].reverse().find((e) => e.stage === "etiquetada");
    const base = labeled?.occurredAt ?? p.createdAt;
    const daysStopped = Math.floor(
      (now - new Date(base).getTime()) / 86_400_000,
    );
    if (daysStopped >= days) list.push({ ...p, daysStopped });
  }
  return list.sort((a, b) => b.daysStopped - a.daysStopped);
}

export interface TurnoverRow {
  code: string;
  type: string;
  value: number;
  soldAt: string;
  sellerName: string;
  daysToSell: number | null;
}

export function getTurnover(db: Db, from: string, to: string): TurnoverRow[] {
  const fromT = new Date(from).getTime();
  const toT = new Date(to).getTime();
  const rows: TurnoverRow[] = [];
  for (const c of db.consignments) {
    const seller = getSeller(db, c.sellerId);
    for (const item of c.items) {
      if (item.status !== "vendida" || !item.soldAt) continue;
      const t = new Date(item.soldAt).getTime();
      if (t < fromT || t > toT) continue;
      rows.push({
        code: item.code,
        type: item.type,
        value: item.value,
        soldAt: item.soldAt,
        sellerName: seller?.name ?? "—",
        daysToSell: daysToSell(db, item),
      });
    }
  }
  return rows.sort((a, b) => a.soldAt.localeCompare(b.soldAt));
}

export interface OverdueRow {
  sellerId: string;
  sellerName: string;
  phone: string;
  lateLots: number;
  piecesInHand: number;
  valueAtRisk: number;
  maxOverdueDays: number;
}

export function getOverdueSellers(db: Db): OverdueRow[] {
  const now = Date.now();
  const map = new Map<string, OverdueRow>();
  for (const c of db.consignments) {
    if (c.status !== "aberta") continue;
    if (!isConsignmentLate(c)) continue;
    const seller = getSeller(db, c.sellerId);
    if (!seller) continue;
    const overdueDays = Math.max(
      0,
      Math.ceil((now - new Date(c.dueAt).getTime()) / 86_400_000),
    );
    const inHand = c.items.filter((i) => i.status === "com_vendedora");
    const row = map.get(seller.id) ?? {
      sellerId: seller.id,
      sellerName: seller.name,
      phone: seller.phone,
      lateLots: 0,
      piecesInHand: 0,
      valueAtRisk: 0,
      maxOverdueDays: 0,
    };
    row.lateLots += 1;
    row.piecesInHand += inHand.length;
    row.valueAtRisk += inHand.reduce((s, i) => s + i.value, 0);
    row.maxOverdueDays = Math.max(row.maxOverdueDays, overdueDays);
    map.set(seller.id, row);
  }
  return [...map.values()].sort((a, b) => b.maxOverdueDays - a.maxOverdueDays);
}

export interface SellerStats {
  inHand: number;
  inHandValue: number;
  totalSoldCount: number;
  totalSoldValue: number;
  totalCommission: number;
}

export function getSellerStats(db: Db, sellerId: string): SellerStats {
  const consignments = getConsignmentsForSeller(db, sellerId);
  const inHandItems = consignments.flatMap((c) =>
    c.items.filter((i) => i.status === "com_vendedora"),
  );
  const soldItems = consignments.flatMap((c) =>
    c.items.filter((i) => i.status === "vendida"),
  );
  const soldValue = soldItems.reduce((s, i) => s + i.value, 0);
  const seller = getSeller(db, sellerId);
  return {
    inHand: inHandItems.length,
    inHandValue: inHandItems.reduce((s, i) => s + i.value, 0),
    totalSoldCount: soldItems.length,
    totalSoldValue: soldValue,
    totalCommission: (soldValue * (seller?.commissionRate ?? 0)) / 100,
  };
}

/** Comissão apurada por período: vendas no intervalo × taxa da vendedora. */
export function getSellerCommission(
  db: Db,
  sellerId: string,
  from: string,
  to: string,
): { soldCount: number; soldValue: number; commission: number } {
  const fromT = new Date(from).getTime();
  const toT = new Date(to).getTime();
  const consignments = getConsignmentsForSeller(db, sellerId);
  const soldItems = consignments.flatMap((c) =>
    c.items.filter((i) => i.status === "vendida" && i.soldAt),
  );
  const inPeriod = soldItems.filter((i) => {
    const t = new Date(i.soldAt!).getTime();
    return t >= fromT && t <= toT;
  });
  const soldValue = inPeriod.reduce((s, i) => s + i.value, 0);
  const seller = getSeller(db, sellerId);
  return {
    soldCount: inPeriod.length,
    soldValue,
    commission: (soldValue * (seller?.commissionRate ?? 0)) / 100,
  };
}
