import { describe, expect, it } from "vitest";
import ptBR from "../locales/pt-BR.json";

/**
 * O pt-BR.json e o código precisam concordar: nenhuma chave usada pode faltar no arquivo, e o arquivo
 * não pode ter chave sem uso. Plurais usam os sufixos do i18next (`_zero`, `_one`, `_other`).
 */
const sources = import.meta.glob<string>(["../**/*.{ts,tsx}", "!../**/*.test.{ts,tsx}", "!../test/**"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const keys = new Set(Object.keys(ptBR as Record<string, string>));
const PLURAL_SUFFIX = /_(zero|one|other)$/;
const baseOf = (key: string) => key.replace(PLURAL_SUFFIX, "");
const namespaces = new Set([...keys].map((key) => key.split(".")[0]));
const exists = (key: string) =>
  keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`);

const T_CALL = /\bt\(\s*["'`]([^"'`$]+)["'`]/g;
// Só aspas simples e duplas: entre crases ficam os nomes de campo citados nos comentários.
const STRING_LITERAL = /["']([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+)["']/g;

function collect(pattern: RegExp): Map<string, string> {
  const found = new Map<string, string>();
  for (const [file, source] of Object.entries(sources)) {
    for (const match of source.matchAll(pattern)) found.set(match[1], file);
  }
  return found;
}

describe("pt-BR.json", () => {
  it("has every key passed to t()", () => {
    const missing = [...collect(T_CALL)].filter(([key]) => !exists(key)).map(([key, file]) => `${key} (${file})`);
    expect(missing).toEqual([]);
  });

  it("has every key-like string used in the code, like the ones in label maps", () => {
    const missing = [...collect(STRING_LITERAL)]
      .filter(([key]) => namespaces.has(key.split(".")[0]) && !exists(key))
      .map(([key, file]) => `${key} (${file})`);
    expect(missing).toEqual([]);
  });

  it("has no unused key", () => {
    const used = new Set(collect(STRING_LITERAL).keys());
    for (const key of collect(T_CALL).keys()) used.add(key);
    const unused = [...keys].filter((key) => !used.has(key) && !used.has(baseOf(key)));
    expect(unused).toEqual([]);
  });

  it("gives every plural a _zero form, because pt-BR treats 0 as singular", () => {
    const incomplete = [...keys]
      .filter((key) => key.endsWith("_one"))
      .map(baseOf)
      .filter((base) => !keys.has(`${base}_zero`) || !keys.has(`${base}_other`));
    expect(incomplete).toEqual([]);
  });
});
