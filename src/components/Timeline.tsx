import { forwardRef, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ProjectData, Cue, Track } from "../types";
import { formatTime } from "../utils/time";
import { Edit2, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";
import { markerTimes, timeToPercent } from "../utils/timeline";

interface Props {
  data: ProjectData;
  filteredTrackId: string | null;
  onEditCue: (cue: Cue) => void;
  onDeleteCue: (cueId: string) => void;
  onEditTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
}

/**
 * A full-height layer sharing the coordinate frame of the track lanes.
 *
 * Anything that spans the rows — the multi-track hover band, later the
 * playhead — has to line up with the cues it refers to. Cues are positioned
 * inside a lane that begins after the 192px label gutter, so a layer
 * positioned against the full width is offset by exactly that gutter. The
 * hover band was, for as long as it had existed; `opacity-30` and dashed
 * borders kept it from being obvious.
 *
 * Rather than restate the gutter as a number, this repeats the
 * `w-48 shrink-0` + `flex-1` pair every row is built from, so the frame
 * cannot drift unless the rows drift with it.
 */
function LaneOverlay({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("absolute inset-0 flex pointer-events-none", className)}>
      <div className="w-48 shrink-0" />
      <div className="flex-1 relative">{children}</div>
    </div>
  );
}

export const Timeline = forwardRef<HTMLDivElement, Props>(
  (
    {
      data,
      filteredTrackId,
      onEditCue,
      onDeleteCue,
      onEditTrack,
      onDeleteTrack,
    },
    ref,
  ) => {
    const [hoveredCueId, setHoveredCueId] = useState<string | null>(null);

    const { metadata, tracks, cues } = data;
    const { durationSeconds } = metadata;

    const visibleTracks = filteredTrackId
      ? tracks.filter((track) => track.id === filteredTrackId)
      : tracks;

    // The band ties together the rows a multi-track cue runs on. A filtered
    // view shows a single row, so there is nothing to tie.
    const bandCue =
      hoveredCueId && !filteredTrackId
        ? cues.find((cue) => cue.id === hoveredCueId && cue.trackIds.length > 1)
        : undefined;

    const markers = useMemo(
      () => markerTimes(durationSeconds),
      [durationSeconds],
    );

    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-x-auto relative"
        style={{ minWidth: "800px" }}
      >
        <div ref={ref} className="min-w-max p-6 pb-12 bg-white">
          {/* The frame every overlay is positioned against — see LaneOverlay. */}
          <div className="relative">
            {/* Time axis */}
            <div className="flex mb-6">
              <div className="w-48 shrink-0 pr-4 flex items-center justify-end text-neutral-500 font-medium text-sm">
                {metadata.soundtrack}
              </div>
              <div className="flex-1 relative h-8 bg-neutral-100 rounded-lg border border-neutral-200">
                {markers.map((time) => (
                  <div
                    key={time}
                    className="absolute top-0 bottom-0 border-l border-neutral-300 flex flex-col items-start"
                    style={{ left: `${timeToPercent(time, durationSeconds)}%` }}
                  >
                    <span className="text-[10px] text-neutral-500 -ml-3 -mt-5 bg-white px-1">
                      {formatTime(time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Track rows */}
            <div className="space-y-4">
              {visibleTracks.map((track) => {
                const trackCues = cues.filter((cue) =>
                  cue.trackIds.includes(track.id),
                );

                return (
                  <div key={track.id} className="flex group relative z-10">
                    {/* Track label */}
                    <div className="w-48 shrink-0 pr-4 flex items-center justify-between border-r border-neutral-200 bg-white">
                      <span
                        className="font-medium text-neutral-800 truncate"
                        title={track.name}
                      >
                        {track.name}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTrack(track)}
                          className="p-1 text-neutral-400 hover:text-indigo-600 rounded"
                          aria-label={`Edit track ${track.name}`}
                          title="Edit track"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTrack(track.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded"
                          aria-label={`Delete track ${track.name}`}
                          title="Delete track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Track lane */}
                    <div className="flex-1 relative h-20 bg-neutral-50/50 border-y border-r border-neutral-100 rounded-r-lg group-hover:bg-neutral-50 transition-colors">
                      {/* Grid lines */}
                      {markers.map((time) => (
                        <div
                          key={time}
                          className="absolute top-0 bottom-0 border-l border-neutral-200/50 pointer-events-none"
                          style={{
                            left: `${timeToPercent(time, durationSeconds)}%`,
                          }}
                        />
                      ))}

                      {/* Cues */}
                      {trackCues.map((cue) => {
                        const isHovered = hoveredCueId === cue.id;
                        const isMulti = cue.trackIds.length > 1;

                        return (
                          <div
                            key={cue.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${cue.description}, ${formatTime(cue.timeStart)} to ${formatTime(cue.timeEnd)}`}
                            className={cn(
                              "absolute top-1.5 bottom-1.5 rounded-md shadow-sm border flex items-start p-1 overflow-hidden transition-all cursor-pointer group/action",
                              isHovered
                                ? "ring-2 ring-offset-1 z-20"
                                : "z-10 hover:z-20 focus:z-20",
                            )}
                            style={
                              {
                                left: `${timeToPercent(cue.timeStart, durationSeconds)}%`,
                                width: `${timeToPercent(cue.timeEnd - cue.timeStart, durationSeconds)}%`,
                                backgroundColor: `${cue.color}20`,
                                borderColor: cue.color,
                                color: cue.color,
                                // Tailwind's ring colour is a custom property. An
                                // earlier version set `ringColor`, which is not a
                                // DOM style property, so React dropped it and the
                                // ring always drew in the default colour.
                                "--tw-ring-color": cue.color,
                              } as CSSProperties
                            }
                            onMouseEnter={() => setHoveredCueId(cue.id)}
                            onMouseLeave={() => setHoveredCueId(null)}
                            onFocus={() => setHoveredCueId(cue.id)}
                            onBlur={() => setHoveredCueId(null)}
                            onClick={() => onEditCue(cue)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onEditCue(cue);
                              }
                            }}
                          >
                            <div className="flex-1 text-[10px] leading-tight font-semibold flex items-start gap-1 overflow-hidden h-full w-full">
                              {isMulti && (
                                <div
                                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                                  style={{ backgroundColor: cue.color }}
                                  title="Runs on several tracks"
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
                                {cue.description}
                              </span>
                            </div>

                            <div className="absolute top-1 right-1 opacity-0 group-hover/action:opacity-100 focus-within:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm rounded shadow-sm z-30">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCue(cue.id);
                                }}
                                className="p-1 text-neutral-500 hover:text-red-600 rounded"
                                aria-label={`Delete cue ${cue.description}`}
                                title="Delete cue"
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

              {visibleTracks.length === 0 && (
                <div className="py-12 text-center text-neutral-500 italic border-2 border-dashed border-neutral-200 rounded-xl">
                  No tracks to display. Add a track to get started.
                </div>
              )}
            </div>

            {/* Vertical band linking the rows of a hovered multi-track cue */}
            {bandCue && (
              <LaneOverlay className="z-0">
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-r-2 border-dashed opacity-30"
                  style={{
                    left: `${timeToPercent(bandCue.timeStart, durationSeconds)}%`,
                    width: `${timeToPercent(bandCue.timeEnd - bandCue.timeStart, durationSeconds)}%`,
                    borderColor: bandCue.color,
                    backgroundColor: `${bandCue.color}10`,
                  }}
                />
              </LaneOverlay>
            )}
          </div>
        </div>
      </div>
    );
  },
);

Timeline.displayName = "Timeline";
