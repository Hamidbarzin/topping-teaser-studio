import type { TextOverlay as TextOverlayModel } from "../types";

export function TextOverlayRow({
  overlay,
  selected,
  onSelect,
  onDelete,
}: {
  overlay: TextOverlayModel;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-start text-sm ${selected ? "border-cyan bg-blue/10" : "border-line"}`}
    >
      <span className="truncate">{overlay.text || "—"}</span>
      <span
        role="button"
        tabIndex={0}
        className="ms-2 text-xs text-muted"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.stopPropagation();
            onDelete();
          }
        }}
      >
        ×
      </span>
    </button>
  );
}
