import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellersTab } from "./SellersTab";
import { SettingsTab } from "./SettingsTab";
import { UsersTab } from "./UsersTab";

export default function Configuracoes() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          {t("settings.title")}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </header>

      <Tabs defaultValue="vendedoras" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="vendedoras">{t("settings.tab.sellers")}</TabsTrigger>
          <TabsTrigger value="parametros">{t("settings.tab.params")}</TabsTrigger>
          <TabsTrigger value="usuarios">{t("settings.tab.users")}</TabsTrigger>
        </TabsList>

        <TabsContent value="vendedoras">
          <SellersTab />
        </TabsContent>

        <TabsContent value="parametros">
          <SettingsTab />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
