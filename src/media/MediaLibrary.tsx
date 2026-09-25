import { useState } from "react";
import { MediaItem } from "./MediaItem";
import { MediaUploader } from "./MediaUploader";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

export function MediaLibrary() {
  const { t } = useSettings();
  const { project, media, selectedClipId, selectClip, removeClip, duplicateClip, moveClip, reorderClip } = useStudio();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <MediaUploader />
      {project.clips.length === 0 ? (
        <p className="text-sm text-muted">{t("emptyMedia")}</p>
      ) : (
        project.clips.map((clip, index) => (
          <MediaItem
            key={clip.id}
            clip={clip}
            index={index}
            asset={media.find((item) => item.id === clip.mediaId)}
            selected={clip.id === selectedClipId}
            onSelect={() => selectClip(clip.id)}
            onDelete={() => removeClip(clip.id)}
            onDuplicate={() => duplicateClip(clip.id)}
            onMoveUp={() => moveClip(clip.id, -1)}
            onMoveDown={() => moveClip(clip.id, 1)}
            onDragStart={() => setDragIndex(index)}
            onDrop={() => {
              if (dragIndex !== null) reorderClip(dragIndex, index);
              setDragIndex(null);
            }}
          />
        ))
      )}
      <p className="text-[11px] text-muted">{t("storageLocal")}</p>
    </div>
  );
}
