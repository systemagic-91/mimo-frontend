
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
  const { items } = consignment;
  const totalCents = items.reduce((sum, item) => sum + item.valueCentsSnapshot, 0);

  return (
    <div className="print-only" style={{ color: "#1D1917", background: "#ffffff" }}>
      <div className="p-8" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#e5ded5" }}>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500 }}>Luma</div>
            <div style={{ fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase" }}>
              semijoias
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontWeight: 600 }}>Relatório de itens entregues</div>
            <div style={{ fontSize: 12, color: "#6b6259" }}>Lote {consignment.code} · Consignação</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4" style={{ fontSize: 13 }}>
          <div>
            <div style={{ color: "#6b6259" }}>Vendedora</div>
            <div style={{ fontWeight: 600 }}>{consignment.seller.name}</div>
          </div>
          <div>
            <div style={{ color: "#6b6259" }}>Entregue em</div>
            <div style={{ fontWeight: 600 }}>{formatDate(consignment.deliveredAt, timeZone)}</div>
          </div>
          <div>
            <div style={{ color: "#6b6259" }}>Prazo de devolução</div>
            <div style={{ fontWeight: 600 }}>{formatDate(consignment.dueAt, timeZone)}</div>
          </div>
          <div>
            <div style={{ color: "#6b6259" }}>Prazo de pagamento</div>
            <div style={{ fontWeight: 600 }}>
              {consignment.paymentTermDays ? `${consignment.paymentTermDays} dias` : "Não informado"}
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
                Código
              </th>
              <th className="py-2 text-left" style={CELL_BORDER}>
                Tipo
              </th>
              <th className="py-2 text-right" style={CELL_BORDER}>
                Valor
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
                {items.length} peça{items.length === 1 ? "" : "s"}
              </td>
              <td className="pt-2 text-right font-semibold">{formatCents(totalCents)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-10">
          <div style={SIGNATURE}>Vendedora</div>
          <div style={SIGNATURE}>Luma Semijoias</div>
        </div>
      </div>
    </div>
  );
}
