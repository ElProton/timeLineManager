import { useState, useEffect } from "react";
import type { Cue, Track } from "../types";
import { parseTime, formatTime, isValidTimeFormat } from "../utils/time";
import { Modal } from "./Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cue: Cue) => void;
  initialCue?: Cue | null;
  tracks: Track[];
  maxDuration: number;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

export function CueModal({
  isOpen,
  onClose,
  onSave,
  initialCue,
  tracks,
  maxDuration,
}: Props) {
  const [description, setDescription] = useState("");
  const [timeStartStr, setTimeStartStr] = useState("");
  const [timeEndStr, setTimeEndStr] = useState("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCue) {
      setDescription(initialCue.description);
      setTimeStartStr(formatTime(initialCue.timeStart));
      setTimeEndStr(formatTime(initialCue.timeEnd));
      setSelectedTrackIds(initialCue.trackIds);
      setColor(initialCue.color);
    } else {
      setDescription("");
      setTimeStartStr("00:00");
      setTimeEndStr(formatTime(Math.min(30, maxDuration)));
      setSelectedTrackIds([]);
      setColor(COLORS[0]);
    }
    setError("");
  }, [initialCue, isOpen, maxDuration]);

  const handleSave = () => {
    setError("");
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!isValidTimeFormat(timeStartStr) || !isValidTimeFormat(timeEndStr)) {
      setError("Times must be in mm:ss format, with seconds under 60.");
      return;
    }

    const start = parseTime(timeStartStr);
    const end = parseTime(timeEndStr);

    if (start >= end) {
      setError("Start time must be before end time.");
      return;
    }
    if (start < 0 || end > maxDuration) {
      setError(`Times must be between 00:00 and ${formatTime(maxDuration)}.`);
      return;
    }
    if (selectedTrackIds.length === 0) {
      setError("Select at least one track.");
      return;
    }

    onSave({
      id: initialCue?.id || crypto.randomUUID(),
      description: description.trim(),
      timeStart: start,
      timeEnd: end,
      trackIds: selectedTrackIds,
      color,
    });
    onClose();
  };

  const toggleTrack = (id: string) => {
    setSelectedTrackIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
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
        Save Cue
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialCue ? "Edit Cue" : "New Cue"}
      footer={footer}
    >
      <div>
        <label
          htmlFor="cue-description"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Description
        </label>
        <input
          id="cue-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. House lights to 50%"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="cue-start"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Start Time (mm:ss)
          </label>
          <input
            id="cue-start"
            type="text"
            value={timeStartStr}
            onChange={(e) => setTimeStartStr(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label
            htmlFor="cue-end"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            End Time (mm:ss)
          </label>
          <input
            id="cue-end"
            type="text"
            value={timeEndStr}
            onChange={(e) => setTimeEndStr(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-neutral-700 mb-2">
          Tracks
        </span>
        <div className="flex flex-wrap gap-2">
          {tracks.map((track) => {
            const selected = selectedTrackIds.includes(track.id);
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => toggleTrack(track.id)}
                aria-pressed={selected}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selected
                    ? "bg-indigo-100 text-indigo-800 border-2 border-indigo-500"
                    : "bg-neutral-100 text-neutral-600 border-2 border-transparent hover:bg-neutral-200"
                }`}
              >
                {track.name}
              </button>
            );
          })}
          {tracks.length === 0 && (
            <span className="text-sm text-neutral-500 italic">
              No tracks available. Add a track first.
            </span>
          )}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-neutral-700 mb-2">
          Colour
        </span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-pressed={color === c}
              className={`w-8 h-8 rounded-full transition-transform ${
                color === c
                  ? "scale-110 ring-2 ring-offset-2 ring-neutral-800"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Select colour ${c}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </Modal>
  );
}
