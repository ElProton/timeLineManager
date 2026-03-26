import { ProjectInit } from "./components/ProjectInit";
import { Timeline } from "./components/Timeline";
import { ActionModal } from "./components/ActionModal";
import { ActorModal } from "./components/ActorModal";
import { MetadataModal } from "./components/MetadataModal";
import { formatTime } from "./utils/time";
import { useProjectManager } from "./hooks/useProjectManager";
import { useModals } from "./hooks/useModals";
import { useExport } from "./hooks/useExport";
import {
  Download,
  Image as ImageIcon,
  Plus,
  Users,
  Filter,
  Settings,
  Edit2,
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";

export default function App() {
  const project = useProjectManager();
  const modals = useModals();
  const { timelineRef, saveJson, exportImage } = useExport(project.projectData);

  if (!project.projectData) {
    return (
      <ProjectInit
        onInit={project.initProject}
        cachedProject={project.cachedProject}
      />
    );
  }

  const { projectData } = project;

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
              <span className="flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />
                {projectData.metadata.musicName}
              </span>
              <span>&bull;</span>
              <span>
                {formatTime(projectData.metadata.durationSeconds)} total
              </span>
            </div>
          </div>
          <button
            onClick={modals.openMetadataModal}
            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit project settings"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-neutral-200 pr-3">
            <button
              onClick={project.undo}
              disabled={!project.canUndo}
              className="p-2 text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={project.redo}
              disabled={!project.canRedo}
              className="p-2 text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={project.clearCache}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm shadow-sm"
            title="Clear saved data and start over"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveJson}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Save JSON
          </button>
          <button
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
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => modals.openActorModal()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
            >
              <Users className="w-4 h-4" />
              Add Actor
            </button>
            <button
              onClick={() => modals.openActionModal()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
              disabled={projectData.actors.length === 0}
              title={
                projectData.actors.length === 0 ? "Add an actor first" : ""
              }
            >
              <Plus className="w-4 h-4" />
              Add Action
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <Filter className="w-4 h-4" />
              Filter:
            </div>
            <select
              value={project.filteredActorId || ""}
              onChange={(e) =>
                project.setFilteredActorId(e.target.value || null)
              }
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
            >
              <option value="">All Actors</option>
              {projectData.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-neutral-700">Timeline View</h2>
            {project.filteredActorId && (
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                Filtered View
              </span>
            )}
          </div>
          <div className="p-6 overflow-auto flex-1">
            <Timeline
              ref={timelineRef}
              data={projectData}
              filteredActorId={project.filteredActorId}
              onEditAction={(action) => modals.openActionModal(action)}
              onDeleteAction={project.deleteAction}
              onEditActor={(actor) => modals.openActorModal(actor)}
              onDeleteActor={project.deleteActor}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ActionModal
        isOpen={modals.isActionModalOpen}
        onClose={modals.closeActionModal}
        onSave={project.saveAction}
        initialAction={modals.editingAction}
        actors={projectData.actors}
        maxDuration={projectData.metadata.durationSeconds}
      />

      <ActorModal
        isOpen={modals.isActorModalOpen}
        onClose={modals.closeActorModal}
        onSave={project.saveActor}
        initialActor={modals.editingActor}
      />

      <MetadataModal
        isOpen={modals.isMetadataModalOpen}
        onClose={modals.closeMetadataModal}
        onSave={project.saveMetadata}
        metadata={projectData.metadata}
        maxActionEnd={project.maxActionEnd}
      />
    </div>
  );
}
