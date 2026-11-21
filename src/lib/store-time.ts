/**
 * Datas no fuso da loja (`settings.timezone`), não no do navegador.
 *
 * O backend trabalha com datas locais da loja (`YYYY-MM-DD`): vencimento do lote, períodos de comissão
 * e agenda de repasses. "Hoje" precisa ser o dia da loja mesmo se o navegador estiver em outro fuso.
 */

/** Fuso usado enquanto `GET /settings` não carrega. É o padrão do backend. */
export const DEFAULT_STORE_TIMEZONE = "America/Sao_Paulo";

/** Data local (`YYYY-MM-DD`) de um instante no fuso informado. */
export function dateInZone(instant: Date | string, timeZone: string): string {
  // O formato en-CA já é YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

/** Hoje (`YYYY-MM-DD`) no fuso da loja. */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return dateInZone(now, timeZone);
}

function parseDate(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month, day];
}

function formatParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Soma dias a uma data local, sem passar por fuso. */
export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = parseDate(date);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return formatParts(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Diferença, em milissegundos, entre o relógio do fuso e o UTC naquele instante. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Quantidade de dias de `from` a `to`, contando os dois (datas locais). */
export function countDaysInclusive(from: string, to: string): number {
  const [fy, fm, fd] = parseDate(from);
  const [ty, tm, td] = parseDate(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000) + 1;
}

/** Instante ISO de 23:59:59 da data local no fuso da loja. */
export function endOfDayInZone(date: string, timeZone: string): string {
  const [year, month, day] = parseDate(date);
  const wallClock = Date.UTC(year, month - 1, day, 23, 59, 59);
  let instant = wallClock - zoneOffsetMs(wallClock, timeZone);
  // Segunda passada para o caso de a data cair numa troca de horário de verão.
  instant = wallClock - zoneOffsetMs(instant, timeZone);
  return new Date(instant).toISOString();
}

export type CommissionPeriod = "mes_atual" | "mes_anterior" | "historico";

/** Início do histórico da loja para o período "todo o histórico". */
const HISTORY_START = "2020-01-01";

/** Período em datas locais inclusivas (`from`/`to`), como `/commission` e `/payment-schedule` esperam. */
export function periodRange(
  period: CommissionPeriod,
  timeZone: string,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = todayInZone(timeZone, now);
  const [year, month] = parseDate(today);
  const firstOfMonth = formatParts(year, month, 1);
  if (period === "mes_anterior") {
    const lastOfPrevious = addDaysToDate(firstOfMonth, -1);
    const [prevYear, prevMonth] = parseDate(lastOfPrevious);
    return { from: formatParts(prevYear, prevMonth, 1), to: lastOfPrevious };
  }
  if (period === "historico") return { from: HISTORY_START, to: today };
  return { from: firstOfMonth, to: today };
}
