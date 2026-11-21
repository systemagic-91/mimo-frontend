import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { activateUser, TestApi } from "./support/api";
import { USER_PASSWORD } from "./support/env";
import { login } from "./support/ui";

test.describe("dashboard e relatórios", () => {
  test("mostra a venda no giro e exporta o CSV com a linha", async ({ page }) => {
    const api = await TestApi.as();
    const seller = await api.createSeller();
    const piece = await api.createLabeledPiece(8_490);
    const lot = await api.createConsignment(seller.id, [piece.id]);
    await api.markSold(lot.id, piece.id);

    await login(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Giro médio de peça")).toBeVisible();

    await page.goto("/relatorios");
    const row = page.getByRole("row", { name: new RegExp(piece.code) });
    await expect(row).toContainText("84,90");
    await expect(row).toContainText(seller.name);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const csv = await readFile((await (await download).path())!, "utf-8");
    expect(csv.startsWith("﻿Codigo;Tipo;Valor")).toBeTruthy();
    expect(csv).toContain(`${piece.code};Brinco;"84,90"`);
  });

  test("staff não acessa os relatórios", async ({ page }) => {
    const api = await TestApi.as();
    const temporary = `temporaria-${randomUUID().slice(0, 8)}`;
    const staff = await api.createUser("staff", temporary);
    await activateUser(staff.email, temporary, USER_PASSWORD);

    await login(page, staff.email, USER_PASSWORD);
    await page.goto("/relatorios");

    await expect(page.getByText("Esta área é restrita a sócios(as) da loja.")).toBeVisible();
    await expect(page).toHaveURL(/\/estoque/);
  });
});
