import type { PortraitPostCopy, PortraitVariantId, PostFooterStyle } from "../types";
import { COMPANY } from "../branding/company";

export type { PortraitPostCopy, PortraitVariantId, PostFooterStyle };

export const VARIANT_POSTERS: Record<PortraitVariantId, string> = {
  service: `${import.meta.env.BASE_URL}templates/van-service.jpg`,
  tracking: `${import.meta.env.BASE_URL}templates/van-tracking.jpg`,
  cta: `${import.meta.env.BASE_URL}templates/van-cta.jpg`,
};

export const PORTRAIT_VARIANT_IDS: PortraitVariantId[] = ["service", "tracking", "cta"];

export const PORTRAIT_NAVY = "#08122E";
export const PORTRAIT_ORANGE = "#FF8C1A";

export const PORTRAIT_VARIANTS: Record<PortraitVariantId, PortraitPostCopy> = {
  service: {
    variantId: "service",
    tag: "NEW ROUTE",
    badge: "SAME DAY",
    headline1: "Citywide",
    headline2: "when it counts.",
    cta: "Book a pickup",
    website: COMPANY.website,
    footerStyle: "button",
  },
  tracking: {
    variantId: "tracking",
    tag: "LIVE TRACK",
    badge: "IN TRANSIT",
    headline1: "Know where",
    headline2: "it is.",
    cta: "Track a parcel",
    website: COMPANY.website,
    footerStyle: "button",
  },
  cta: {
    variantId: "cta",
    tag: "BOOK NOW",
    badge: "FAST QUOTES",
    headline1: "Ready when",
    headline2: "you are.",
    cta: "Get a quote",
    website: COMPANY.website,
    footerStyle: "button",
  },
};

export function createPortraitPost(variant: PortraitVariantId = "cta"): PortraitPostCopy {
  return { ...PORTRAIT_VARIANTS[variant] };
}

export function normalizePortraitPost(post?: PortraitPostCopy | null): PortraitPostCopy {
  const base = PORTRAIT_VARIANTS[post?.variantId ?? "cta"] ?? PORTRAIT_VARIANTS.cta;
  return {
    ...base,
    ...post,
    tag: post?.tag ?? base.tag,
    badge: post?.badge ?? base.badge,
    headline1: post?.headline1 ?? base.headline1,
    headline2: post?.headline2 ?? base.headline2,
    cta: post?.cta ?? base.cta,
    website: post?.website ?? COMPANY.website,
    footerStyle: post?.footerStyle === "urlArrow" ? "urlArrow" : "button",
  };
}

export function loadVariantPoster(id: PortraitVariantId): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = VARIANT_POSTERS[id];
  });
}
