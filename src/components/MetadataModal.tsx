import React, { useState, useEffect } from "react";
import { ProjectMetadata } from "../types";
import { parseTime, formatTime, isValidTimeFormat } from "../utils/time";
import { Modal } from "./Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: ProjectMetadata, truncateActions: boolean) => void;
  metadata: ProjectMetadata;
  maxActionEnd: number;
}

export function MetadataModal({
  isOpen,
  onClose,
  onSave,
  metadata,
  maxActionEnd,
}: Props) {
  const [title, setTitle] = useState("");
  const [musicName, setMusicName] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setTitle(metadata.title);
    setMusicName(metadata.musicName);
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
    if (newDuration > 0 && newDuration < maxActionEnd) {
      setWarning(
        `Des actions existent jusqu'à ${formatTime(maxActionEnd)}. Réduire la durée tronquera ou supprimera les actions dépassant la nouvelle limite.`,
      );
    } else {
      setWarning("");
    }
  }, [durationStr, maxActionEnd]);

  const handleSave = () => {
    setError("");

    if (!title.trim()) {
      setError("Le titre du projet est requis.");
      return;
    }
    if (!musicName.trim()) {
      setError("Le nom de la musique est requis.");
      return;
    }
    if (!isValidTimeFormat(durationStr)) {
      setError("La durée doit être au format mm:ss.");
      return;
    }

    const newDuration = parseTime(durationStr);
    if (newDuration <= 0) {
      setError("La durée doit être supérieure à 0.");
      return;
    }

    const needsTruncation = newDuration < maxActionEnd;

    onSave(
      {
        title: title.trim(),
        musicName: musicName.trim(),
        durationSeconds: newDuration,
      },
      needsTruncation,
    );
    onClose();
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-neutral-700 font-medium hover:bg-neutral-200 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors"
      >
        Save Settings
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Settings" footer={footer}>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Project Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Final Tableau"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Music Track Name
        </label>
        <input
          type="text"
          value={musicName}
          onChange={(e) => setMusicName(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Boléro"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Total Duration (mm:ss)
        </label>
        <input
          type="text"
          value={durationStr}
          onChange={(e) => setDurationStr(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 15:00"
        />
      </div>

      {warning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-amber-600 text-sm">⚠️</span>
          <p className="text-amber-800 text-sm">{warning}</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </Modal>
  );
}
