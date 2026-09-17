import { useState, useEffect } from "react";
import type { Track } from "../types";
import { Modal } from "./Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (track: Track) => void;
  initialTrack?: Track | null;
}

export function TrackModal({ isOpen, onClose, onSave, initialTrack }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(initialTrack ? initialTrack.name : "");
    setError("");
  }, [initialTrack, isOpen]);

  const handleSave = () => {
    setError("");
    if (!name.trim()) {
      setError("Track name is required.");
      return;
    }
    onSave({
      id: initialTrack?.id || crypto.randomUUID(),
      name: name.trim(),
    });
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
        Save Track
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTrack ? "Edit Track" : "New Track"}
      maxWidth="max-w-sm"
      footer={footer}
    >
      <div>
        <label
          htmlFor="track-name"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Track Name
        </label>
        <input
          id="track-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Lighting, Drone A, Catering"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          A track is one row of the timeline: a person, a team, a device, a
          channel.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </Modal>
  );
}
