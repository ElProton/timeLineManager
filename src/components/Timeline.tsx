import React, { useState } from "react";
import { ProjectMetadata, Action, Actor } from "../types";
import { formatTime } from "../utils/time";
import { Edit2, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";

interface Props {
  metadata: ProjectMetadata;
  actors: Actor[];
  actions: Action[];
  filteredActorId: string | null;
  onEditAction: (action: Action) => void;
  onDeleteAction: (actionId: string) => void;
  onEditActor: (actor: Actor) => void;
  onDeleteActor: (actorId: string) => void;
}

export const Timeline = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      metadata,
      actors,
      actions,
      filteredActorId,
      onEditAction,
      onDeleteAction,
      onEditActor,
      onDeleteActor,
    },
    ref,
  ) => {
    const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);

    const { durationSeconds } = metadata;

    const visibleActors = filteredActorId
      ? actors.filter((a) => a.id === filteredActorId)
      : actors;

    // Generate time markers every 30 seconds or 1 minute depending on duration
    const markers = [];
    const step = durationSeconds > 600 ? 60 : 30; // 1 min or 30 sec
    for (let i = 0; i <= durationSeconds; i += step) {
      markers.push(i);
    }

    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-x-auto relative"
        style={{ minWidth: "800px" }}
      >
        <div ref={ref} className="min-w-max p-6 pb-12 bg-white">
          {/* Music Timeline Header */}
          <div className="flex mb-6">
            <div className="w-48 shrink-0 pr-4 flex items-center justify-end text-neutral-500 font-medium text-sm">
              {metadata.musicName}
            </div>
            <div className="flex-1 relative h-8 bg-neutral-100 rounded-lg border border-neutral-200">
              {markers.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 border-l border-neutral-300 flex flex-col items-start"
                  style={{ left: `${(time / durationSeconds) * 100}%` }}
                >
                  <span className="text-[10px] text-neutral-500 -ml-3 -mt-5 bg-white px-1">
                    {formatTime(time)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actor Rows */}
          <div className="space-y-4 relative">
            {/* Draw vertical connection lines for hovered multi-actor actions */}
            {hoveredActionId && !filteredActorId && (
              <div className="absolute inset-0 pointer-events-none z-0">
                {(() => {
                  const action = actions.find((a) => a.id === hoveredActionId);
                  if (!action || action.actorIds.length < 2) return null;

                  const left = `${(action.timeStart / durationSeconds) * 100}%`;
                  const width = `${((action.timeEnd - action.timeStart) / durationSeconds) * 100}%`;

                  return (
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-r-2 border-dashed opacity-30"
                      style={{
                        left,
                        width,
                        borderColor: action.color,
                        backgroundColor: `${action.color}10`,
                      }}
                    />
                  );
                })()}
              </div>
            )}

            {visibleActors.map((actor) => {
              const actorActions = actions.filter((a) =>
                a.actorIds.includes(actor.id),
              );

              return (
                <div key={actor.id} className="flex group relative z-10">
                  {/* Actor Label */}
                  <div className="w-48 shrink-0 pr-4 flex items-center justify-between border-r border-neutral-200 bg-white">
                    <span
                      className="font-medium text-neutral-800 truncate"
                      title={actor.name}
                    >
                      {actor.name}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => onEditActor(actor)}
                        className="p-1 text-neutral-400 hover:text-indigo-600 rounded"
                        title="Edit Actor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteActor(actor.id)}
                        className="p-1 text-neutral-400 hover:text-red-600 rounded"
                        title="Delete Actor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Actor Timeline Track */}
                  <div className="flex-1 relative h-20 bg-neutral-50/50 border-y border-r border-neutral-100 rounded-r-lg group-hover:bg-neutral-50 transition-colors">
                    {/* Grid lines */}
                    {markers.map((time) => (
                      <div
                        key={time}
                        className="absolute top-0 bottom-0 border-l border-neutral-200/50 pointer-events-none"
                        style={{ left: `${(time / durationSeconds) * 100}%` }}
                      />
                    ))}

                    {/* Actions */}
                    {actorActions.map((action) => {
                      const left = `${(action.timeStart / durationSeconds) * 100}%`;
                      const width = `${((action.timeEnd - action.timeStart) / durationSeconds) * 100}%`;
                      const isHovered = hoveredActionId === action.id;
                      const isMulti = action.actorIds.length > 1;

                      return (
                        <div
                          key={action.id}
                          className={cn(
                            "absolute top-1.5 bottom-1.5 rounded-md shadow-sm border flex items-start p-1 overflow-hidden transition-all cursor-pointer group/action",
                            isHovered
                              ? "ring-2 ring-offset-1 z-20"
                              : "z-10 hover:z-20",
                          )}
                          style={{
                            left,
                            width,
                            backgroundColor: `${action.color}20`,
                            borderColor: action.color,
                            color: action.color,
                            ringColor: action.color,
                          }}
                          onMouseEnter={() => setHoveredActionId(action.id)}
                          onMouseLeave={() => setHoveredActionId(null)}
                          onClick={() => onEditAction(action)}
                        >
                          <div className="flex-1 text-[10px] leading-tight font-semibold flex items-start gap-1 overflow-hidden h-full w-full">
                            {isMulti && (
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                                style={{ backgroundColor: action.color }}
                                title="Multi-actor action"
                              />
                            )}
                            <span
                              className="break-words whitespace-normal overflow-hidden w-full"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {action.description}
                            </span>
                          </div>

                          {/* Action Controls */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover/action:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm rounded shadow-sm z-30">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAction(action.id);
                              }}
                              className="p-1 text-neutral-500 hover:text-red-600 rounded"
                              title="Delete Action"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {visibleActors.length === 0 && (
              <div className="py-12 text-center text-neutral-500 italic border-2 border-dashed border-neutral-200 rounded-xl">
                No actors to display. Add an actor to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
