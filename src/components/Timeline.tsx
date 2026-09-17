import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";
import type { ProjectData, Cue, Track } from "../types";
import type { Peak } from "../utils/waveform";
import { formatTime } from "../utils/time";
import { Edit2, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";
import { markerTimes, percentToTime, timeToPercent } from "../utils/timeline";
import { dragCue } from "../utils/dragCue";
import type { DragMode } from "../utils/dragCue";
import { useAnimationFrame } from "../hooks/useAnimationFrame";
import { useCueDrag } from "../hooks/useCueDrag";
import { Waveform } from "./Waveform";

/** How far one press of an arrow key moves a cue, in seconds. */
const NUDGE_SECONDS = 1;

/**
 * What the timeline needs of an attached soundtrack.
 *
 * Narrower than `useAudio`'s return on purpose: the timeline draws a position
 * and asks for a new one, and knows nothing about files or playback state.
 */
export interface TimelineAudio {
  isAttached: boolean;
  /** Read every animation frame, so deliberately not a value. */
  getCurrentTime: () => number;
  /** The file's own length, which need not match the timeline's. */
  duration: number;
  peaks: Peak[];
  seek: (seconds: number) => void;
}

interface Props {
  data: ProjectData;
  filteredTrackId: string | null;
  audio?: TimelineAudio;
  /** 1 fits the container; 4 makes the timeline four times as wide. */
  zoom?: number;
  onEditCue: (cue: Cue) => void;
  /** A cue retimed on the timeline itself, by pointer or by keyboard. */
  onMoveCue: (cue: Cue) => void;
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
      audio,
      zoom = 1,
      onEditCue,
      onMoveCue,
      onDeleteCue,
      onEditTrack,
      onDeleteTrack,
    },
    ref,
  ) => {
    const [hoveredCueId, setHoveredCueId] = useState<string | null>(null);
    const playheadRef = useRef<HTMLDivElement>(null);

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

    // How wide a lane actually is, so the axis can pick an interval its labels
    // fit into. Measured rather than derived: the lane is `flex-1` after a
    // fixed gutter, so zoom does not scale it by a round factor.
    const axisLaneRef = useRef<HTMLDivElement>(null);
    const [laneWidth, setLaneWidth] = useState(0);

    useEffect(() => {
      const lane = axisLaneRef.current;
      if (!lane) return;
      // jsdom has no ResizeObserver. Nothing renders Timeline in a test today;
      // whoever adds the first one will need a stub, as `useAudio.test.ts`
      // does for Web Audio.
      const observer = new ResizeObserver(() => setLaneWidth(lane.clientWidth));
      observer.observe(lane);
      setLaneWidth(lane.clientWidth);
      return () => observer.disconnect();
    }, []);

    const markers = useMemo(
      // 0 before the first measurement: fall back to the duration alone.
      () => markerTimes(durationSeconds, laneWidth || undefined),
      [durationSeconds, laneWidth],
    );

    const hasAudio = audio?.isAttached ?? false;

    // The waveform covers the span the file actually occupies on this
    // timeline, because the playhead is scaled to the timeline's duration and
    // the two have to agree. A two-minute file on a ten-minute timeline draws
    // across the first fifth; a longer one is cut off at the end. That the
    // waveform does not fill the lane is the point — it is the length mismatch,
    // visible.
    const waveformPercent =
      audio && audio.duration > 0
        ? Math.min(100, timeToPercent(audio.duration, durationSeconds))
        : 100;

    useAnimationFrame(hasAudio, () => {
      const playhead = playheadRef.current;
      if (!playhead || !audio) return;
      // Clamped here rather than in `timeToPercent`: a cue past the end should
      // visibly overflow its lane, but a playhead past it is just the file
      // being longer than the timeline, and belongs at the end.
      const percent = Math.min(
        100,
        Math.max(0, timeToPercent(audio.getCurrentTime(), durationSeconds)),
      );
      // The element spans the lane, so a percentage translate moves it by that
      // share of the lane — a composited transform that never reads layout.
      playhead.style.transform = `translateX(${percent}%)`;
    });

    /**
     * Where a dragged edge jumps to: the playhead, and other cues' edges.
     *
     * Both are things someone means — "start where the music does", "start
     * exactly where that one ends". The axis markers are deliberately **not**
     * in the list, though they were at first: at a 5-second interval and an
     * 8px tolerance, roughly a third of the timeline snapped to a round number
     * and 78 seconds was simply not reachable. A grid of arbitrary round
     * numbers is not something anyone is aiming at.
     *
     * Read when the gesture starts, so snapping to "where I stopped the music"
     * means exactly that, and not wherever it has drifted to since.
     */
    const getSnapTargets = (draggedCueId: string) => {
      const targets: number[] = [];
      if (audio?.isAttached) targets.push(audio.getCurrentTime());
      for (const other of cues) {
        if (other.id === draggedCueId) continue;
        targets.push(other.timeStart, other.timeEnd);
      }
      return targets;
    };

    const { startDrag, consumeDrag } = useCueDrag({
      durationSeconds,
      getSnapTargets,
      onCommit: onMoveCue,
    });

    /**
     * Retimes a focused cue from the keyboard.
     *
     * Without this the feature would be pointer-only, which on a project that
     * gave its dialogs a full focus trap would be a step backwards. It also
     * has to call `preventDefault`: the transport listens for the arrow keys
     * on `window` to seek the audio, and a cue is a `div` with
     * `role="button"`, so it does not look like a control to that handler.
     */
    const nudgeCue = (event: KeyboardEvent<HTMLElement>, cue: Cue) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;

      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const mode: DragMode = event.altKey
        ? "resize-start"
        : event.shiftKey
          ? "resize-end"
          : "move";

      const next = dragCue(cue, mode, direction * NUDGE_SECONDS, {
        durationSeconds,
      });

      event.preventDefault();
      if (next.timeStart !== cue.timeStart || next.timeEnd !== cue.timeEnd) {
        onMoveCue({ ...cue, ...next });
      }
      return true;
    };

    /** Moves the playhead to wherever the reader pressed on the axis. */
    const seekFromPointer = (event: MouseEvent<HTMLDivElement>) => {
      if (!audio?.isAttached) return;
      const lane = event.currentTarget;
      // `clientLeft`/`clientWidth` are the padding box — the frame everything
      // inside the lane is positioned against. The bounding rect includes the
      // border and would be a pixel out.
      const left = lane.getBoundingClientRect().left + lane.clientLeft;
      const percent = ((event.clientX - left) / lane.clientWidth) * 100;
      audio.seek(percentToTime(percent, durationSeconds));
    };

    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-x-auto relative"
        style={{ minWidth: "800px" }}
      >
        {/* Zoom is one width. Everything inside positions as a percentage of
            its lane, so cues, markers, the waveform and the playhead all
            follow without any arithmetic changing. */}
        <div
          ref={ref}
          className="min-w-max p-6 pb-12 bg-white"
          style={{ width: `${zoom * 100}%` }}
        >
          {/* The frame every overlay is positioned against — see LaneOverlay. */}
          <div className="relative">
            {/* Time axis */}
            <div className={cn("flex", hasAudio ? "mb-2" : "mb-6")}>
              <div className="w-48 shrink-0 pr-4 flex items-center justify-end text-neutral-500 font-medium text-sm sticky left-0 z-30 bg-white">
                {metadata.soundtrack}
              </div>
              <div
                ref={axisLaneRef}
                className={cn(
                  "flex-1 relative h-8 bg-neutral-100 rounded-lg border border-neutral-200",
                  hasAudio && "cursor-pointer",
                )}
                onClick={seekFromPointer}
                title={hasAudio ? "Click to move the playhead" : undefined}
              >
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

            {/* Soundtrack */}
            {hasAudio && (
              <div className="flex mb-6">
                <div className="w-48 shrink-0 pr-4 sticky left-0 z-30 bg-white" />
                <div
                  className="flex-1 relative h-16 bg-neutral-50 rounded-lg overflow-hidden cursor-pointer"
                  onClick={seekFromPointer}
                  title="Click to move the playhead"
                >
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${waveformPercent}%` }}
                  >
                    <Waveform peaks={audio?.peaks ?? []} />
                  </div>
                </div>
              </div>
            )}

            {/* Track rows */}
            <div className="space-y-4" data-timeline-rows>
              {visibleTracks.map((track) => {
                const trackCues = cues.filter((cue) =>
                  cue.trackIds.includes(track.id),
                );

                return (
                  <div key={track.id} className="flex group relative">
                    {/* Track label */}
                    <div className="w-48 shrink-0 pr-4 flex items-center justify-between border-r border-neutral-200 bg-white sticky left-0 z-30">
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
                            data-cue-id={cue.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${cue.description}, ${formatTime(cue.timeStart)} to ${formatTime(cue.timeEnd)}. Drag to retime, or use the arrow keys.`}
                            className={cn(
                              "absolute top-1.5 bottom-1.5 rounded-md shadow-sm border flex items-start p-1 overflow-hidden cursor-grab active:cursor-grabbing group/action",
                              // No `transition-all`: a transition on `left` and
                              // `width` fights a drag, which sets them sixty
                              // times a second.
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
                            onPointerDown={(event) =>
                              startDrag(event, cue, "move")
                            }
                            onClick={() => {
                              // A drag ends in a pointerup, which fires a
                              // click. That click is not a request to edit.
                              if (!consumeDrag()) onEditCue(cue);
                            }}
                            onKeyDown={(event) => {
                              if (nudgeCue(event, cue)) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onEditCue(cue);
                              }
                            }}
                          >
                            {/* Resize handles, on the two edges */}
                            <div
                              aria-hidden="true"
                              onPointerDown={(event) => {
                                // Without this the block behind the handle
                                // starts its own "move" gesture on the way up,
                                // and overwrites this one.
                                event.stopPropagation();
                                startDrag(event, cue, "resize-start");
                              }}
                              className="absolute inset-y-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover/action:opacity-100 focus-within:opacity-100 z-30"
                              style={{ backgroundColor: `${cue.color}60` }}
                            />
                            <div
                              aria-hidden="true"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                startDrag(event, cue, "resize-end");
                              }}
                              className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover/action:opacity-100 focus-within:opacity-100 z-30"
                              style={{ backgroundColor: `${cue.color}60` }}
                            />

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

            {/* Playhead */}
            {hasAudio && (
              <LaneOverlay className="z-20">
                <div
                  ref={playheadRef}
                  className="absolute inset-0"
                  style={{ willChange: "transform" }}
                >
                  <div className="absolute top-0 bottom-0 -ml-px w-0.5 bg-red-500">
                    <div className="w-2.5 h-2.5 -ml-1 -mt-1 rounded-full bg-red-500" />
                  </div>
                </div>
              </LaneOverlay>
            )}
          </div>
        </div>
      </div>
    );
  },
);

Timeline.displayName = "Timeline";
