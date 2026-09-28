import { SOCIAL_PLATFORMS, applyPreset, findSocialPreset, presetsFor } from "./formatPresets";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import type { SocialPlatform } from "../types";
import type { MessageKey } from "../i18n";

export function SocialTargetPicker() {
  const { t } = useSettings();
  const { project, patchProject } = useStudio();
  const current = findSocialPreset(project.formatId, project.exportSettings.fileFormat, project.exportSettings.platform);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{t("socialHint")}</p>
      {SOCIAL_PLATFORMS.map((platform) => (
        <div key={platform} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan">{t(platformLabel(platform))}</p>
          <div className="grid grid-cols-3 gap-2">
            {presetsFor(platform).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const next = applyPreset(preset);
                  patchProject((projectState) => ({
                    ...projectState,
                    formatId: next.formatId,
                    customWidth: next.customWidth,
                    customHeight: next.customHeight,
                    exportSettings: { ...projectState.exportSettings, ...next.exportSettings },
                  }));
                }}
                className={`rounded-xl border px-2 py-2 text-center text-sm ${current.id === preset.id ? "border-cyan bg-blue/15 font-semibold" : "border-line"}`}
              >
                {t(preset.labelKey)}
                <span className="mt-0.5 block text-[10px] font-normal text-muted">
                  {preset.width}×{preset.height}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="rounded-2xl bg-navy/50 px-3 py-2 text-sm text-cyan">
        {t(current.specKey)}
      </p>
    </div>
  );
}

function platformLabel(platform: SocialPlatform): MessageKey {
  if (platform === "facebook") return "platformFacebook";
  if (platform === "linkedin") return "platformLinkedin";
  return "platformInstagram";
}
