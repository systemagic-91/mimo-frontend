import { expect, test } from "@playwright/test";
import { RUN_ID } from "./support/env";
import { login } from "./support/ui";

test.describe("configurações", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/configuracoes");
  });

  test("cadastra e edita uma vendedora, que persiste no reload", async ({ page }, testInfo) => {
    const name = `Vendedora UI ${RUN_ID} ${testInfo.project.name}`;
    await page.getByRole("button", { name: "Nova vendedora" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expect(dialog.getByText("Informe o nome da vendedora.")).toBeVisible();

    await dialog.getByLabel("Nome").fill(name);
    await dialog.getByLabel("Telefone").fill("(11) 97777-0000");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByText(`${name} cadastrada.`)).toBeVisible();

    await page.reload();
    await page.getByLabel("Buscar vendedoras").fill(name);
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: `Editar ${name}` }).click();
    await page.getByRole("dialog").getByLabel("Comissão").click();
    await page.getByRole("option", { name: "35%" }).click();
    await expect(page.getByText(/só vale para os lotes entregues daqui em diante/)).toBeVisible();
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Vendedora atualizada.")).toBeVisible();
    await page.reload();
    await page.getByLabel("Buscar vendedoras").fill(name);
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("35%");
  });

  test("salva os parâmetros da loja", async ({ page }) => {
    await page.getByRole("tab", { name: "Comissão e prazos" }).click();
    const days = page.getByLabel("Prazo padrão da consignação (dias)");
    await days.fill("0");
    await page.getByRole("button", { name: "Salvar parâmetros" }).click();
    await expect(page.getByText("O prazo da consignação precisa ser de pelo menos 1 dia.")).toBeVisible();

    await days.fill("45");
    await page.getByRole("button", { name: "Salvar parâmetros" }).click();
    await expect(page.getByText("Parâmetros salvos.")).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Comissão e prazos" }).click();
    await expect(page.getByLabel("Prazo padrão da consignação (dias)")).toHaveValue("45");

    // Volta ao padrão, porque o banco é compartilhado pelos outros testes.
    await page.getByLabel("Prazo padrão da consignação (dias)").fill("30");
    await page.getByRole("button", { name: "Salvar parâmetros" }).click();
    await expect(page.getByText("Parâmetros salvos.")).toBeVisible();
  });

  test("cadastra um usuário com troca de senha pendente", async ({ page }, testInfo) => {
    const email = `equipe.${RUN_ID}.${testInfo.project.name}@luma.test`;
    await page.getByRole("tab", { name: "Usuários" }).click();
    await page.getByRole("button", { name: "Novo usuário" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill(`Equipe ${RUN_ID}`);
    await dialog.getByLabel("E-mail").fill(email);
    await dialog.getByLabel("Senha temporária").fill("temporaria-123456");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByText(/cadastrado\(a\)\. Entregue a senha temporária pessoalmente\./)).toBeVisible();

    await page.getByLabel("Buscar usuários").fill(email);
    await expect(page.getByRole("row", { name: new RegExp(email) })).toContainText("Troca de senha pendente");
  });
});
