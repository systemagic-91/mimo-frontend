import { CheckCircle2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ConsignmentReceipt } from "@/components/consignment-receipt";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import type { ConsignmentDetailsDto } from "@/lib/api/types";
import { formatCents, formatDate } from "@/lib/format";

/** Lote criado: tudo vem da resposta `201` (código oficial, vencimento e snapshots). */
export function CreatedLot({
  consignment,
  timeZone,
  onNew,
}: {
  consignment: ConsignmentDetailsDto;
  timeZone: string;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  const totalCents = consignment.items.reduce((sum, item) => sum + item.valueCentsSnapshot, 0);

  return (
    <>
      <section className="no-print space-y-4 rounded-lg border bg-card p-5 shadow-none">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
          <div>
            <h2 className="font-serif text-lg font-medium text-foreground">
              {t("wizard.created.titleBefore")} <PieceCode code={consignment.code} className="text-lg" />{" "}
              {t("wizard.created.titleAfter")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("wizard.created.summary", {
                pieces: t("common.pieces", { count: consignment.items.length }),
                name: consignment.seller.name,
                dueAt: formatDate(consignment.dueAt, timeZone),
                term: t("common.days", { count: consignment.paymentTermDays ?? 0 }),
                value: formatCents(totalCents),
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t("common.printReceipt")}
          </Button>
          <Button asChild>
            <Link to={`/consignacao/${consignment.sellerId}`}>{t("wizard.created.viewSeller")}</Link>
          </Button>
          <Button variant="ghost" onClick={onNew}>
            {t("consignment.new")}
          </Button>
        </div>
      </section>
      <ConsignmentReceipt consignment={consignment} timeZone={timeZone} />
    </>
  );
}
