import { uid } from "./uid";
import type {
  Consignment,
  Db,
  Piece,
  PieceEvent,
  PieceStage,
  Seller,
} from "./types";

const DAY = 86_400_000;

const iso = (offsetDays: number, hour = 12) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

function piece(
  code: string,
  type: string,
  value: number,
  status: PieceStage,
  location: string,
  createdDaysAgo: number,
  events: { stage: PieceStage; daysAgo: number; note?: string }[],
): Piece {
  const updatedDaysAgo = events.length
    ? events[events.length - 1].daysAgo
    : createdDaysAgo;
  return {
    id: uid(),
    code,
    type,
    value,
    status,
    currentLocation: location,
    createdAt: iso(-createdDaysAgo, 9),
    updatedAt: iso(-updatedDaysAgo),
  };
}

export function seedDb(): Db {
  const sellers: Seller[] = [
    {
      id: "s1",
      name: "Ana Ribeiro",
      phone: "(11) 98888-0001",
      commissionRate: 30,
      status: "ativa",
      createdAt: iso(-300),
    },
    {
      id: "s2",
      name: "Beatriz Moura",
      phone: "(11) 98888-0002",
      commissionRate: 30,
      status: "ativa",
      createdAt: iso(-260),
    },
    {
      id: "s3",
      name: "Carla Nunes",
      phone: "(11) 98888-0003",
      commissionRate: 35,
      status: "ativa",
      createdAt: iso(-210),
    },
    {
      id: "s4",
      name: "Débora Lima",
      phone: "(11) 98888-0004",
      commissionRate: 40,
      status: "inativa",
      createdAt: iso(-180),
    },
  ];

  const pieces: Piece[] = [
    // Devolvida de lote quitado (de volta ao estoque)
    piece("LU-0797", "Brinco", 64.9, "etiquetada", "Estoque", 95, [
      { stage: "fabrica", daysAgo: 95 },
      { stage: "banho_ouro", daysAgo: 92 },
      { stage: "etiquetada", daysAgo: 90 },
      { stage: "consignacao", daysAgo: 88 },
      { stage: "devolvida", daysAgo: 70, note: "Lote C-2026-001" },
      { stage: "etiquetada", daysAgo: 69 },
    ]),
    // Vendida (giro do lote quitado da Ana)
    piece("LU-0798", "Colar", 129, "vendida", "Vendida", 100, [
      { stage: "fabrica", daysAgo: 100 },
      { stage: "banho_ouro", daysAgo: 97 },
      { stage: "etiquetada", daysAgo: 95 },
      { stage: "consignacao", daysAgo: 90, note: "Lote C-2026-001" },
      { stage: "vendida", daysAgo: 84, note: "Lote C-2026-001" },
    ]),
    // Vendida no lote em aberto da Beatriz
    piece("LU-0799", "Anel", 99.9, "vendida", "Vendida", 95, [
      { stage: "fabrica", daysAgo: 95 },
      { stage: "banho_ouro", daysAgo: 92 },
      { stage: "etiquetada", daysAgo: 90 },
      { stage: "consignacao", daysAgo: 45, note: "Lote C-2026-003" },
      { stage: "vendida", daysAgo: 40, note: "Lote C-2026-003" },
    ]),
    // Devolvida no lote em aberto da Beatriz
    piece("LU-0800", "Pulseira", 84.9, "etiquetada", "Estoque", 95, [
      { stage: "fabrica", daysAgo: 95 },
      { stage: "banho_ouro", daysAgo: 92 },
      { stage: "etiquetada", daysAgo: 90 },
      { stage: "consignacao", daysAgo: 45, note: "Lote C-2026-003" },
      { stage: "devolvida", daysAgo: 12, note: "Lote C-2026-003" },
      { stage: "etiquetada", daysAgo: 11 },
    ]),
    // Na fábrica
    piece("LU-0801", "Brinco", 89.9, "fabrica", "Fábrica", 6, [
      { stage: "fabrica", daysAgo: 6 },
    ]),
    piece("LU-0802", "Colar", 129, "fabrica", "Fábrica", 6, [
      { stage: "fabrica", daysAgo: 6 },
    ]),
    // No banho de ouro
    piece("LU-0803", "Pulseira", 99.9, "banho_ouro", "No banho de ouro", 10, [
      { stage: "fabrica", daysAgo: 10 },
      { stage: "banho_ouro", daysAgo: 4 },
    ]),
    piece("LU-0804", "Anel", 74.5, "banho_ouro", "No banho de ouro", 10, [
      { stage: "fabrica", daysAgo: 10 },
      { stage: "banho_ouro", daysAgo: 3 },
    ]),
    // Etiquetadas em estoque (LU-0805 parada há >60 dias)
    piece("LU-0805", "Brinco", 84.9, "etiquetada", "Estoque", 70, [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
    ]),
    piece("LU-0806", "Colar", 149, "etiquetada", "Estoque", 65, [
      { stage: "fabrica", daysAgo: 65 },
      { stage: "banho_ouro", daysAgo: 62 },
      { stage: "etiquetada", daysAgo: 58 },
    ]),
    piece("LU-0807", "Anel", 94, "etiquetada", "Estoque", 12, [
      { stage: "fabrica", daysAgo: 12 },
      { stage: "banho_ouro", daysAgo: 10 },
      { stage: "etiquetada", daysAgo: 9 },
    ]),
    // Em consignação
    piece("LU-0808", "Brinco", 79.9, "consignacao", "Com: Ana Ribeiro", 25, [
      { stage: "fabrica", daysAgo: 40 },
      { stage: "banho_ouro", daysAgo: 37 },
      { stage: "etiquetada", daysAgo: 35 },
      { stage: "consignacao", daysAgo: 25, note: "Lote C-2026-002" },
    ]),
    piece("LU-0809", "Pulseira", 109, "consignacao", "Com: Ana Ribeiro", 25, [
      { stage: "fabrica", daysAgo: 40 },
      { stage: "banho_ouro", daysAgo: 37 },
      { stage: "etiquetada", daysAgo: 35 },
      { stage: "consignacao", daysAgo: 25, note: "Lote C-2026-002" },
    ]),
    piece("LU-0810", "Colar", 139, "consignacao", "Com: Carla Nunes", 50, [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
      { stage: "consignacao", daysAgo: 50, note: "Lote C-2026-004" },
    ]),
    piece("LU-0811", "Anel", 89, "consignacao", "Com: Carla Nunes", 50, [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
      { stage: "consignacao", daysAgo: 50, note: "Lote C-2026-004" },
    ]),
    piece("LU-0812", "Brinco", 99, "consignacao", "Com: Beatriz Moura", 45, [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
      { stage: "consignacao", daysAgo: 45, note: "Lote C-2026-003" },
    ]),
  ];

  const events: PieceEvent[] = [];
  for (const p of pieces) {
    const meta = pieceMeta(p.code);
    for (const e of meta) {
      events.push({
        id: uid(),
        pieceId: p.id,
        stage: e.stage,
        occurredAt: iso(-e.daysAgo, 14),
        note: e.note,
      });
    }
  }

  const consignments: Consignment[] = [
    {
      id: "c1",
      code: "C-2026-001",
      sellerId: "s1",
      deliveredAt: iso(-90),
      dueAt: iso(-60),
      status: "quitada",
      note: "Lote inicial",
      items: [
        {
          pieceId: pieces[1].id,
          code: "LU-0798",
          type: "Colar",
          value: 129,
          status: "vendida",
          soldAt: iso(-84),
        },
        {
          pieceId: pieces[0].id,
          code: "LU-0797",
          type: "Brinco",
          value: 64.9,
          status: "devolvida",
          returnedAt: iso(-70),
        },
      ],
    },
    {
      id: "c2",
      code: "C-2026-002",
      sellerId: "s1",
      deliveredAt: iso(-25),
      dueAt: iso(5),
      status: "aberta",
      note: "",
      items: [
        {
          pieceId: pieces[11].id,
          code: "LU-0808",
          type: "Brinco",
          value: 79.9,
          status: "com_vendedora",
        },
        {
          pieceId: pieces[12].id,
          code: "LU-0809",
          type: "Pulseira",
          value: 109,
          status: "com_vendedora",
        },
      ],
    },
    {
      id: "c3",
      code: "C-2026-003",
      sellerId: "s2",
      deliveredAt: iso(-45),
      dueAt: iso(15),
      status: "aberta",
      note: "",
      items: [
        {
          pieceId: pieces[14].id,
          code: "LU-0812",
          type: "Brinco",
          value: 99,
          status: "com_vendedora",
        },
        {
          pieceId: pieces[2].id,
          code: "LU-0799",
          type: "Anel",
          value: 99.9,
          status: "vendida",
          soldAt: iso(-40),
        },
        {
          pieceId: pieces[3].id,
          code: "LU-0800",
          type: "Pulseira",
          value: 84.9,
          status: "devolvida",
          returnedAt: iso(-12),
        },
      ],
    },
    {
      id: "c4",
      code: "C-2026-004",
      sellerId: "s3",
      deliveredAt: iso(-50),
      dueAt: iso(-20),
      status: "aberta",
      note: "Aguardando prestação de contas",
      items: [
        {
          pieceId: pieces[13].id,
          code: "LU-0810",
          type: "Colar",
          value: 139,
          status: "com_vendedora",
        },
        {
          pieceId: pieces[14].id,
          code: "LU-0811",
          type: "Anel",
          value: 89,
          status: "com_vendedora",
        },
      ],
    },
  ];

  return {
    version: 1,
    seq: 813,
    pieces,
    events,
    sellers,
    consignments,
    settings: {
      commissionRanges: { min: 25, max: 40, step: 5 },
      defaultCommissionRate: 30,
      paymentTerms: [30, 60, 90],
      defaultConsignmentDays: 30,
    },
  };
}

// Metadados de eventos por código de peça (para o seed)
function pieceMeta(
  code: string,
): { stage: PieceStage; daysAgo: number; note?: string }[] {
  const map: Record<
    string,
    { stage: PieceStage; daysAgo: number; note?: string }[]
  > = {
    "LU-0797": [
      { stage: "fabrica", daysAgo: 95 },
      { stage: "banho_ouro", daysAgo: 92 },
      { stage: "etiquetada", daysAgo: 90 },
      { stage: "consignacao", daysAgo: 88, note: "Lote C-2026-001" },
      { stage: "devolvida", daysAgo: 70, note: "Lote C-2026-001" },
      { stage: "etiquetada", daysAgo: 69, note: "Reetiquetada após devolução" },
    ],
    "LU-0798": [
      { stage: "fabrica", daysAgo: 100 },
      { stage: "banho_ouro", daysAgo: 97 },
      { stage: "etiquetada", daysAgo: 95 },
      { stage: "consignacao", daysAgo: 90, note: "Lote C-2026-001" },
      { stage: "vendida", daysAgo: 84, note: "Lote C-2026-001" },
    ],
    "LU-0799": [
      { stage: "fabrica", daysAgo: 95 },
      { stage: "banho_ouro", daysAgo: 92 },
      { stage: "etiquetada", daysAgo: 90 },
      { stage: "consignacao", daysAgo: 45, note: "Lote C-2026-003" },
      { stage: "vendida", daysAgo: 40, note: "Lote C-2026-003" },
    ],
    "LU-0800": [
      { stage: "fabrica", daysAgo: 95 },
      { stage: "banho_ouro", daysAgo: 92 },
      { stage: "etiquetada", daysAgo: 90 },
      { stage: "consignacao", daysAgo: 45, note: "Lote C-2026-003" },
      { stage: "devolvida", daysAgo: 12, note: "Lote C-2026-003" },
      { stage: "etiquetada", daysAgo: 11, note: "Reetiquetada após devolução" },
    ],
    "LU-0801": [{ stage: "fabrica", daysAgo: 6 }],
    "LU-0802": [{ stage: "fabrica", daysAgo: 6 }],
    "LU-0803": [
      { stage: "fabrica", daysAgo: 10 },
      { stage: "banho_ouro", daysAgo: 4 },
    ],
    "LU-0804": [
      { stage: "fabrica", daysAgo: 10 },
      { stage: "banho_ouro", daysAgo: 3 },
    ],
    "LU-0805": [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
    ],
    "LU-0806": [
      { stage: "fabrica", daysAgo: 65 },
      { stage: "banho_ouro", daysAgo: 62 },
      { stage: "etiquetada", daysAgo: 58 },
    ],
    "LU-0807": [
      { stage: "fabrica", daysAgo: 12 },
      { stage: "banho_ouro", daysAgo: 10 },
      { stage: "etiquetada", daysAgo: 9 },
    ],
    "LU-0808": [
      { stage: "fabrica", daysAgo: 40 },
      { stage: "banho_ouro", daysAgo: 37 },
      { stage: "etiquetada", daysAgo: 35 },
      { stage: "consignacao", daysAgo: 25, note: "Lote C-2026-002" },
    ],
    "LU-0809": [
      { stage: "fabrica", daysAgo: 40 },
      { stage: "banho_ouro", daysAgo: 37 },
      { stage: "etiquetada", daysAgo: 35 },
      { stage: "consignacao", daysAgo: 25, note: "Lote C-2026-002" },
    ],
    "LU-0810": [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
      { stage: "consignacao", daysAgo: 50, note: "Lote C-2026-004" },
    ],
    "LU-0811": [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
      { stage: "consignacao", daysAgo: 50, note: "Lote C-2026-004" },
    ],
    "LU-0812": [
      { stage: "fabrica", daysAgo: 70 },
      { stage: "banho_ouro", daysAgo: 67 },
      { stage: "etiquetada", daysAgo: 65 },
      { stage: "consignacao", daysAgo: 45, note: "Lote C-2026-003" },
    ],
  };
  return map[code] ?? [];
}
