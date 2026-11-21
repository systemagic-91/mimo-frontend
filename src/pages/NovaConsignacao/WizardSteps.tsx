import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Indicador dos passos do assistente. */
export function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useTranslation();
  return (
    <ol className="flex items-center gap-2" aria-label={t("common.steps")}>
      {steps.map((label, index) => (
        <li
          key={label}
          className="flex flex-1 items-center gap-2"
          aria-current={index === current ? "step" : undefined}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
              index < current
                ? "border-gold/40 bg-gold/15 text-gold"
                : index === current
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-muted-foreground",
            )}
          >
            {index < current ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          <span
            className={cn(
              "hidden text-sm sm:block",
              index === current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t(label)}
          </span>
          {index < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
