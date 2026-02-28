import React, { useState, useEffect } from "react";
import { Actor } from "../types";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actor: Actor) => void;
  initialActor?: Actor | null;
}

export function ActorModal({ isOpen, onClose, onSave, initialActor }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialActor) {
      setName(initialActor.name);
    } else {
      setName("");
    }
    setError("");
  }, [initialActor, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setError("");
    if (!name.trim()) {
      setError("Actor name is required.");
      return;
    }
    onSave({
      id: initialActor?.id || crypto.randomUUID(),
      name: name.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {initialActor ? "Edit Actor" : "New Actor"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Actor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Pierre"
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="p-4 border-t border-neutral-200 flex justify-end gap-3 bg-neutral-50">
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
            Save Actor
          </button>
        </div>
      </div>
    </div>
  );
}
