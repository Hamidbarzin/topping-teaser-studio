import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "./mediaTypes";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

export function MediaUploader() {
  const { t } = useSettings();
  const { addFiles, busy } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        void addFiles([...event.dataTransfer.files]);
      }}
      className={`rounded-2xl border border-dashed p-5 text-center ${over ? "border-cyan bg-blue/10" : "border-line bg-navy/40"}`}
    >
      <p className="text-sm font-medium">{t("uploadTitle")}</p>
      <p className="mt-1 text-xs text-muted">{t("uploadHint")}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded-xl bg-blue px-3 py-2 text-sm font-semibold text-[#1d1f56] disabled:opacity-60"
      >
        {t("browse")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="sr-only"
        aria-label={t("browse")}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void addFiles(files);
        }}
      />
    </div>
  );
}
