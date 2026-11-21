import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreTimezone } from "@/hooks/use-store-timezone";
import { OverdueTab } from "./OverdueTab";
import { StaleTab } from "./StaleTab";
import { TurnoverTab } from "./TurnoverTab";

/**
 * Relatórios do owner (a rota é `RequireRole owner`). Cada aba só consulta a API quando está aberta:
 * o conteúdo das abas fechadas não fica montado.
 */
export default function Relatorios() {
  const { t } = useTranslation();
  const timeZone = useStoreTimezone();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">{t("reports.title")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("reports.subtitle")}
        </p>
      </header>

      <Tabs defaultValue="giro">
        <TabsList>
          <TabsTrigger value="giro">{t("reports.tab.turnover")}</TabsTrigger>
          <TabsTrigger value="inadimplencia">{t("reports.tab.overdue")}</TabsTrigger>
          <TabsTrigger value="paradas">{t("reports.tab.stale")}</TabsTrigger>
        </TabsList>

        <TabsContent value="giro">
          <TurnoverTab timeZone={timeZone} />
        </TabsContent>
        <TabsContent value="inadimplencia">
          <OverdueTab />
        </TabsContent>
        <TabsContent value="paradas">
          <StaleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
