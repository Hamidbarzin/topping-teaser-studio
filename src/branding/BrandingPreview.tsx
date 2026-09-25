import { resolveFrameColors } from "./brandingPresets";
import type { BrandingSettings } from "../types";
import { useSettings } from "../hooks/useSettings";
import { COMPANY } from "./company";

export function BrandingPreview({ branding }: { branding: BrandingSettings }) {
  const { t } = useSettings();
  const colors = resolveFrameColors(branding);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div
        className="flex items-center px-4 py-3"
        style={{
          background: colors.header,
          boxShadow: `inset 0 -4px 0 ${colors.stripe}`,
          opacity: branding.header.opacity,
        }}
      >
        {branding.showLogo ? (
          <img src={COMPANY.logoSrc} alt="" className="h-12 w-auto" />
        ) : (
          <span className="text-xs font-semibold" style={{ color: colors.headerInk }}>
            {branding.footer.text}
          </span>
        )}
      </div>
      <div className="h-16 bg-[#111439]" />
      <div
        className="px-4 py-3 text-center"
        style={{
          background: colors.footer,
          boxShadow: `inset 0 4px 0 ${colors.stripe}`,
          opacity: branding.footer.opacity,
        }}
      >
        {branding.showWebsite ? (
          <div className="text-[13px] font-semibold" style={{ color: colors.site }}>
            {branding.footer.website}
          </div>
        ) : (
          <div className="text-[11px] font-semibold" style={{ color: colors.footerInk }}>
            {branding.footer.text}
          </div>
        )}
        {branding.showTagline ? (
          <div className="text-[10px]" style={{ color: colors.footerInk }}>
            {branding.footer.tagline}
          </div>
        ) : null}
        {branding.showCanada ? (
          <div className="text-[10px]" style={{ color: colors.footerInk }}>
            {t("canada")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
