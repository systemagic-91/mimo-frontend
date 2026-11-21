
import { useTranslation } from "react-i18next";
import type { ConsignmentDetailsDto } from "@/lib/api/types";
import { formatCents, formatDate } from "@/lib/format";

const CELL_BORDER = { borderBottom: "1px solid #e5ded5", fontWeight: 600 } as const;
const SIGNATURE = {
  borderTop: "1px solid #1D1917",
  paddingTop: 6,
  fontSize: 11,
  color: "#6b6259",
} as const;

/**
 * Romaneio do lote para `window.print()`. Só aparece na impressão (`print-only`) e usa os dados do lote
 * devolvido pela API: código oficial e os snapshots de código, tipo e valor de cada peça.
 */
export function ConsignmentReceipt({
  consignment,
  timeZone,
}: {
  consignment: ConsignmentDetailsDto;
  timeZone: string;
}) {
  const { t } = useTranslation();
  const { items } = consignment;
  const totalCents = items.reduce((sum, item) => sum + item.valueCentsSnapshot, 0);

  return (
    <div className="print-only" style={{ color: "#1D1917", background: "#ffffff" }}>
      <div className="p-8" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#e5ded5" }}>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500 }}>{t("brand.name")}</div>
            <div style={{ fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase" }}>
              {t("brand.tagline")}
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontWeight: 600 }}>{t("receipt.title")}</div>
            <div style={{ fontSize: 12, color: "#6b6259" }}>{t("receipt.lot", { code: consignment.code })}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4" style={{ fontSize: 13 }}>
          <div>
            <div style={{ color: "#6b6259" }}>{t("receipt.seller")}</div>
            <div style={{ fontWeight: 600 }}>{consignment.seller.name}</div>
          </div>
          <div>
            <div style={{ color: "#6b6259" }}>{t("receipt.deliveredAt")}</div>
            <div style={{ fontWeight: 600 }}>{formatDate(consignment.deliveredAt, timeZone)}</div>
          </div>
          <div>
            <div style={{ color: "#6b6259" }}>{t("receipt.dueAt")}</div>
            <div style={{ fontWeight: 600 }}>{formatDate(consignment.dueAt, timeZone)}</div>
          </div>
          <div>
            <div style={{ color: "#6b6259" }}>{t("receipt.paymentTerm")}</div>
            <div style={{ fontWeight: 600 }}>
              {consignment.paymentTermDays
                ? t("common.days", { count: consignment.paymentTermDays })
                : t("common.notInformed")}
            </div>
          </div>
        </div>

        {consignment.note && (
          <p className="mt-4" style={{ fontSize: 12, color: "#6b6259" }}>
            {consignment.note}
          </p>
        )}

        <table className="mt-5 w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th className="py-2 text-left" style={CELL_BORDER}>
                {t("receipt.code")}
              </th>
              <th className="py-2 text-left" style={CELL_BORDER}>
                {t("receipt.type")}
              </th>
              <th className="py-2 text-right" style={CELL_BORDER}>
                {t("receipt.value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {item.codeSnapshot}
                </td>
                <td className="py-1.5">{item.typeSnapshot}</td>
                <td className="py-1.5 text-right">
                  {formatCents(item.valueCentsSnapshot)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2 font-semibold" colSpan={2}>
                {t("common.pieces", { count: items.length })}
              </td>
              <td className="pt-2 text-right font-semibold">{formatCents(totalCents)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-10">
          <div style={SIGNATURE}>{t("receipt.seller")}</div>
          <div style={SIGNATURE}>{t("brand.full")}</div>
        </div>
      </div>
    </div>
  );
}
