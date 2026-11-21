import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellersTab } from "./SellersTab";
import { SettingsTab } from "./SettingsTab";
import { UsersTab } from "./UsersTab";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Configurações
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Vendedoras, comissões, prazos e usuários
        </p>
      </header>

      <Tabs defaultValue="vendedoras" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="vendedoras">Vendedoras</TabsTrigger>
          <TabsTrigger value="parametros">Comissão e prazos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
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
