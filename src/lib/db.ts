import { useSyncExternalStore } from "react";
import { seedDb } from "./seed";
import type { Db } from "./types";

export { uid } from "./uid";

const DB_KEY = "luma_db_v1";

const listeners = new Set<() => void>();

function read(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed && Array.isArray(parsed.pieces)) return parsed;
    }
  } catch {
    // storage corrompido: ressemeia
  }
  const seeded = seedDb();
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
  } catch {
    // quota excedida — mantém apenas em memória
  }
  return seeded;
}

let cache: Db | null = null;

export function getDb(): Db {
  if (!cache) cache = read();
  return cache;
}

/** Aplica uma atualização no banco e persiste + notifica os assinantes. */
export function setDb(updater: (db: Db) => Db): Db {
  const next = updater(getDb());
  cache = next;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next));
  } catch {
    // quota excedida (fotos grandes) — mantém em memória
  }
  listeners.forEach((l) => l());
  return next;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hook reativo: re-renderiza quando qualquer parte do banco muda. */
export function useDb(): Db {
  return useSyncExternalStore(subscribe, getDb);
}
