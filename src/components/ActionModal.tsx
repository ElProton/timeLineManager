import React, { useState, useEffect } from "react";
import { Action, Actor } from "../types";
import { parseTime, formatTime, isValidTimeFormat } from "../utils/time";
import { Modal } from "./Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: Action) => void;
  initialAction?: Action | null;
  actors: Actor[];
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

export function ActionModal({
  isOpen,
  onClose,
  onSave,
  initialAction,
  actors,
  maxDuration,
}: Props) {
  const [description, setDescription] = useState("");
  const [timeStartStr, setTimeStartStr] = useState("");
  const [timeEndStr, setTimeEndStr] = useState("");
  const [selectedActorIds, setSelectedActorIds] = useState<string[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialAction) {
      setDescription(initialAction.description);
      setTimeStartStr(formatTime(initialAction.timeStart));
      setTimeEndStr(formatTime(initialAction.timeEnd));
      setSelectedActorIds(initialAction.actorIds);
      setColor(initialAction.color);
    } else {
      setDescription("");
      setTimeStartStr("00:00");
      setTimeEndStr(formatTime(Math.min(30, maxDuration)));
      setSelectedActorIds([]);
      setColor(COLORS[0]);
    }
    setError("");
  }, [initialAction, isOpen, maxDuration]);

  const handleSave = () => {
    setError("");
    if (!description) {
      setError("Description is required.");
      return;
    }
    if (!isValidTimeFormat(timeStartStr) || !isValidTimeFormat(timeEndStr)) {
      setError("Times must be in mm:ss format.");
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
    if (selectedActorIds.length === 0) {
      setError("Select at least one actor.");
      return;
    }

    onSave({
      id: initialAction?.id || crypto.randomUUID(),
      description,
      timeStart: start,
      timeEnd: end,
      actorIds: selectedActorIds,
      color,
    });
    onClose();
  };

  const toggleActor = (id: string) => {
    setSelectedActorIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
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
        Save Action
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialAction ? "Edit Action" : "New Action"}
      footer={footer}
    >
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Enter Stage Left"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Start Time (mm:ss)
          </label>
          <input
            type="text"
            value={timeStartStr}
            onChange={(e) => setTimeStartStr(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            End Time (mm:ss)
          </label>
          <input
            type="text"
            value={timeEndStr}
            onChange={(e) => setTimeEndStr(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Actors
        </label>
        <div className="flex flex-wrap gap-2">
          {actors.map((actor) => (
            <button
              key={actor.id}
              onClick={() => toggleActor(actor.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedActorIds.includes(actor.id)
                  ? "bg-indigo-100 text-indigo-800 border-2 border-indigo-500"
                  : "bg-neutral-100 text-neutral-600 border-2 border-transparent hover:bg-neutral-200"
              }`}
            >
              {actor.name}
            </button>
          ))}
          {actors.length === 0 && (
            <span className="text-sm text-neutral-500 italic">
              No actors available. Add actors first.
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-transform ${
                color === c
                  ? "scale-110 ring-2 ring-offset-2 ring-neutral-800"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </Modal>
  );
}
