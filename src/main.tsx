import { createRoot } from "react-dom/client";
import "./i18n/config";
import { bootstrapGeneratedSiteAnalytics } from "./analytics.ts";
import App from "./App.tsx";
import "./index.css";
import { clearLegacyDemoData } from "./lib/legacy-storage";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

clearLegacyDemoData();
bootstrapGeneratedSiteAnalytics();

createRoot(container).render(<App />);
