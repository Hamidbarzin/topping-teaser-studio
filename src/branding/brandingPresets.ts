import { COMPANY } from "./company";
import type { BrandingSettings, BrandPresetId } from "../types";

export const BRAND_TAGLINE = COMPANY.tagline;
export const BRAND_SITE = COMPANY.website;

export function createBranding(enabled = true, preset: BrandPresetId = "classic"): BrandingSettings {
  const base: BrandingSettings = {
    enabled,
    preset,
    showHeader: true,
    showFooter: true,
    showLogo: true,
    showTagline: COMPANY.showTagline,
    showCanada: COMPANY.showCanada,
    showWebsite: COMPANY.showWebsite,
    colorsAuto: true,
    accent: COMPANY.frame.line,
    barColor: COMPANY.frame.plate,
    header: {
      logoSize: COMPANY.frame.logoSize,
      logoPosition: "left",
      padding: 28,
      height: COMPANY.frame.headerPct,
      opacity: 1,
      color: COMPANY.frame.plate,
    },
    footer: {
      showLogo: false,
      text: COMPANY.name,
      tagline: COMPANY.tagline,
      website: COMPANY.website,
      showMapleLeaf: false,
      height: COMPANY.frame.footerPct,
      opacity: 1,
      color: COMPANY.frame.footerPlate,
    },
  };
  return applyPreset(base, preset);
}

export function normalizeBranding(branding: BrandingSettings): BrandingSettings {
  return {
    ...branding,
    colorsAuto: branding.colorsAuto !== false,
    accent: branding.accent || COMPANY.frame.line,
    barColor: branding.barColor || COMPANY.frame.plate,
    header: {
      ...branding.header,
      color: branding.header.color || branding.barColor || COMPANY.frame.plate,
    },
    footer: {
      ...branding.footer,
      color: branding.footer.color || branding.header.color || COMPANY.frame.plate,
    },
  };
}

export function applyPreset(current: BrandingSettings, preset: BrandPresetId): BrandingSettings {
  const next: BrandingSettings = {
    ...current,
    preset,
    header: { ...current.header },
    footer: { ...current.footer },
  };
  if (preset === "classic") {
    next.colorsAuto = true;
    next.barColor = COMPANY.frame.plate;
    next.accent = COMPANY.frame.line;
    next.header.color = COMPANY.frame.plate;
    next.footer.color = COMPANY.frame.plate;
    next.header.logoPosition = "left";
    next.header.height = COMPANY.frame.headerPct;
    next.header.logoSize = COMPANY.frame.logoSize;
    next.footer.height = COMPANY.frame.footerPct;
    next.showTagline = COMPANY.showTagline;
    next.showCanada = COMPANY.showCanada;
    next.showWebsite = COMPANY.showWebsite;
  } else if (preset === "tech") {
    next.colorsAuto = false;
    next.barColor = "#050B14";
    next.accent = "#0F5CFF";
    next.header.color = "#050B14";
    next.footer.color = "#050B14";
    next.header.logoPosition = "left";
    next.header.height = 14;
    next.header.logoSize = 96;
    next.footer.height = 15;
    next.showWebsite = true;
  } else if (preset === "minimal") {
    next.colorsAuto = false;
    next.barColor = "#FFFFFF";
    next.accent = COMPANY.frame.line;
    next.header.color = "#FFFFFF";
    next.footer.color = "#FFFFFF";
    next.header.logoPosition = "center";
    next.header.height = 14;
    next.header.logoSize = 96;
    next.footer.height = 11;
    next.showTagline = false;
    next.showCanada = false;
    next.showWebsite = true;
    next.header.opacity = 1;
    next.footer.opacity = 1;
  } else if (preset === "future") {
    next.colorsAuto = false;
    next.barColor = "#07182C";
    next.accent = "#00D9FF";
    next.header.color = "#07182C";
    next.footer.color = "#07182C";
    next.header.logoPosition = "left";
    next.header.height = 14;
    next.header.logoSize = 96;
    next.footer.height = 17;
    next.showTagline = true;
    next.showCanada = true;
  } else {
    next.colorsAuto = false;
    next.barColor = "#03070E";
    next.accent = "#F7931E";
    next.header.color = "#03070E";
    next.footer.color = "#03070E";
    next.header.logoPosition = "center";
    next.header.height = 14;
    next.header.logoSize = 96;
    next.footer.height = 18;
    next.showTagline = true;
    next.showCanada = true;
    next.footer.showLogo = true;
  }
  return next;
}

export function applyAutoFrameColors(branding: BrandingSettings): BrandingSettings {
  return {
    ...branding,
    colorsAuto: true,
    accent: COMPANY.frame.line,
    barColor: COMPANY.frame.plate,
    header: { ...branding.header, color: COMPANY.frame.plate },
    footer: { ...branding.footer, color: COMPANY.frame.plate },
  };
}

export interface FrameColors {
  header: string;
  footer: string;
  stripe: string;
  headerInk: string;
  footerInk: string;
  site: string;
}

export function resolveFrameColors(branding: BrandingSettings): FrameColors {
  if (branding.colorsAuto !== false) {
    return {
      header: COMPANY.frame.plate,
      footer: COMPANY.frame.plate,
      stripe: COMPANY.frame.line,
      headerInk: COMPANY.frame.ink,
      footerInk: COMPANY.frame.ink,
      site: COMPANY.frame.line,
    };
  }
  const header = branding.header.color || branding.barColor || COMPANY.frame.plate;
  const footer = branding.footer.color || header;
  const stripe = branding.accent || COMPANY.frame.line;
  return {
    header,
    footer,
    stripe,
    headerInk: contrastInk(header),
    footerInk: contrastInk(footer),
    site: stripe,
  };
}

function contrastInk(background: string): string {
  const hex = background.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return "#FFFFFF";
  const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
  return light ? "#1D1F56" : "#FFFFFF";
}
