import React, { useState, useRef } from "react";
import { ProjectData, Action, Actor, Layer } from "./types";
import { ProjectInit } from "./components/ProjectInit";
import { Timeline } from "./components/Timeline";
import { ActionModal } from "./components/ActionModal";
import { ActorModal } from "./components/ActorModal";
import { formatTime } from "./utils/time";
import {
  Download,
  Image as ImageIcon,
  Plus,
  Users,
  Filter,
  Settings,
  Trash2,
  Layers,
} from "lucide-react";
import * as htmlToImage from "html-to-image";

export default function App() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [filteredActorId, setFilteredActorId] = useState<string | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  const [isActorModalOpen, setIsActorModalOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<Actor | null>(null);

  const [isAddingLayer, setIsAddingLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");

  const timelineRef = useRef<HTMLDivElement>(null);

  if (!projectData) {
    return (
      <ProjectInit
        onInit={(data) => {
          setProjectData(data);
          setActiveLayerId(data.layers[0]?.id ?? null);
        }}
      />
    );
  }

  const activeLayer =
    projectData.layers.find((l) => l.id === activeLayerId) ??
    projectData.layers[0] ??
    null;

  const updateActiveLayer = (updater: (layer: Layer) => Layer) => {
    setProjectData((prev) => {
      if (!prev || !activeLayer) return prev;
      return {
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === activeLayer.id ? updater(l) : l,
        ),
      };
    });
  };

  const handleAddLayer = () => {
    const trimmed = newLayerName.trim();
    if (!trimmed) return;
    if (projectData.layers.some((l) => l.name === trimmed)) {
      alert("A layer with this name already exists.");
      return;
    }
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: trimmed,
      actors: [],
      actions: [],
    };
    setProjectData((prev) => {
      if (!prev) return prev;
      return { ...prev, layers: [...prev.layers, newLayer] };
    });
    setActiveLayerId(newLayer.id);
    setFilteredActorId(null);
    setNewLayerName("");
    setIsAddingLayer(false);
  };

  const handleSaveJson = () => {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectData.metadata.title.replace(/\s+/g, "_")}_timeline.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportImage = async () => {
    if (!timelineRef.current) return;
    try {
      const node = timelineRef.current;
      const dataUrl = await htmlToImage.toJpeg(node, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: node.scrollWidth + "px",
          height: node.scrollHeight + "px",
        },
      });
      const link = document.createElement("a");
      link.download = `${projectData.metadata.title.replace(/\s+/g, "_")}_timeline.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export image", err);
      alert("Failed to export image. Please try again.");
    }
  };

  const handleSaveAction = (action: Action) => {
    updateActiveLayer((layer) => {
      const exists = layer.actions.some((a) => a.id === action.id);
      return {
        ...layer,
        actions: exists
          ? layer.actions.map((a) => (a.id === action.id ? action : a))
          : [...layer.actions, action],
      };
    });
  };

  const handleDeleteAction = (actionId: string) => {
    if (!confirm("Are you sure you want to delete this action?")) return;
    updateActiveLayer((layer) => ({
      ...layer,
      actions: layer.actions.filter((a) => a.id !== actionId),
    }));
  };

  const handleSaveActor = (actor: Actor) => {
    updateActiveLayer((layer) => {
      const exists = layer.actors.some((a) => a.id === actor.id);
      return {
        ...layer,
        actors: exists
          ? layer.actors.map((a) => (a.id === actor.id ? actor : a))
          : [...layer.actors, actor],
      };
    });
  };

  const handleDeleteActor = (actorId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this actor? Actions associated only with this actor will be removed.",
      )
    )
      return;
    updateActiveLayer((layer) => {
      const newActions = layer.actions
        .map((a) => ({
          ...a,
          actorIds: a.actorIds.filter((id) => id !== actorId),
        }))
        .filter((a) => a.actorIds.length > 0);

      return {
        ...layer,
        actors: layer.actors.filter((a) => a.id !== actorId),
        actions: newActions,
      };
    });
    if (filteredActorId === actorId) {
      setFilteredActorId(null);
    }
  };

  const actors = activeLayer?.actors ?? [];
  const actions = activeLayer?.actions ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveJson}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Save JSON
          </button>
          <button
            onClick={handleExportImage}
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
            {/* Layer Selector */}
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <Layers className="w-4 h-4" />
              Layer:
            </div>
            {isAddingLayer ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLayer();
                    if (e.key === "Escape") {
                      setIsAddingLayer(false);
                      setNewLayerName("");
                    }
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
                  placeholder="Layer name..."
                  autoFocus
                />
                <button
                  onClick={handleAddLayer}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingLayer(false);
                    setNewLayerName("");
                  }}
                  className="px-3 py-2 text-neutral-600 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={activeLayerId || ""}
                  onChange={(e) => {
                    setActiveLayerId(e.target.value);
                    setFilteredActorId(null);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
                >
                  {projectData.layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsAddingLayer(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
                  title="Add a new layer"
                >
                  <Plus className="w-4 h-4" />
                  Layer
                </button>
              </div>
            )}

            <div className="w-px h-8 bg-neutral-200 mx-1" />

            <button
              onClick={() => {
                setEditingActor(null);
                setIsActorModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
            >
              <Users className="w-4 h-4" />
              Add Actor
            </button>
            <button
              onClick={() => {
                setEditingAction(null);
                setIsActionModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
              disabled={actors.length === 0}
              title={actors.length === 0 ? "Add an actor first" : ""}
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
              value={filteredActorId || ""}
              onChange={(e) => setFilteredActorId(e.target.value || null)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
            >
              <option value="">All Actors</option>
              {actors.map((actor) => (
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
            <h2 className="font-semibold text-neutral-700">
              Timeline View
              {activeLayer && (
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  — {activeLayer.name}
                </span>
              )}
            </h2>
            {filteredActorId && (
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                Filtered View
              </span>
            )}
          </div>
          <div className="p-6 overflow-auto flex-1">
            <Timeline
              ref={timelineRef}
              metadata={projectData.metadata}
              actors={actors}
              actions={actions}
              filteredActorId={filteredActorId}
              onEditAction={(action) => {
                setEditingAction(action);
                setIsActionModalOpen(true);
              }}
              onDeleteAction={handleDeleteAction}
              onEditActor={(actor) => {
                setEditingActor(actor);
                setIsActorModalOpen(true);
              }}
              onDeleteActor={handleDeleteActor}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onSave={handleSaveAction}
        initialAction={editingAction}
        actors={actors}
        maxDuration={projectData.metadata.durationSeconds}
      />

      <ActorModal
        isOpen={isActorModalOpen}
        onClose={() => setIsActorModalOpen(false)}
        onSave={handleSaveActor}
        initialActor={editingActor}
      />
    </div>
  );
}
