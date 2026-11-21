import { startBackend } from "./support/backend";

/** Sobe o backend de teste antes dos E2E; a função devolvida é o teardown. */
export default async function globalSetup() {
  return startBackend();
}
