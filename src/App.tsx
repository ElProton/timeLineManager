import { ProjectInit } from "./components/ProjectInit";
import { Timeline } from "./components/Timeline";
import { CueModal } from "./components/CueModal";
import { TrackModal } from "./components/TrackModal";
import { MetadataModal } from "./components/MetadataModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { formatTime } from "./utils/time";
import { useProjectManager } from "./hooks/useProjectManager";
import { useModals } from "./hooks/useModals";
import { useExport } from "./hooks/useExport";
import { useConfirm } from "./hooks/useConfirm";
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
} from "lucide-react";

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

        {/* Timeline Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-neutral-700">Timeline View</h2>
            {project.filteredTrackId && (
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                Filtered View
              </span>
            )}
          </div>
          <div className="p-6 overflow-auto flex-1">
            <Timeline
              ref={timelineRef}
              data={projectData}
              filteredTrackId={project.filteredTrackId}
              onEditCue={(cue) => modals.openCueModal(cue)}
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
