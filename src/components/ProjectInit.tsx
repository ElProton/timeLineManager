import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CURRENT_SCHEMA_VERSION, MAX_DURATION_SECONDS } from "../types";
import type { ProjectData } from "../types";
import { parseTime, formatTime, isValidTimeFormat } from "../utils/time";
import { migrateProject } from "../utils/migration";
import { isValidProjectData } from "../utils/validation";
import { Upload, Plus, RotateCcw } from "lucide-react";

interface Props {
  onInit: (data: ProjectData) => void;
  cachedProject?: ProjectData | null;
}

export function ProjectInit({ onInit, cachedProject }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [soundtrack, setSoundtrack] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [error, setError] = useState("");
  const [importError, setImportError] = useState("");

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("A project title is required.");
      return;
    }
    if (!durationStr) {
      setError("A total duration is required.");
      return;
    }
    if (!isValidTimeFormat(durationStr)) {
      setError("Duration must be in mm:ss format, with seconds under 60.");
      return;
    }

    const durationSeconds = parseTime(durationStr);
    if (durationSeconds <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }
    if (durationSeconds > MAX_DURATION_SECONDS) {
      setError(`Duration must be ${formatTime(MAX_DURATION_SECONDS)} or less.`);
      return;
    }

    const trimmedSoundtrack = soundtrack.trim();

    onInit({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: {
        title: title.trim(),
        ...(trimmedSoundtrack ? { soundtrack: trimmedSoundtrack } : {}),
        durationSeconds,
      },
      tracks: [],
      cues: [],
    });
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");

    const reader = new FileReader();
    reader.onerror = () => setImportError("Could not read that file.");
    reader.onload = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.target?.result as string);
      } catch {
        setImportError("That file is not valid JSON.");
        return;
      }

      // Same gate as the cache, rather than the looser ad-hoc check this path
      // used to run: an imported file is the least trusted input the app takes.
      const migrated = migrateProject(parsed);
      if (!isValidProjectData(migrated)) {
        setImportError(
          "That file is not a valid timeline project, or was written by a newer version of the app.",
        );
        return;
      }

      onInit(migrated);
    };
    reader.readAsText(file);
    // Allow re-importing the same file after a failure.
    e.target.value = "";
  };

  const importControl = (
    <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors font-medium">
      <Upload className="w-4 h-4" />
      Import Project (JSON)
      <input
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImport}
      />
    </label>
  );

  const separator = (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-neutral-200"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-neutral-500">Or</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2 text-center">
          Timeline Manager
        </h1>
        <p className="text-sm text-neutral-500 mb-6 text-center">
          Build a production timeline synchronised to a soundtrack.
        </p>

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
                {cachedProject.metadata.soundtrack
                  ? `${cachedProject.metadata.soundtrack} • `
                  : ""}
                {formatTime(cachedProject.metadata.durationSeconds)} &bull;{" "}
                {cachedProject.tracks.length} track(s) &bull;{" "}
                {cachedProject.cues.length} cue(s)
              </p>
            </div>

            <button
              type="button"
              onClick={() => onInit(cachedProject)}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resume Project
            </button>

            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-white text-neutral-700 py-2.5 rounded-lg font-medium border border-neutral-300 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>

            <div className="mt-4">{separator}</div>
            <div className="mt-2">{importControl}</div>
          </div>
        ) : (
          <>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="init-title"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Project Title
                </label>
                <input
                  id="init-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Opening ceremony"
                />
              </div>
              <div>
                <label
                  htmlFor="init-soundtrack"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Soundtrack{" "}
                  <span className="font-normal text-neutral-500">
                    (optional)
                  </span>
                </label>
                <input
                  id="init-soundtrack"
                  type="text"
                  value={soundtrack}
                  onChange={(e) => setSoundtrack(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Opening_theme_final.wav"
                />
              </div>
              <div>
                <label
                  htmlFor="init-duration"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Total Duration (mm:ss)
                </label>
                <input
                  id="init-duration"
                  type="text"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 15:00"
                />
              </div>

              {error && (
                <p role="alert" className="text-red-600 text-sm">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Project
              </button>
            </form>

            <div className="mt-8">{separator}</div>
            <div className="mt-6">{importControl}</div>
          </>
        )}

        {importError && (
          <p role="alert" className="mt-4 text-red-600 text-sm text-center">
            {importError}
          </p>
        )}
      </div>
    </div>
  );
}
