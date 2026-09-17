import { useState, useEffect } from "react";
import type { ProjectMetadata } from "../types";
import { MAX_DURATION_SECONDS } from "../types";
import { parseTime, formatTime, isValidTimeFormat } from "../utils/time";
import { Modal } from "./Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: ProjectMetadata, truncateCues: boolean) => void;
  metadata: ProjectMetadata;
  maxCueEnd: number;
}

export function MetadataModal({
  isOpen,
  onClose,
  onSave,
  metadata,
  maxCueEnd,
}: Props) {
  const [title, setTitle] = useState("");
  const [soundtrack, setSoundtrack] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setTitle(metadata.title);
    setSoundtrack(metadata.soundtrack ?? "");
    setDurationStr(formatTime(metadata.durationSeconds));
    setError("");
    setWarning("");
  }, [metadata, isOpen]);

  useEffect(() => {
    if (!isValidTimeFormat(durationStr)) {
      setWarning("");
      return;
    }
    const newDuration = parseTime(durationStr);
    if (newDuration > 0 && newDuration < maxCueEnd) {
      setWarning(
        `Cues run until ${formatTime(maxCueEnd)}. Shortening the timeline will trim or remove the cues past the new limit.`,
      );
    } else {
      setWarning("");
    }
  }, [durationStr, maxCueEnd]);

  const handleSave = () => {
    setError("");

    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    if (!isValidTimeFormat(durationStr)) {
      setError("Duration must be in mm:ss format, with seconds under 60.");
      return;
    }

    const newDuration = parseTime(durationStr);
    if (newDuration <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }
    if (newDuration > MAX_DURATION_SECONDS) {
      setError(`Duration must be ${formatTime(MAX_DURATION_SECONDS)} or less.`);
      return;
    }

    const trimmedSoundtrack = soundtrack.trim();

    onSave(
      {
        title: title.trim(),
        ...(trimmedSoundtrack ? { soundtrack: trimmedSoundtrack } : {}),
        durationSeconds: newDuration,
      },
      newDuration < maxCueEnd,
    );
    onClose();
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-neutral-700 font-medium hover:bg-neutral-200 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors"
      >
        Save Settings
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Settings"
      footer={footer}
    >
      <div>
        <label
          htmlFor="metadata-title"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Project Title
        </label>
        <input
          id="metadata-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Opening ceremony"
        />
      </div>

      <div>
        <label
          htmlFor="metadata-soundtrack"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Soundtrack{" "}
          <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <input
          id="metadata-soundtrack"
          type="text"
          value={soundtrack}
          onChange={(e) => setSoundtrack(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Opening_theme_final.wav"
        />
      </div>

      <div>
        <label
          htmlFor="metadata-duration"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Total Duration (mm:ss)
        </label>
        <input
          id="metadata-duration"
          type="text"
          value={durationStr}
          onChange={(e) => setDurationStr(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 15:00"
        />
      </div>

      {warning && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <span aria-hidden="true" className="text-amber-600 text-sm">
            &#9888;
          </span>
          <p className="text-amber-800 text-sm">{warning}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </Modal>
  );
}
