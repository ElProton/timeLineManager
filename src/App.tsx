import { useState } from "react";
import { ProjectInit } from "./components/ProjectInit";
import { Timeline } from "./components/Timeline";
import { CueModal } from "./components/CueModal";
import { TrackModal } from "./components/TrackModal";
import { MetadataModal } from "./components/MetadataModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { AudioBar } from "./components/AudioBar";
import { formatTime } from "./utils/time";
import { MAX_DURATION_SECONDS } from "./types";
import { useProjectManager } from "./hooks/useProjectManager";
import { useModals } from "./hooks/useModals";
import { useExport } from "./hooks/useExport";
import { useConfirm } from "./hooks/useConfirm";
import { useAudio } from "./hooks/useAudio";
import {
  Download,
  Image as ImageIcon,
  Music,
  Plus,
  Users,
  Filter,
  Edit2,
  RotateCcw,
  Undo2,
  Redo2,
  TriangleAlert,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/** Eight times is already ~8500px of timeline for a fifteen-minute show. */
const MAX_ZOOM = 8;

export default function App() {
  const project = useProjectManager();
  const modals = useModals();
  const {
    timelineRef,
    saveJson,
    exportImage,
    exportError,
    dismissExportError,
  } = useExport(project.projectData);
  const { confirm, confirmProps } = useConfirm();
  const audio = useAudio();
  // View state, not project data: it must not reach ProjectData any more than
  // the audio does.
  const [zoom, setZoom] = useState(1);

  if (!project.projectData) {
    return (
      <ProjectInit
        onInit={project.initProject}
        cachedProject={project.cachedProject}
      />
    );
  }

  const { projectData } = project;

  const handleDeleteCue = async (cueId: string) => {
    const cue = projectData.cues.find((c) => c.id === cueId);
    const confirmed = await confirm({
      title: "Delete cue",
      message: cue
        ? `Delete "${cue.description}"? This cannot be undone from the file, but you can undo it in the app.`
        : "Delete this cue?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) project.deleteCue(cueId);
  };

  const handleDeleteTrack = async (trackId: string) => {
    const track = projectData.tracks.find((t) => t.id === trackId);
    const orphaned = projectData.cues.filter(
      (cue) => cue.trackIds.length === 1 && cue.trackIds[0] === trackId,
    ).length;
    const confirmed = await confirm({
      title: "Delete track",
      message: `Delete ${track ? `"${track.name}"` : "this track"}?${
        orphaned > 0
          ? ` ${orphaned} cue(s) run only on this track and will be removed too.`
          : ""
      }`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) project.deleteTrack(trackId);
  };

  const handleAttachAudio = (file: File) => {
    void audio.attach(file);
    // Only fill the label when there is none. Someone who typed "Boléro —
    // 1928 recording" should not have it overwritten by "track03.mp3".
    if (!projectData.metadata.soundtrack?.trim()) {
      project.saveMetadata(
        { ...projectData.metadata, soundtrack: file.name },
        false,
      );
    }
  };

  /**
   * Offers the file's own length as the timeline's duration.
   *
   * The duration is the denominator of every position on screen, so this is
   * never applied silently, and shortening it goes through the same truncation
   * the settings dialog warns about — undoably.
   */
  const handleAdoptDuration = async (seconds: number) => {
    // Round up, so the last moment of the file is inside the timeline.
    const durationSeconds = Math.min(Math.ceil(seconds), MAX_DURATION_SECONDS);

    if (durationSeconds < project.maxCueEnd) {
      const confirmed = await confirm({
        title: "Shorten the timeline",
        message: `Cues run to ${formatTime(project.maxCueEnd)}, past the file's ${formatTime(durationSeconds)}. Shortening trims the cues that cross the new end and removes those starting after it. You can undo this.`,
        confirmLabel: "Shorten and trim",
        destructive: true,
      });
      if (!confirmed) return;
    }

    project.saveMetadata({ ...projectData.metadata, durationSeconds }, true);
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "Start over",
      message:
        "This clears the project stored in this browser and returns to the start screen. Export it as JSON first if you want to keep it.",
      confirmLabel: "Clear and start over",
      destructive: true,
    });
    if (confirmed) project.clearCache();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {projectData.metadata.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-neutral-500 mt-1">
              {projectData.metadata.soundtrack && (
                <>
                  <span className="flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" />
                    {projectData.metadata.soundtrack}
                  </span>
                  <span>&bull;</span>
                </>
              )}
              <span>
                {formatTime(projectData.metadata.durationSeconds)} total
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={modals.openMetadataModal}
            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            aria-label="Edit project settings"
            title="Edit project settings"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-neutral-200 pr-3">
            <button
              type="button"
              onClick={project.undo}
              disabled={!project.canUndo}
              className="p-2 text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Undo"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={project.redo}
              disabled={!project.canRedo}
              className="p-2 text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Redo"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm shadow-sm"
            title="Clear saved data and start over"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={saveJson}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Save JSON
          </button>
          <button
            type="button"
            onClick={exportImage}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
          >
            <ImageIcon className="w-4 h-4" />
            Export JPEG
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        {!project.cacheAvailable && (
          <div
            role="status"
            className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
          >
            <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This browser is blocking local storage, so your work is not being
              saved automatically. Export to JSON before closing the tab.
            </span>
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
          >
            <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{exportError}</span>
            <button
              type="button"
              onClick={dismissExportError}
              aria-label="Dismiss"
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => modals.openTrackModal()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
            >
              <Users className="w-4 h-4" />
              Add Track
            </button>
            <button
              type="button"
              onClick={() => modals.openCueModal()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={projectData.tracks.length === 0}
              title={
                projectData.tracks.length === 0
                  ? "Add a track first"
                  : undefined
              }
            >
              <Plus className="w-4 h-4" />
              Add Cue
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="track-filter"
              className="flex items-center gap-2 text-sm font-medium text-neutral-600"
            >
              <Filter className="w-4 h-4" />
              Filter:
            </label>
            <select
              id="track-filter"
              value={project.filteredTrackId || ""}
              onChange={(e) =>
                project.setFilteredTrackId(e.target.value || null)
              }
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
            >
              <option value="">All tracks</option>
              {projectData.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AudioBar
          isAttached={audio.isAttached}
          isPlaying={audio.isPlaying}
          fileName={audio.fileName}
          audioDuration={audio.duration}
          soundtrack={projectData.metadata.soundtrack}
          projectDuration={projectData.metadata.durationSeconds}
          error={audio.error}
          getCurrentTime={audio.getCurrentTime}
          onAttach={handleAttachAudio}
          onDetach={audio.detach}
          onTogglePlay={audio.togglePlay}
          onSeek={audio.seek}
          onAdoptDuration={handleAdoptDuration}
          onDismissError={audio.dismissError}
        />

        {/* Timeline Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-neutral-700">Timeline View</h2>
              {project.filteredTrackId && (
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                  Filtered View
                </span>
              )}
            </div>

            {/* Zoom. Deliberately here and not inside Timeline: the timeline's
                own node is what useExport captures, so a control placed in it
                would end up in the JPEG. */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((current) => Math.max(1, current / 2))}
                disabled={zoom <= 1}
                className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-neutral-500 tabular-nums w-8 text-center">
                {zoom}&times;
              </span>
              <button
                type="button"
                onClick={() =>
                  setZoom((current) => Math.min(MAX_ZOOM, current * 2))
                }
                disabled={zoom >= MAX_ZOOM}
                className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6 overflow-auto flex-1">
            <Timeline
              ref={timelineRef}
              data={projectData}
              filteredTrackId={project.filteredTrackId}
              zoom={zoom}
              audio={{
                isAttached: audio.isAttached,
                getCurrentTime: audio.getCurrentTime,
                duration: audio.duration,
                peaks: audio.peaks,
                seek: audio.seek,
              }}
              onEditCue={(cue) => modals.openCueModal(cue)}
              onMoveCue={project.saveCue}
              onDeleteCue={handleDeleteCue}
              onEditTrack={(track) => modals.openTrackModal(track)}
              onDeleteTrack={handleDeleteTrack}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <CueModal
        isOpen={modals.isCueModalOpen}
        onClose={modals.closeCueModal}
        onSave={project.saveCue}
        initialCue={modals.editingCue}
        tracks={projectData.tracks}
        maxDuration={projectData.metadata.durationSeconds}
      />

      <TrackModal
        isOpen={modals.isTrackModalOpen}
        onClose={modals.closeTrackModal}
        onSave={project.saveTrack}
        initialTrack={modals.editingTrack}
      />

      <MetadataModal
        isOpen={modals.isMetadataModalOpen}
        onClose={modals.closeMetadataModal}
        onSave={project.saveMetadata}
        metadata={projectData.metadata}
        maxCueEnd={project.maxCueEnd}
      />

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
