import { useEffect, useRef } from "react";
import { Music, Pause, Play, TriangleAlert, Upload, X } from "lucide-react";
import { formatTime, formatTimePrecise } from "../utils/time";
import { useAnimationFrame } from "../hooks/useAnimationFrame";
import { MAX_DURATION_SECONDS } from "../types";

/** How far a keyboard seek jumps, in seconds. */
const SEEK_STEP = 5;

/** Below this, the file and the timeline are the same length for our purposes. */
const DURATION_TOLERANCE_SECONDS = 1;

interface Props {
  isAttached: boolean;
  isPlaying: boolean;
  fileName: string | null;
  /** The file's real length, `0` until the browser reports it. */
  audioDuration: number;
  /** `metadata.soundtrack` — the file this timeline was built against. */
  soundtrack: string | undefined;
  projectDuration: number;
  error: string | null;
  getCurrentTime: () => number;
  onAttach: (file: File) => void;
  onDetach: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onAdoptDuration: (seconds: number) => void;
  onDismissError: () => void;
}

/**
 * Attaching a soundtrack, and the transport for playing it.
 *
 * The audio file is **not** part of the project. A project is a JSON file
 * people mail each other; a 40 MB recording is not. So the file is re-attached
 * each session, and `metadata.soundtrack` — its name — is what the project
 * carries, which is why this bar leads with the name it is waiting for.
 */
export function AudioBar({
  isAttached,
  isPlaying,
  fileName,
  audioDuration,
  soundtrack,
  projectDuration,
  error,
  getCurrentTime,
  onAttach,
  onDetach,
  onTogglePlay,
  onSeek,
  onAdoptDuration,
  onDismissError,
}: Props) {
  const readoutRef = useRef<HTMLSpanElement>(null);

  // Written straight into the DOM rather than held in state: this text changes
  // sixty times a second while the file plays.
  useAnimationFrame(isAttached, () => {
    const readout = readoutRef.current;
    if (readout) readout.textContent = formatTimePrecise(getCurrentTime());
  });

  useEffect(() => {
    if (!isAttached) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === " ") {
        event.preventDefault();
        onTogglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSeek(getCurrentTime() - SEEK_STEP);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onSeek(getCurrentTime() + SEEK_STEP);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAttached, onTogglePlay, onSeek, getCurrentTime]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onAttach(file);
    // Let the same file be picked again after a failure.
    event.target.value = "";
  };

  const attachControl = (
    <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm cursor-pointer shrink-0">
      <Upload className="w-4 h-4" />
      {isAttached ? "Replace" : "Attach audio"}
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );

  // Offered, never applied on its own: the duration is the denominator of every
  // position on screen, and shortening it trims or deletes cues.
  const lengthMismatch =
    isAttached &&
    audioDuration > 0 &&
    audioDuration <= MAX_DURATION_SECONDS &&
    Math.abs(audioDuration - projectDuration) >= DURATION_TOLERANCE_SECONDS;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <div className="flex items-center gap-3 p-4 flex-wrap">
        {isAttached ? (
          <>
            <button
              type="button"
              onClick={onTogglePlay}
              className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shrink-0"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={`${isPlaying ? "Pause" : "Play"} (space)`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <p
              className="font-mono text-sm text-neutral-700 tabular-nums"
              aria-live="off"
            >
              <span ref={readoutRef}>{formatTimePrecise(0)}</span>
              <span className="text-neutral-400">
                {" / "}
                {formatTime(audioDuration)}
              </span>
            </p>

            <span className="flex items-center gap-1.5 text-sm text-neutral-500 min-w-0">
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{fileName}</span>
            </span>

            <div className="flex items-center gap-2 ml-auto">
              {attachControl}
              <button
                type="button"
                onClick={onDetach}
                className="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-red-600 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <Music className="w-4 h-4 text-neutral-400 shrink-0" />
            <p className="text-sm text-neutral-600 flex-1 min-w-[16rem]">
              {soundtrack ? (
                <>
                  This timeline is set to{" "}
                  <span className="font-medium text-neutral-800">
                    {soundtrack}
                  </span>
                  . Attach the file to play it and place cues by ear.
                </>
              ) : (
                "Attach a soundtrack to play it, see its waveform, and place cues by ear."
              )}{" "}
              <span className="text-neutral-400">
                It stays on this machine — nothing is uploaded, and it is not
                part of the exported project.
              </span>
            </p>
            {attachControl}
          </>
        )}
      </div>

      {lengthMismatch && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 border-t border-neutral-100 text-sm text-neutral-600 flex-wrap"
        >
          <span>
            This file runs{" "}
            <span className="font-medium text-neutral-800">
              {formatTime(audioDuration)}
            </span>
            , and the timeline is set to{" "}
            <span className="font-medium text-neutral-800">
              {formatTime(projectDuration)}
            </span>
            .
          </span>
          <button
            type="button"
            onClick={() => onAdoptDuration(audioDuration)}
            className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-md font-medium transition-colors"
          >
            Use the file&apos;s length
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 px-4 py-2.5 border-t border-red-100 bg-red-50 text-sm text-red-800 rounded-b-xl"
        >
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss"
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * True when the key belongs to whatever has focus rather than to the transport.
 *
 * Space activates a focused button and types a space in a field; a dialog has
 * its own focus trap and its own meaning for every one of these keys.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLElement) {
    if (target.isContentEditable) return true;
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName)) return true;
  }
  return document.querySelector('[role="dialog"]') !== null;
}
