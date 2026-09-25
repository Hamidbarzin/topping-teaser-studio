/**
 * Swap this file (and public/branding/logo.png) for the next company.
 * Do not scatter brand strings or frame colors through components.
 */
export const COMPANY = {
  name: "TOPPING COURIER",
  nameFa: "تاپینگ کوریر",
  tagline: "FAST • RELIABLE • CANADA",
  taglineFa: "سریع • مطمئن • کانادا",
  website: "toppingcourier.ca",
  logoSrc: `${import.meta.env.BASE_URL}branding/logo.png`,
  showCanada: false,
  showTagline: false,
  showWebsite: true,
  frame: {
    plate: "#FFFFFF",
    footerPlate: "#FFFFFF",
    line: "#F7931E",
    ink: "#1D1F56",
    footerInk: "#1D1F56",
    headerPct: 14,
    footerPct: 12,
    logoSize: 82,
  },
  app: {
    navy: "#0B1028",
    navy2: "#12183A",
    panel: "#181F48",
    accent: "#F7931E",
    accentSoft: "#FFB45A",
    muted: "#A8AED4",
    text: "#F6F7FF",
    line: "rgba(255,255,255,0.10)",
    shadow: "0 24px 60px rgba(5, 8, 24, 0.45)",
  },
} as const;

export type Company = typeof COMPANY;

export function applyCompanyTheme() {
  const root = document.documentElement;
  const { app } = COMPANY;
  root.style.setProperty("--brand-navy", app.navy);
  root.style.setProperty("--brand-navy-2", app.navy2);
  root.style.setProperty("--brand-panel", app.panel);
  root.style.setProperty("--brand-blue", app.accent);
  root.style.setProperty("--brand-cyan", app.accentSoft);
  root.style.setProperty("--brand-muted", app.muted);
  root.style.setProperty("--brand-text", app.text);
  root.style.setProperty("--brand-white", app.text);
  root.style.setProperty("--brand-line", app.line);
  root.style.setProperty("--brand-shadow", app.shadow);
}
