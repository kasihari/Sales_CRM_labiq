"use client";

import Modal from "./Modal";
import type { GeoError } from "@/lib/geo";

// Renders the "permission required" / "accuracy low" prompts with Try Again.
export default function LocationErrorModal({
  error,
  onRetry,
  onCancel,
  busy,
}: {
  error: GeoError | null;
  onRetry: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!error) return null;

  const lowAccuracy = error.code === "low_accuracy";
  const title = lowAccuracy ? "Location accuracy is low" : "Location required";
  const body = lowAccuracy
    ? "Please move to an area with better GPS reception and try again."
    : error.code === "unsupported"
    ? "This device or browser does not support location. Please use a mobile phone with GPS."
    : "Location permission is required to record your activity. Enable location and try again.";

  return (
    <Modal open onClose={onCancel}>
      <div className="text-center">
        <div className="mx-auto mb-3 text-4xl">📍</div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-slate-600">{body}</p>
        <div className="mt-5 flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={onRetry}
            disabled={busy}
          >
            {busy ? "Locating…" : "Try Again"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
