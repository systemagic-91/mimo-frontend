import { randomUUID } from "node:crypto";
import { type APIRequestContext, expect, request } from "@playwright/test";
import { API_URL, OWNER, RUN_ID } from "./env";

/**
 * Cliente direto da API (sem passar pelo front) para preparar os dados de cada teste. Fala com o backend
 * sem o header Origin, como uma chamada de servidor; o front é exercitado só pelas telas.
 */
export class TestApi {
  private constructor(
    private readonly http: APIRequestContext,
    private readonly token: string,
  ) {}

  static async as(email = OWNER.email, password = OWNER.password): Promise<TestApi> {
    const http = await request.newContext({ baseURL: `${API_URL}/api/v1/` });
    const response = await http.post("auth/login", { data: { email, password } });
    expect(response.ok(), `login de ${email} na API`).toBeTruthy();
    const { accessToken } = (await response.json()) as { accessToken: string };
    return new TestApi(http, accessToken);
  }

  private headers(mutation: boolean) {
    return {
      Authorization: `Bearer ${this.token}`,
      ...(mutation ? { "Idempotency-Key": randomUUID() } : {}),
    };
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.http.get(path, { headers: this.headers(false) });
    expect(response.ok(), `GET ${path}: ${response.status()}`).toBeTruthy();
    return (await response.json()) as T;
  }

  async send<T>(method: "post" | "patch", path: string, data: unknown = {}): Promise<T> {
    const response = await this.http[method](path, { headers: this.headers(true), data });
    expect(response.ok(), `${method.toUpperCase()} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async createSeller(prefix = "Vendedora"): Promise<{ id: string; name: string }> {
    const name = `${prefix} ${RUN_ID}-${randomUUID().slice(0, 4)}`;
    const seller = await this.send<{ id: string; name: string }>("post", "sellers", {
      name,
      phone: "(11) 90000-0000",
      commissionRate: 30,
    });
    return seller;
  }

  /** Recebe no banho e etiqueta: devolve uma peça ETIQUETADA pronta para consignação. */
  async createLabeledPiece(valueCents = 10_000): Promise<{ id: string; code: string }> {
    const received = await this.send<{ piece: { id: string } }>("post", "pieces/receive", {
      type: "Brinco",
      valueCents,
      stage: "BANHO_OURO",
    });
    return this.send<{ id: string; code: string }>("post", "pieces/label", {
      sourcePieceId: received.piece.id,
      type: "Brinco",
      valueCents,
      backFromBath: true,
    });
  }

  async createConsignment(sellerId: string, pieceIds: string[]): Promise<{ id: string; code: string }> {
    const settings = await this.get<{ paymentTerms: number[] }>("settings");
    const due = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    return this.send<{ id: string; code: string }>("post", "consignments", {
      sellerId,
      pieceIds,
      dueDate: due,
      paymentTermDays: settings.paymentTerms[0],
    });
  }

  async markSold(consignmentId: string, pieceId: string): Promise<void> {
    await this.send("post", `consignments/${consignmentId}/items/${pieceId}/sold`);
  }

  /** Usuário novo nasce com troca obrigatória de senha. */
  async createUser(role: "owner" | "staff", temporaryPassword: string): Promise<{ id: string; email: string }> {
    return this.send<{ id: string; email: string }>("post", "users", {
      name: `Pessoa ${RUN_ID}`,
      email: `${role}.${RUN_ID}.${randomUUID().slice(0, 6)}@luma.test`,
      role,
      temporaryPassword,
    });
  }
}

/** Faz a troca obrigatória de senha pela API, para ter um usuário pronto para entrar. */
export async function activateUser(email: string, temporaryPassword: string, newPassword: string): Promise<void> {
  const http = await request.newContext({ baseURL: `${API_URL}/api/v1/` });
  const login = await http.post("auth/login", { data: { email, password: temporaryPassword } });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const change = await http.post("auth/change-password", {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { currentPassword: temporaryPassword, newPassword },
  });
  expect(change.status()).toBe(204);
}
