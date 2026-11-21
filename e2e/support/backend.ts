import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { API_PORT, API_URL, FRONT_URL, OWNER } from "./env";

/**
 * Backend de teste: PostgreSQL descartável no Docker (sem volume, some ao parar) e o .jar do mimo-backend.
 *
 * - `E2E_BACKEND_JAR`: caminho do .jar; sem ele, procura em `E2E_BACKEND_DIR/build/libs` e, se não houver,
 *   roda `gradlew bootJar` (padrão `../mimo-backend`).
 * - `JAVA_HOME` (ou `E2E_JAVA_HOME`): JDK 21 usado para compilar e rodar.
 * - Se já houver uma API respondendo em `E2E_API_PORT`, ela é usada e nada é iniciado.
 */
const CONTAINER = "mimo-e2e-postgres";
const DB_PORT = Number(process.env.E2E_DB_PORT ?? 55432);
const DB_PASSWORD = "luma-e2e";
const LOG_DIR = path.resolve("test-results");

const isWindows = process.platform === "win32";

function javaHome(): string | undefined {
  return process.env.E2E_JAVA_HOME ?? process.env.JAVA_HOME;
}

function javaBinary(): string {
  const home = javaHome();
  return home ? path.join(home, "bin", isWindows ? "java.exe" : "java") : "java";
}

async function apiIsUp(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/actuator/health`);
    return response.ok && (await response.text()).includes('"UP"');
  } catch {
    return false;
  }
}

async function waitFor(check: () => Promise<boolean>, what: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`E2E: ${what} não ficou pronto em ${timeoutMs / 1000}s.`);
}

function startPostgres(): void {
  execFileSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
  execFileSync(
    "docker",
    [
      "run", "-d", "--rm", "--name", CONTAINER,
      "-e", "POSTGRES_DB=luma", "-e", "POSTGRES_USER=luma", "-e", `POSTGRES_PASSWORD=${DB_PASSWORD}`,
      "-p", `${DB_PORT}:5432`, "postgres:16-alpine",
    ],
    { stdio: "ignore" },
  );
}

async function postgresReady(): Promise<boolean> {
  try {
    execFileSync("docker", ["exec", CONTAINER, "pg_isready", "-U", "luma", "-d", "luma"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findJar(): string {
  if (process.env.E2E_BACKEND_JAR) return path.resolve(process.env.E2E_BACKEND_JAR);
  const backendDir = path.resolve(process.env.E2E_BACKEND_DIR ?? "../mimo-backend");
  const libs = path.join(backendDir, "build", "libs");
  const pick = () =>
    existsSync(libs) ? readdirSync(libs).find((file) => file.endsWith(".jar") && !file.endsWith("-plain.jar")) : undefined;
  let jar = pick();
  if (!jar) {
    const gradlew = path.join(backendDir, isWindows ? "gradlew.bat" : "gradlew");
    execFileSync(gradlew, ["bootJar", "-q"], {
      cwd: backendDir,
      stdio: "inherit",
      shell: isWindows,
      env: { ...process.env, ...(javaHome() ? { JAVA_HOME: javaHome() } : {}) },
    });
    jar = pick();
  }
  if (!jar) throw new Error(`E2E: nenhum .jar do backend em ${libs}.`);
  return path.join(libs, jar);
}

function startApi(jar: string): ChildProcess {
  mkdirSync(LOG_DIR, { recursive: true });
  const log = createWriteStream(path.join(LOG_DIR, "backend.log"));
  const api = spawn(javaBinary(), ["-jar", jar, `--server.port=${API_PORT}`], {
    env: {
      ...process.env,
      SPRING_PROFILES_ACTIVE: "local",
      DB_URL: `jdbc:postgresql://localhost:${DB_PORT}/luma`,
      DB_USERNAME: "luma",
      DB_PASSWORD,
      CORS_ALLOWED_ORIGINS: FRONT_URL,
      // Local é http: sem `Secure`, o cookie de sessão volta também no WebKit. Em produção (https) ele é Secure.
      REFRESH_COOKIE_SECURE: "false",
      BOOTSTRAP_OWNER_ENABLED: "true",
      BOOTSTRAP_OWNER_NAME: OWNER.name,
      BOOTSTRAP_OWNER_EMAIL: OWNER.email,
      BOOTSTRAP_OWNER_PASSWORD: OWNER.password,
    },
  });
  api.stdout?.pipe(log);
  api.stderr?.pipe(log);
  return api;
}

async function ownerCanLogin(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER.email, password: OWNER.password }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Sobe o banco e a API (se ainda não houver uma API no ar) e devolve a função que derruba tudo. */
export async function startBackend(): Promise<() => Promise<void>> {
  if (await apiIsUp()) return async () => undefined;

  startPostgres();
  await waitFor(postgresReady, "PostgreSQL", 60_000);
  const api = startApi(findJar());
  try {
    await waitFor(apiIsUp, "API (veja test-results/backend.log)", 180_000);
    // O owner do bootstrap é criado logo depois de a aplicação subir.
    await waitFor(ownerCanLogin, "owner do bootstrap", 30_000);
  } catch (error) {
    api.kill();
    execFileSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
    throw error;
  }

  return async () => {
    api.kill();
    execFileSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
  };
}
