"use client";

import { useState } from "react";
import { MediaLibraryModal, type MediaLibraryItem } from "./MediaLibraryModal";

/** Featured image picker (Media Library: upload or choose an existing image). */
export function FeaturedImageBox({ name, mediaIdFieldName, defaultValue }: { name: string; mediaIdFieldName: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [mediaId, setMediaId] = useState<number | "">("");
  const [pickerOpen, setPickerOpen] = useState(false);

  function handlePicked(item: MediaLibraryItem) {
    setValue(`/${item.path.replace(/^\/+/, "")}`);
    setMediaId(item.id);
  }

  return (
    <div>
      <div className="feat-img-visual">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="feat-img-preview" src={value} alt="Featured image" title="Click to replace image" onClick={() => setPickerOpen(true)} />
        ) : (
          <div className="feat-img-placeholder" onClick={() => setPickerOpen(true)}>
            <i className="fas fa-image" />
            <span>Set featured image</span>
          </div>
        )}
      </div>
      <div className="feat-img-actions">
        <button type="button" className="upload-label" onClick={() => setPickerOpen(true)}>
          {value ? "↻ Replace Image" : "+ Set Featured Image"}
        </button>
        {value && (
          <button
            type="button"
            className="upload-label"
            style={{ color: "var(--danger, #dc2626)", borderColor: "var(--danger, #dc2626)" }}
            onClick={() => {
              setValue("");
              setMediaId("");
            }}
          >
            Remove
          </button>
        )}
      </div>
      <span className="field-hint" style={{ display: "block", marginTop: "0.5rem" }}>
        Recommended 1280×720px. Automatic WebP conversion to ~50KB.
      </span>
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name={mediaIdFieldName} value={mediaId} />
      <MediaLibraryModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePicked} />
    </div>
  );
}
