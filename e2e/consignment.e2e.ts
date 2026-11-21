import { expect, test } from "@playwright/test";
import { TestApi } from "./support/api";
import { login } from "./support/ui";

test.describe("consignação", () => {
  let api: TestApi;

  test.beforeEach(async ({ page }) => {
    api = await TestApi.as();
    await login(page);
  });

  test("cria o lote pelo wizard, vende, devolve e o lote fica quitado", async ({ page }) => {
    const seller = await api.createSeller();
    const sold = await api.createLabeledPiece(10_000);
    const returned = await api.createLabeledPiece(5_000);

    await page.goto("/consignacao/nova");
    await page.getByLabel("Buscar vendedoras").fill(seller.name);
    await page.getByRole("radio", { name: new RegExp(seller.name) }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    for (const piece of [sold, returned]) {
      await page.getByLabel("Buscar peças").fill(piece.code);
      await page.getByRole("checkbox", { name: new RegExp(piece.code) }).click();
    }
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("radiogroup", { name: "Prazo de pagamento" }).getByRole("radio").first().click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Confirmar entrega" }).click();

    const heading = page.getByRole("heading", { name: /Lote C-\d{4}-\d+ entregue/ });
    await expect(heading).toBeVisible();
    const lotCode = (await heading.textContent())!.match(/C-\d{4}-\d+/)![0];
    await page.getByRole("link", { name: "Ver lotes da vendedora" }).click();

    await page.getByRole("button", { name: new RegExp(lotCode) }).click();
    const items = page.getByRole("list", { name: `Peças do lote ${lotCode}` });
    await items.getByRole("button", { name: `Vendida ${sold.code}` }).click();
    await expect(page.getByText("Venda registrada")).toBeVisible();
    await items.getByRole("button", { name: `Devolvida ${returned.code}` }).click();
    await expect(page.getByText("Devolução registrada")).toBeVisible();

    await page.reload();
    const lot = page.getByRole("button", { name: new RegExp(lotCode) });
    await expect(lot).toContainText("Quitado");
    await lot.click();
    await expect(items).toContainText(/Vendida em \d{2}\/\d{2}\/\d{4}/);
    await expect(items).toContainText(/Devolvida em \d{2}\/\d{2}\/\d{4}/);
  });

  test("avisa e recarrega quando outra pessoa já vendeu a peça", async ({ page }) => {
    const seller = await api.createSeller();
    const piece = await api.createLabeledPiece();
    const lot = await api.createConsignment(seller.id, [piece.id]);

    await page.goto(`/consignacao/${seller.id}`);
    await page.getByRole("button", { name: new RegExp(lot.code) }).click();
    const items = page.getByRole("list", { name: `Peças do lote ${lot.code}` });
    await expect(items.getByRole("button", { name: `Vendida ${piece.code}` })).toBeVisible();

    // Outra pessoa registra a venda enquanto a tela está aberta.
    await api.markSold(lot.id, piece.id);
    await items.getByRole("button", { name: `Devolvida ${piece.code}` }).click();

    await expect(page.getByText(/já foi vendida ou devolvida por outra pessoa/)).toBeVisible();
    await expect(items).toContainText(/Vendida em/);
  });

  test("tira da seleção a peça que outra pessoa consignou antes", async ({ page }) => {
    const seller = await api.createSeller();
    const other = await api.createSeller("Outra");
    const piece = await api.createLabeledPiece();

    await page.goto("/consignacao/nova");
    await page.getByLabel("Buscar vendedoras").fill(seller.name);
    await page.getByRole("radio", { name: new RegExp(seller.name) }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Buscar peças").fill(piece.code);
    await page.getByRole("checkbox", { name: new RegExp(piece.code) }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("radiogroup", { name: "Prazo de pagamento" }).getByRole("radio").first().click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await api.createConsignment(other.id, [piece.id]);
    await page.getByRole("button", { name: "Confirmar entrega" }).click();

    await expect(page.getByText(`${piece.code} não está mais disponível e foi tirada da seleção.`)).toBeVisible();
    await expect(page.getByRole("list", { name: "Peças selecionadas" })).toHaveCount(0);
  });
});
