import { useCallback, useEffect, useRef, useState } from "react";
import { computePeaks } from "../utils/waveform";
import type { Peak } from "../utils/waveform";

/**
 * How many columns the waveform is reduced to, once, at attach time.
 *
 * The decoded buffer is thrown away immediately afterwards — it weighs ~60 MB
 * for a six-minute track — so the peaks cannot be recomputed when the canvas
 * is resized. 2000 is more detail than the canvas usually has pixels; beyond
 * that the drawing stretches, which is what every waveform display does.
 */
const WAVEFORM_BUCKETS = 2000;

/**
 * `decodeAudioData` resamples to the context's rate, so asking for a low one
 * decodes faster and holds a fraction of the memory. A waveform column spans
 * thousands of samples either way.
 */
const DECODE_SAMPLE_RATE = 22050;

/** Reads the file a second time, independently of the playback element. */
async function decodePeaks(file: File): Promise<Peak[]> {
  // An OfflineAudioContext decodes without ever opening an output device, and
  // has nothing to close afterwards.
  const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
  const buffer = await context.decodeAudioData(await file.arrayBuffer());
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  // `buffer` goes out of scope here; only the peaks are kept.
  return computePeaks(channels, WAVEFORM_BUCKETS);
}

/**
 * A locally attached soundtrack: playback, its waveform, and its real duration.
 *
 * **None of this is project data.** The file is re-attached each session and
 * never reaches the reducer: `isValidProjectData` does not reject unknown keys
 * and `migrateProject` deliberately preserves them, so anything that got into
 * `ProjectData` would be serialised into every exported file and held by up to
 * fifty undo snapshots. Only `metadata.soundtrack` — the file's name — is
 * project data, and it is a free-text label.
 *
 * Playback is an `HTMLAudioElement` rather than Web Audio: it gives
 * play/pause/seek for free and its `currentTime` is accurate to a few
 * milliseconds, far finer than the eye can place a cue. Web Audio is used for
 * the one thing the element cannot do — handing over the samples — and the
 * context is gone before the first frame is drawn.
 */
export function useAudio() {
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  /** Distinguishes the current attach from one whose decode is still running. */
  const attachRef = useRef(0);

  const [fileName, setFileName] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = new Audio();
    elementRef.current = element;

    const onPlay = () => setIsPlaying(true);
    const onStop = () => setIsPlaying(false);
    const onLoaded = () =>
      setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    const onError = () =>
      setError(
        "This browser could not play that file. Try a WAV, MP3, OGG or M4A.",
      );

    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onStop);
    element.addEventListener("ended", onStop);
    element.addEventListener("loadedmetadata", onLoaded);
    element.addEventListener("error", onError);

    return () => {
      element.pause();
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onStop);
      element.removeEventListener("ended", onStop);
      element.removeEventListener("loadedmetadata", onLoaded);
      element.removeEventListener("error", onError);
      // An object URL pins the whole file in memory until it is revoked.
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      elementRef.current = null;
    };
  }, []);

  const attach = useCallback(async (file: File) => {
    const element = elementRef.current;
    if (!element) return;

    const attachId = (attachRef.current += 1);

    setError(null);
    setPeaks([]);
    setDuration(0);
    setFileName(file.name);

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    element.src = url;
    element.load();

    try {
      const decoded = await decodePeaks(file);
      // A second file may have been attached while this one was decoding.
      if (attachRef.current !== attachId) return;
      setPeaks(decoded);
    } catch (cause) {
      console.warn("Could not decode the audio for a waveform", cause);
      if (attachRef.current !== attachId) return;
      // The element and `decodeAudioData` decode independently, so one can
      // fail while the other plays the file perfectly well.
      setError("No waveform could be drawn for this file. It still plays.");
    }
  }, []);

  const detach = useCallback(() => {
    const element = elementRef.current;
    attachRef.current += 1;

    if (element) {
      element.pause();
      element.removeAttribute("src");
      element.load();
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;

    setFileName(null);
    setDuration(0);
    setPeaks([]);
    setIsPlaying(false);
    setError(null);
  }, []);

  const togglePlay = useCallback(() => {
    const element = elementRef.current;
    if (!element || !urlRef.current) return;

    if (element.paused) {
      // Rejects when the browser refuses playback — an autoplay policy, or a
      // format it accepted the source for but cannot actually decode.
      element.play().catch((cause: unknown) => {
        console.warn("Playback was refused", cause);
        setError("This browser refused to play that file.");
      });
    } else {
      element.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const element = elementRef.current;
    if (!element || !urlRef.current) return;
    element.currentTime = Math.max(0, seconds);
  }, []);

  /**
   * The current position, read on demand.
   *
   * Deliberately not state: the playhead is redrawn every animation frame, and
   * sixty re-renders a second of a component that already re-renders every row
   * on hover would be the wrong trade entirely.
   */
  const getCurrentTime = useCallback(
    () => elementRef.current?.currentTime ?? 0,
    [],
  );

  return {
    fileName,
    isAttached: fileName !== null,
    duration,
    peaks,
    isPlaying,
    error,
    attach,
    detach,
    togglePlay,
    seek,
    getCurrentTime,
    dismissError: useCallback(() => setError(null), []),
  };
}
