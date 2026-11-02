import { useState } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/lib/db";
import { updateSettings, upsertSeller } from "@/lib/domain";
import { SELLER_STATUS_LABEL } from "@/lib/status";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Seller } from "@/lib/types";
import { UsersTab } from "./UsersTab";

export default function Configuracoes() {
  const db = useDb();
  const { settings } = db;

  // Dialog de vendedora
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [commissionRate, setCommissionRate] = useState<string>("30");

  // Parâmetros
  const [defaultRate, setDefaultRate] = useState<string>(
    String(settings.defaultCommissionRate),
  );
  const [terms, setTerms] = useState<number[]>([...settings.paymentTerms]);
  const [consignmentDays, setConsignmentDays] = useState<string>(
    String(settings.defaultConsignmentDays),
  );

  const rateOptions: number[] = [];
  for (
    let r = settings.commissionRanges.min;
    r <= settings.commissionRanges.max;
    r += settings.commissionRanges.step
  ) {
    rateOptions.push(r);
  }

  const openNew = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setCommissionRate(defaultRate);
    setDialogOpen(true);
  };

  const openEdit = (seller: Seller) => {
    setEditing(seller);
    setName(seller.name);
    setPhone(seller.phone);
    setCommissionRate(String(seller.commissionRate));
    setDialogOpen(true);
  };

  const handleSaveSeller = () => {
    if (!name.trim()) {
      toast.error("Informe o nome da vendedora.");
      return;
    }
    upsertSeller({
      id: editing?.id,
      name: name.trim(),
      phone: phone.trim(),
      commissionRate: parseInt(commissionRate, 10),
      status: editing?.status ?? "ativa",
    });
    toast.success(editing ? "Vendedora atualizada" : "Vendedora cadastrada");
    setDialogOpen(false);
  };

  const handleSaveSettings = () => {
    updateSettings({
      defaultCommissionRate: parseInt(defaultRate, 10),
      paymentTerms: terms.length ? terms : [30],
      defaultConsignmentDays: Math.max(1, parseInt(consignmentDays, 10) || 30),
    });
    toast.success("Parâmetros salvos");
  };

  const toggleTerm = (term: number) => {
    setTerms((prev) =>
      prev.includes(term)
        ? prev.filter((t) => t !== term)
        : [...prev, term].sort((a, b) => a - b),
    );
  };

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
          {/* Vendedoras */}
          <section className="overflow-hidden rounded-lg border bg-card shadow-none">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Vendedoras
                </h2>
                <p className="text-sm text-muted-foreground">
                  {db.sellers.length} cadastrada{db.sellers.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" />
                Nova vendedora
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.sellers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-transparent">
                    <TableCell className="font-medium text-foreground">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.phone}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {s.commissionRate}%
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={s.status}
                        label={SELLER_STATUS_LABEL[s.status]}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Switch
                          checked={s.status === "ativa"}
                          onCheckedChange={(checked) =>
                            upsertSeller({
                              id: s.id,
                              name: s.name,
                              phone: s.phone,
                              commissionRate: s.commissionRate,
                              status: checked ? "ativa" : "inativa",
                            })
                          }
                          aria-label={`Ativar ${s.name}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(s)}
                          aria-label={`Editar ${s.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="parametros">
          {/* Parâmetros */}
          <section className="rounded-lg border bg-card p-5 shadow-none">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Comissão e prazos
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Faixas de comissão: {settings.commissionRanges.min}% a{" "}
              {settings.commissionRanges.max}% em passos de{" "}
              {settings.commissionRanges.step}%
            </p>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-rate">
                  Comissão padrão para novas vendedoras
                </Label>
                <Select value={defaultRate} onValueChange={setDefaultRate}>
                  <SelectTrigger id="cfg-rate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rateOptions.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cfg-days">Prazo padrão da consignação (dias)</Label>
                <Input
                  id="cfg-days"
                  type="number"
                  min="1"
                  value={consignmentDays}
                  onChange={(e) => setConsignmentDays(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label>Prazos de pagamento da comissão</Label>
              <div className="flex flex-wrap gap-4">
                {[30, 60, 90].map((term) => (
                  <label
                    key={term}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground"
                  >
                    <Checkbox
                      checked={terms.includes(term)}
                      onCheckedChange={() => toggleTerm(term)}
                    />
                    {term} dias
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={handleSaveSettings}>
                <Save className="h-4 w-4" />
                Salvar parâmetros
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersTab />
        </TabsContent>
      </Tabs>

      {/* Dialog vendedora */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar vendedora" : "Nova vendedora"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados da vendedora."
                : "Cadastre uma vendedora autônoma para consignação."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sl-name">Nome</Label>
              <Input
                id="sl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sl-phone">Telefone</Label>
              <Input
                id="sl-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 90000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sl-rate">Comissão</Label>
              <Select value={commissionRate} onValueChange={setCommissionRate}>
                <SelectTrigger id="sl-rate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rateOptions.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSeller}>
              {editing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
