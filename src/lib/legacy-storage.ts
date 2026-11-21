/** Chave do antigo banco de demonstração no navegador (antes da migração para a API). */
export const LEGACY_DEMO_DB_KEY = "luma_db_v1";

/**
 * Apaga o banco de demonstração que versões antigas do app gravavam no `localStorage`. Os dados eram de
 * exemplo e não são importados (decisão de 2026-10-31). Só essa chave sai; outras preferências ficam.
 */
export function clearLegacyDemoData(storage: Pick<Storage, "removeItem"> | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(LEGACY_DEMO_DB_KEY);
  } catch {
    // Navegação privada ou armazenamento bloqueado: não há o que limpar.
  }
}
