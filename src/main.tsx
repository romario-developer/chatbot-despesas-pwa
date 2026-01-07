import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppRouter from "./routes/AppRouter";
import { registerSW } from "virtual:pwa-register";

export const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event("pwa:need-refresh"));
  },
  onOfflineReady() {
    console.log("PWA pronto para uso offline");
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Periodic update check to surface new versions without disrupting offline usage.
    registration.update();
    window.setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
