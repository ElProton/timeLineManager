import React, { useState } from "react";
import { ProjectData, CURRENT_SCHEMA_VERSION } from "../types";
import { parseTime, formatTime, isValidTimeFormat } from "../utils/time";
import { migrateProject } from "../utils/migration";
import { Upload, Plus, RotateCcw } from "lucide-react";

interface Props {
  onInit: (data: ProjectData) => void;
  cachedProject?: ProjectData | null;
}

export function ProjectInit({ onInit, cachedProject }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [musicName, setMusicName] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [error, setError] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !musicName || !durationStr) {
      setError("All fields are required.");
      return;
    }

    if (!isValidTimeFormat(durationStr)) {
      setError("Duration must be in mm:ss format.");
      return;
    }

    const durationSeconds = parseTime(durationStr);
    if (durationSeconds <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    onInit({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: { title, musicName, durationSeconds },
      actors: [],
      actions: [],
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        const data = migrateProject(parsed) as unknown as ProjectData | null;

        if (
          !data ||
          !data.metadata ||
          !data.metadata.title ||
          !data.metadata.durationSeconds
        ) {
          throw new Error("Invalid project structure");
        }

        onInit(data);
      } catch (err) {
        alert("Invalid file format or corrupted JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-6 text-center">
          Scenic Timeline Manager
        </h1>

        {cachedProject && !showCreateForm ? (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-sm font-medium text-indigo-900 mb-1">
                Previous session found
              </p>
              <p className="text-lg font-semibold text-indigo-800">
                {cachedProject.metadata.title}
              </p>
              <p className="text-sm text-indigo-600 mt-1">
                {cachedProject.metadata.musicName} &bull;{" "}
                {formatTime(cachedProject.metadata.durationSeconds)} &bull;{" "}
                {cachedProject.actors.length} actor(s) &bull;{" "}
                {cachedProject.actions.length} action(s)
              </p>
            </div>

            <button
              onClick={() => onInit(cachedProject)}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resume Project
            </button>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-white text-neutral-700 py-2.5 rounded-lg font-medium border border-neutral-300 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>

            <div className="mt-4 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Or</span>
              </div>
            </div>

            <div className="mt-2">
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors font-medium">
                <Upload className="w-4 h-4" />
                Import Project (JSON)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleCreate} className="space-y-4">
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

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Project
              </button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Or</span>
              </div>
            </div>

            <div className="mt-6">
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors font-medium">
                <Upload className="w-4 h-4" />
                Import Project (JSON)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
