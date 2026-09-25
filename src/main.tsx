import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyCompanyTheme } from "./branding/company";
import App from "./App.tsx";
import "./index.css";

applyCompanyTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
