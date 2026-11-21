import { expect, type Page } from "@playwright/test";
import { OWNER } from "./env";

/** Entra pela tela de login e espera a área logada aparecer. */
export async function login(page: Page, email = OWNER.email, password = OWNER.password): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Sair" }).first()).toBeVisible();
}
