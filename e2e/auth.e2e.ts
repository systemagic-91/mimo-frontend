import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { TestApi } from "./support/api";
import { OWNER, RUN_ID, USER_PASSWORD } from "./support/env";
import { login } from "./support/ui";

test.describe("sessão", () => {
  test("recusa senha errada sem entrar", async ({ page }) => {
    // E-mail próprio: o rate limit de login conta tentativas por e-mail.
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(`ninguem.${RUN_ID}.${randomUUID().slice(0, 6)}@luma.test`);
    await page.getByLabel("Senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toHaveText("E-mail ou senha inválidos.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("mantém a sessão no reload e em outra aba, e o logout encerra", async ({ page, context }) => {
    await login(page);
    await page.goto("/estoque");
    await expect(page.getByRole("heading", { name: "Estoque" })).toBeVisible();

    // O access token fica só em memória: o reload depende do cookie de sessão.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Estoque" })).toBeVisible();

    const second = await context.newPage();
    await second.goto("/consignacao");
    await expect(second.getByRole("heading", { name: "Consignação" })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.reload();
    await expect(page).toHaveURL(/\/login/);

    // A outra aba perde a sessão na próxima renovação.
    await second.reload();
    await expect(second).toHaveURL(/\/login/);
  });

  test("obriga a trocar a senha temporária no primeiro acesso", async ({ page }) => {
    const owner = await TestApi.as();
    const temporary = `temporaria-${randomUUID().slice(0, 8)}`;
    const staff = await owner.createUser("staff", temporary);

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(staff.email);
    await page.getByLabel("Senha").fill(temporary);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/trocar-senha/);
    await expect(page.getByText("Sua senha é temporária.", { exact: false })).toBeVisible();
    await page.getByLabel("Senha atual").fill(temporary);
    await page.getByLabel("Nova senha", { exact: true }).fill(USER_PASSWORD);
    await page.getByLabel("Confirmar nova senha").fill(USER_PASSWORD);
    await page.getByRole("button", { name: "Trocar senha" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Senha alterada. Entre com a nova senha.")).toBeVisible();
    await login(page, staff.email, USER_PASSWORD);
    // Staff cai no estoque e não vê as áreas de owner.
    await expect(page).toHaveURL(/\/estoque/);
    await expect(page.getByRole("link", { name: "Relatórios" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Configurações" })).toHaveCount(0);
  });

  test("a conta do owner continua entrando depois dos outros testes", async ({ page }) => {
    await login(page, OWNER.email, OWNER.password);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
