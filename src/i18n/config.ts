import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { fallbackLng, getLanguageDirection, supportedLngs } from "./util";

export * from "./util";

// Os arquivos de idioma de src/locales vão no build e entram como `resources` síncronos: t() já devolve o
// texto na primeira pintura, sem carregar nada por HTTP. Hoje só existe pt-BR, então não há detecção de
// idioma: o app sempre abre no fallbackLng. Um idioma novo entra em i18n.config.json e src/locales.
const bundledResources = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, string>>("../locales/*.json", {
      eager: true,
      import: "default",
    }),
  ).map(([filePath, translation]) => {
    const code = filePath.match(/([^/]+)\.json$/)?.[1] ?? "";
    return [code, { translation }];
  }),
);

void i18n.use(initReactI18next).init({
  lng: fallbackLng,
  fallbackLng,
  supportedLngs,
  resources: bundledResources,
  // Chaves planas com pontos num só namespace: os separadores ficam desligados para a chave inteira ser literal.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

const syncDocumentLanguage = (lng: string) => {
  // Sem DOM (testes em ambiente node), não há <html> para sincronizar.
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = getLanguageDirection(lng);
};

syncDocumentLanguage(fallbackLng);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
