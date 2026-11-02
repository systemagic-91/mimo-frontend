import type { PageRequest } from "./types";

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  pieces: {
    all: ["pieces"] as const,
    lists: () => [...queryKeys.pieces.all, "list"] as const,
    list: (params: PageRequest & { q?: string; status?: string }) =>
      [...queryKeys.pieces.lists(), params] as const,
    details: () => [...queryKeys.pieces.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.pieces.details(), id] as const,
    events: (id: string) => [...queryKeys.pieces.all, id, "events"] as const,
  },
  sellers: {
    all: ["sellers"] as const,
    lists: () => [...queryKeys.sellers.all, "list"] as const,
    list: (params: PageRequest & { q?: string; status?: string }) =>
      [...queryKeys.sellers.lists(), params] as const,
    details: () => [...queryKeys.sellers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.sellers.details(), id] as const,
    stats: (id: string) => [...queryKeys.sellers.all, id, "stats"] as const,
    commission: (id: string, from: string, to: string) =>
      [...queryKeys.sellers.all, id, "commission", { from, to }] as const,
  },
  consignments: {
    all: ["consignments"] as const,
    lists: () => [...queryKeys.consignments.all, "list"] as const,
    list: (params: PageRequest & {
      status?: string;
      sellerId?: string;
      overdue?: boolean;
    }) => [...queryKeys.consignments.lists(), params] as const,
    details: () => [...queryKeys.consignments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.consignments.details(), id] as const,
    seller: (id: string, params: PageRequest & { status?: string }) =>
      [...queryKeys.consignments.all, "seller", id, params] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all, "summary"] as const,
  },
  reports: {
    all: ["reports"] as const,
    turnover: (from: string, to: string) =>
      [...queryKeys.reports.all, "turnover", { from, to }] as const,
    overdue: () => [...queryKeys.reports.all, "overdue"] as const,
    stalePieces: (days: number) =>
      [...queryKeys.reports.all, "stale-pieces", { days }] as const,
  },
  settings: {
    all: ["settings"] as const,
    detail: () => [...queryKeys.settings.all, "detail"] as const,
  },
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (params: PageRequest & { q?: string; role?: string; active?: boolean }) =>
      [...queryKeys.users.lists(), params] as const,
  },
};

