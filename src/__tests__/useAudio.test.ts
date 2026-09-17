import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudio } from "../hooks/useAudio";

/**
 * jsdom implements no Web Audio at all — `OfflineAudioContext` is `undefined` —
 * and its media element neither plays nor exposes a settable `currentTime`. The
 * fakes therefore live here rather than in `setup.ts`: no global has ever been
 * added there, and a project-wide `OfflineAudioContext` would hide from every
 * other test the fact that the browser API is missing.
 */

class FakeAudioBuffer {
  constructor(private readonly channels: Float32Array[]) {}
  get numberOfChannels() {
    return this.channels.length;
  }
  getChannelData(index: number) {
    return this.channels[index];
  }
}

/** Decode calls waiting to be resolved, keyed by the size of the file. */
let pendingDecodes: Map<number, (buffer: FakeAudioBuffer) => void>;
let failNextDecode: boolean;

class FakeOfflineAudioContext {
  decodeAudioData(buffer: ArrayBuffer): Promise<FakeAudioBuffer> {
    if (failNextDecode) return Promise.reject(new Error("unsupported codec"));
    return new Promise((resolve) =>
      pendingDecodes.set(buffer.byteLength, resolve),
    );
  }
}

/** A file whose byte length identifies it to the fake decoder. */
function audioFile(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type: "audio/wav" });
}

function flat(value: number): FakeAudioBuffer {
  return new FakeAudioBuffer([new Float32Array([value, value, value, value])]);
}

const pausedState = new WeakMap<HTMLMediaElement, boolean>();
const timeState = new WeakMap<HTMLMediaElement, number>();

let element: HTMLAudioElement | null;
let createdUrls: string[];
let revokedUrls: string[];

beforeEach(() => {
  pendingDecodes = new Map();
  failNextDecode = false;
  element = null;
  createdUrls = [];
  revokedUrls = [];

  vi.stubGlobal("OfflineAudioContext", FakeOfflineAudioContext);

  URL.createObjectURL = vi.fn(() => {
    const url = `blob:audio-${createdUrls.length}`;
    createdUrls.push(url);
    return url;
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn((url: string) => {
    revokedUrls.push(url);
  }) as unknown as typeof URL.revokeObjectURL;

  // jsdom implements none of these: `load`, `play` and `pause` report "Not
  // implemented" and `currentTime` is a read-only zero. They are redefined on
  // the prototype rather than spied on, because `vi.restoreAllMocks` runs
  // before Testing Library unmounts — and unmounting pauses the element.
  Object.defineProperties(HTMLMediaElement.prototype, {
    // `attach` calls `load()`, which is how the test gets hold of the element
    // the hook created for itself.
    load: {
      configurable: true,
      value(this: HTMLAudioElement) {
        // Capturing the receiver is the whole point: the hook owns the element
        // and never hands it out.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        element = this;
      },
    },
    play: {
      configurable: true,
      value(this: HTMLAudioElement) {
        pausedState.set(this, false);
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      },
    },
    pause: {
      configurable: true,
      value(this: HTMLAudioElement) {
        if (pausedState.get(this) === false) {
          pausedState.set(this, true);
          this.dispatchEvent(new Event("pause"));
        }
      },
    },
    paused: {
      configurable: true,
      get(this: HTMLMediaElement) {
        return pausedState.get(this) ?? true;
      },
    },
    currentTime: {
      configurable: true,
      get(this: HTMLMediaElement) {
        return timeState.get(this) ?? 0;
      },
      set(this: HTMLMediaElement, value: number) {
        timeState.set(this, value);
      },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Settles the decode of `file` with a flat signal of `level`.
 *
 * It waits for the decode to be requested rather than counting microtasks:
 * `attach` awaits `file.arrayBuffer()` first, and how many turns of the loop
 * that takes is jsdom's business, not this test's.
 */
async function settleDecode(file: File, level: number) {
  for (let tick = 0; tick < 100 && !pendingDecodes.has(file.size); tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const resolve = pendingDecodes.get(file.size);
  if (!resolve) throw new Error(`no decode was requested for ${file.name}`);
  resolve(flat(level));
}

/** Attaches a file and lets its waveform finish decoding. */
async function attachAndDecode(
  attach: (file: File) => Promise<void>,
  file: File,
  level: number,
) {
  await act(async () => {
    const attaching = attach(file);
    await settleDecode(file, level);
    await attaching;
  });
}

describe("useAudio", () => {
  it("starts with nothing attached", () => {
    const { result } = renderHook(() => useAudio());
    expect(result.current.isAttached).toBe(false);
    expect(result.current.fileName).toBeNull();
    expect(result.current.peaks).toEqual([]);
    expect(result.current.duration).toBe(0);
  });

  it("attaches a file and draws its waveform", async () => {
    const { result } = renderHook(() => useAudio());
    await attachAndDecode(
      result.current.attach,
      audioFile("Bolero.wav", 4),
      0.5,
    );

    expect(result.current.isAttached).toBe(true);
    expect(result.current.fileName).toBe("Bolero.wav");
    expect(result.current.peaks).toHaveLength(2000);
    expect(result.current.peaks[0]).toEqual({ min: 0.5, max: 0.5 });
    expect(createdUrls).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("takes its duration from the element, not from the decoded buffer", async () => {
    const { result } = renderHook(() => useAudio());
    await attachAndDecode(result.current.attach, audioFile("Song.mp3", 4), 0.5);

    // The element's duration is what playback and the playhead follow.
    Object.defineProperty(element, "duration", {
      configurable: true,
      value: 187.5,
    });
    act(() => {
      element?.dispatchEvent(new Event("loadedmetadata"));
    });
    expect(result.current.duration).toBe(187.5);
  });

  it("ignores a duration the browser reports as unknown", async () => {
    const { result } = renderHook(() => useAudio());
    await attachAndDecode(
      result.current.attach,
      audioFile("Stream.ogg", 4),
      0.5,
    );

    Object.defineProperty(element, "duration", {
      configurable: true,
      value: Infinity,
    });
    act(() => {
      element?.dispatchEvent(new Event("loadedmetadata"));
    });
    expect(result.current.duration).toBe(0);
  });

  describe("the object URL", () => {
    // An object URL pins the whole file — 3 to 50 MB — until it is revoked.

    it("is revoked when another file replaces it", async () => {
      const { result } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("First.wav", 4),
        0.5,
      );
      await attachAndDecode(
        result.current.attach,
        audioFile("Second.wav", 8),
        0.25,
      );

      expect(revokedUrls).toEqual([createdUrls[0]]);
      expect(result.current.fileName).toBe("Second.wav");
    });

    it("is revoked on unmount", async () => {
      const { result, unmount } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("Bolero.wav", 4),
        0.5,
      );

      expect(revokedUrls).toEqual([]);
      unmount();
      expect(revokedUrls).toEqual([createdUrls[0]]);
    });

    it("is revoked on detach", async () => {
      const { result } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("Bolero.wav", 4),
        0.5,
      );

      act(() => result.current.detach());

      expect(revokedUrls).toEqual([createdUrls[0]]);
      expect(result.current.isAttached).toBe(false);
      expect(result.current.peaks).toEqual([]);
    });
  });

  it("keeps the newer file when a slower decode finishes last", async () => {
    const { result } = renderHook(() => useAudio());
    const slow = audioFile("Slow.wav", 4);
    const fast = audioFile("Fast.wav", 8);

    let attachingSlow!: Promise<void>;
    await act(async () => {
      attachingSlow = result.current.attach(slow);
      const attachingFast = result.current.attach(fast);
      await settleDecode(fast, 0.25);
      await attachingFast;
    });

    // The first file only now finishes decoding.
    await act(async () => {
      await settleDecode(slow, 0.5);
      await attachingSlow;
    });

    expect(result.current.fileName).toBe("Fast.wav");
    expect(result.current.peaks[0]).toEqual({ min: 0.25, max: 0.25 });
  });

  it("still plays a file it cannot draw", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    failNextDecode = true;

    const { result } = renderHook(() => useAudio());
    await act(async () => {
      await result.current.attach(audioFile("Exotic.opus", 4));
    });

    expect(result.current.isAttached).toBe(true);
    expect(result.current.peaks).toEqual([]);
    expect(result.current.error).toMatch(/still plays/i);
  });

  it("reports a file the browser cannot play at all", async () => {
    const { result } = renderHook(() => useAudio());
    await attachAndDecode(
      result.current.attach,
      audioFile("Broken.wav", 4),
      0.5,
    );

    act(() => {
      element?.dispatchEvent(new Event("error"));
    });
    expect(result.current.error).toMatch(/could not play/i);

    act(() => result.current.dismissError());
    expect(result.current.error).toBeNull();
  });

  describe("transport", () => {
    it("toggles between playing and paused", async () => {
      const { result } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("Bolero.wav", 4),
        0.5,
      );

      expect(result.current.isPlaying).toBe(false);
      act(() => result.current.togglePlay());
      expect(result.current.isPlaying).toBe(true);
      act(() => result.current.togglePlay());
      expect(result.current.isPlaying).toBe(false);
    });

    it("stops at the end of the file", async () => {
      const { result } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("Bolero.wav", 4),
        0.5,
      );

      act(() => result.current.togglePlay());
      act(() => {
        element?.dispatchEvent(new Event("ended"));
      });
      expect(result.current.isPlaying).toBe(false);
    });

    it("does nothing with no file attached", () => {
      const { result } = renderHook(() => useAudio());
      act(() => result.current.togglePlay());
      act(() => result.current.seek(30));
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.getCurrentTime()).toBe(0);
    });

    it("seeks, and reads the position back without re-rendering", async () => {
      const { result } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("Bolero.wav", 4),
        0.5,
      );

      act(() => result.current.seek(42.5));
      // Read imperatively: the playhead asks sixty times a second.
      expect(result.current.getCurrentTime()).toBe(42.5);
    });

    it("refuses to seek before the start", async () => {
      const { result } = renderHook(() => useAudio());
      await attachAndDecode(
        result.current.attach,
        audioFile("Bolero.wav", 4),
        0.5,
      );

      act(() => result.current.seek(-10));
      expect(result.current.getCurrentTime()).toBe(0);
    });
  });
});
