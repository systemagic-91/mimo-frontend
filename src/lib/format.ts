/**
 * Formatação de tudo o que a tela mostra: moeda e datas sempre em pt-BR, e datas no fuso da loja
 * (`settings.timezone`, via `useStoreTimezone`). Nenhuma tela formata por conta própria.
 */
import i18n from "@/i18n/config";
import { centsToMoney } from "@/lib/api/mappers";
import { dateInZone } from "@/lib/store-time";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.234,56" a partir de centavos. */
export function formatCents(cents: number): string {
  return currency.format(centsToMoney(cents));
}

/** "30/11/2026" a partir de uma data local `YYYY-MM-DD`, sem converter fuso. */
export function formatLocalDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** "30/11/2026" de um instante, no fuso da loja. */
export function formatDate(instant: string, timeZone: string): string {
  return formatLocalDate(dateInZone(instant, timeZone));
}

/** "30/11/2026 14:05" de um instante, no fuso da loja. */
export function formatDateTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(instant))
    .replace(",", "");
}

/** "Sábado, 21 de novembro" no fuso da loja. */
export function formatLongDate(instant: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "long", day: "numeric", month: "long" })
    .format(new Date(instant))
    .replace(/^\p{L}/u, (letter) => letter.toUpperCase());
}

/** "hoje" | "em 5 dias" | "há 3 dias" | "ontem" */
export function formatRelativeDays(days: number): string {
  if (days === 0) return i18n.t("relative.today");
  if (days === 1) return i18n.t("relative.tomorrow");
  if (days === -1) return i18n.t("relative.yesterday");
  return days > 0
    ? i18n.t("relative.inDays", { count: days })
    : i18n.t("relative.daysAgo", { count: Math.abs(days) });
}

/** "30, 60 e 90" */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${i18n.t("common.and")} ${items[items.length - 1]}`;
}
