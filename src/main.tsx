import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyCompanyTheme } from "./branding/company";
import App from "./App.tsx";
import "./index.css";

applyCompanyTheme();

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) void registration.unregister();
  });
}
if (typeof caches !== "undefined") {
  void caches.keys().then((keys) => {
    for (const key of keys) void caches.delete(key);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
