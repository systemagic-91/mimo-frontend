import type {
  BackendConsignmentItemStatus,
  BackendConsignmentStatus,
  BackendPieceStage,
  BackendSellerStatus,
  ConsignmentItemStatus,
  ConsignmentStatus,
  PieceStage,
  SellerStatus,
} from "./types";

const PIECE_STAGE_FROM_BACKEND: Record<string, PieceStage> = {
  fabrica: "fabrica",
  banho_ouro: "banho_ouro",
  etiquetada: "etiquetada",
  consignacao: "consignacao",
  vendida: "vendida",
  devolvida: "devolvida",
};

const SELLER_STATUS_FROM_BACKEND: Record<string, SellerStatus> = {
  ativa: "ativa",
  inativa: "inativa",
};

const CONSIGNMENT_STATUS_FROM_BACKEND: Record<string, ConsignmentStatus> = {
  aberta: "aberta",
  quitada: "quitada",
};

const ITEM_STATUS_FROM_BACKEND: Record<string, ConsignmentItemStatus> = {
  com_vendedora: "com_vendedora",
  vendida: "vendida",
  devolvida: "devolvida",
};

function normalizeEnum<T extends string>(
  value: string,
  values: Record<string, T>,
  label: string,
): T {
  const normalized = value.toLowerCase();
  const mapped = values[normalized];
  if (!mapped) throw new TypeError(`Unknown ${label} value: ${value}`);
  return mapped;
}

export function toBackendPieceStage<S extends PieceStage>(value: S): Uppercase<S> {
  const mappings: Record<PieceStage, Uppercase<PieceStage>> = {
    fabrica: "FABRICA",
    banho_ouro: "BANHO_OURO",
    etiquetada: "ETIQUETADA",
    consignacao: "CONSIGNACAO",
    vendida: "VENDIDA",
    devolvida: "DEVOLVIDA",
  };
  return mappings[value] as Uppercase<S>;
}

export function fromBackendPieceStage(value: BackendPieceStage): PieceStage {
  return normalizeEnum(value, PIECE_STAGE_FROM_BACKEND, "piece stage");
}

export function toBackendSellerStatus(
  value: SellerStatus,
): Uppercase<SellerStatus> {
  const mappings: Record<SellerStatus, Uppercase<SellerStatus>> = {
    ativa: "ATIVA",
    inativa: "INATIVA",
  };
  return mappings[value];
}

export function toBackendConsignmentStatus(
  value: ConsignmentStatus,
): Uppercase<ConsignmentStatus> {
  return value === "aberta" ? "ABERTA" : "QUITADA";
}

export function fromBackendSellerStatus(
  value: BackendSellerStatus,
): SellerStatus {
  return normalizeEnum(value, SELLER_STATUS_FROM_BACKEND, "seller status");
}

export function fromBackendConsignmentStatus(
  value: BackendConsignmentStatus,
): ConsignmentStatus {
  return normalizeEnum(
    value,
    CONSIGNMENT_STATUS_FROM_BACKEND,
    "consignment status",
  );
}

export function fromBackendConsignmentItemStatus(
  value: BackendConsignmentItemStatus,
): ConsignmentItemStatus {
  return normalizeEnum(value, ITEM_STATUS_FROM_BACKEND, "consignment item status");
}

export function moneyToCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("Money value must be finite.");
  }

  const [coefficient, exponentPart] = value.toString().toLowerCase().split("e");
  const exponent = exponentPart ? Number(exponentPart) : 0;
  const negative = coefficient.startsWith("-");
  const unsigned = negative ? coefficient.slice(1) : coefficient;
  const [whole, fraction = ""] = unsigned.split(".");
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");
  const centsExponent = exponent - fraction.length + 2;
  let cents: bigint;

  if (centsExponent >= 0) {
    cents = BigInt(digits || "0") * 10n ** BigInt(centsExponent);
  } else {
    const divisor = 10n ** BigInt(-centsExponent);
    const numerator = BigInt(digits || "0");
    cents = (numerator + divisor / 2n) / divisor;
  }

  if (negative) cents = -cents;
  const result = Number(cents);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Money value exceeds the safe cent range.");
  }
  return result;
}

export function centsToMoney(valueCents: number): number {
  if (!Number.isSafeInteger(valueCents)) {
    throw new RangeError("Cent value must be a safe integer.");
  }
  return valueCents / 100;
}
