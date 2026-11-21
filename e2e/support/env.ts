/**
 * Endereços e credenciais do ambiente E2E. Tudo é descartável: o banco nasce vazio a cada execução e o
 * owner é criado pelo bootstrap do backend com esta senha de teste (não é uma credencial real).
 */
export const FRONT_PORT = Number(process.env.E2E_FRONT_PORT ?? 5175);
export const API_PORT = Number(process.env.E2E_API_PORT ?? 8081);
export const FRONT_URL = `http://localhost:${FRONT_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;

export const OWNER = {
  name: "Owner E2E",
  email: "owner.e2e@luma.test",
  password: "e2e-owner-password-123",
};

/** Senha usada pelos usuários criados nos testes depois da troca obrigatória. */
export const USER_PASSWORD = "e2e-user-password-123";

/** Sufixo único por execução, para nomes de vendedoras e e-mails não colidirem. */
export const RUN_ID = Date.now().toString(36);
