import React, { useState, useEffect } from "react";
import { Actor } from "../types";
import { Modal } from "./Modal";

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
        Save Actor
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialActor ? "Edit Actor" : "New Actor"}
      maxWidth="max-w-sm"
      footer={footer}
    >
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
    </Modal>
  );
}
