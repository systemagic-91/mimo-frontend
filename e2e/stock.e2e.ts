import { expect, test } from "@playwright/test";
import { login } from "./support/ui";

/** PNG 1×1 válido: o navegador consegue decodificar e reduzir no canvas antes do upload. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("estoque e etiquetagem", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("recebe uma peça, que continua no estoque depois do reload", async ({ page }) => {
    await page.goto("/estoque");
    await page.getByRole("button", { name: "Receber peça" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Valor de venda (R$)").fill("abc");
    await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Informe um valor maior que zero");

    await dialog.getByLabel("Valor de venda (R$)").fill("84,90");
    await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
    const toast = page.getByText(/LU-\d+ registrada como Na fábrica\./);
    await expect(toast).toBeVisible();
    const code = (await toast.textContent())!.match(/LU-\d+/)![0];

    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByLabel("Buscar peças").fill(code);
    const row = page.getByRole("row", { name: new RegExp(code) });
    await expect(row).toContainText("Na fábrica");
    await expect(row).toContainText("84,90");
  });

  test("etiqueta a peça que voltou do banho, com foto", async ({ page }) => {
    await page.goto("/estoque");
    await page.getByRole("button", { name: "Receber peça" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Valor de venda (R$)").fill("129,90");
    await dialog.getByLabel("Onde está").click();
    await page.getByRole("option", { name: "Enviada ao banho de ouro" }).click();
    await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
    const toast = page.getByText(/LU-\d+ registrada como No banho de ouro\./);
    await expect(toast).toBeVisible();
    const code = (await toast.textContent())!.match(/LU-\d+/)![0];
    await page.keyboard.press("Escape");

    await page.goto("/etiquetagem");
    await page.getByLabel("Buscar peça no banho").fill(code);
    await page.getByRole("button", { name: new RegExp(`^${code},`) }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByTestId("photo-input").setInputFiles({ name: "peca.png", mimeType: "image/png", buffer: PNG_1X1 });
    await expect(page.getByRole("img", { name: "Foto enviada da peça" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Valor de venda (R$)")).toHaveValue("129,90");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("switch", { name: "Peça retornou do banho de ouro" }).click();
    await page.getByRole("button", { name: "Confirmar etiquetagem" }).click();

    await expect(page.getByRole("heading", { name: "Peça etiquetada" })).toBeVisible();
    // A etiquetagem mantém o código da peça (aparece no resultado e no aviso).
    await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: `Foto da peça ${code}` })).toBeVisible();

    await page.getByRole("button", { name: "Ver no estoque" }).click();
    await page.getByLabel("Buscar peças").fill(code);
    await expect(page.getByRole("row", { name: new RegExp(code) })).toContainText("Etiquetada");
  });

  test("mostra o erro de rede e recupera com 'Tentar novamente'", async ({ page }) => {
    await page.route("**/api/v1/pieces?**", (route) => route.abort("failed"));
    await page.goto("/estoque");
    await expect(page.getByText(/Não foi possível conectar ao servidor/)).toBeVisible({ timeout: 15_000 });

    await page.unroute("**/api/v1/pieces?**");
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("columnheader", { name: "Código" })).toBeVisible();
  });
});
