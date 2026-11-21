import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/http";
import { apiErrorMessage, apiFieldErrors } from "./api-errors";

const error = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  new ApiError(status, { status, code, detail: "texto do backend", ...extra });

describe("api errors", () => {
  it("maps the message by code, not by the backend text", () => {
    expect(apiErrorMessage(error(409, "EMAIL_ALREADY_USED"))).toBe("Já existe um usuário com este e-mail.");
    expect(apiErrorMessage(error(403, "PASSWORD_CHANGE_REQUIRED"))).toBe(
      "Troque a sua senha temporária para continuar.",
    );
  });

  it("lets each area use the text of its context", () => {
    expect(
      apiErrorMessage(error(404, "SELLER_NOT_FOUND"), { codes: { SELLER_NOT_FOUND: "consignment.error.sellerNotFound" } }),
    ).toBe("Esta vendedora não foi encontrada. Escolha outra.");
  });

  it("builds field messages from a validation error", () => {
    const validation = error(400, "VALIDATION_ERROR", { fields: { email: "x", other: "y" } });
    expect(apiFieldErrors(validation, { email: "users.field.email" })).toEqual({
      email: "Informe um e-mail válido.",
      other: "Valor inválido.",
    });
  });

  it("falls back by status and only then to the backend detail", () => {
    expect(apiErrorMessage(error(0, "SOMETHING_NEW"))).toMatch(/^Não foi possível conectar/);
    expect(apiErrorMessage(error(503, "SOMETHING_NEW"))).toMatch(/^O servidor não conseguiu/);
    expect(apiErrorMessage(error(418, "SOMETHING_NEW"))).toBe("texto do backend");
    expect(apiErrorMessage(new Error("boom"))).toBe("Não foi possível concluir a operação.");
  });

  it("never shows the raw body of an error response without JSON", () => {
    expect(apiErrorMessage(error(404, "HTTP_ERROR", { detail: "<html>proxy</html>" }))).toBe(
      "Não foi possível concluir a operação.",
    );
    expect(apiErrorMessage(error(200, "INVALID_RESPONSE"))).toMatch(/^O servidor mandou uma resposta/);
  });
});
