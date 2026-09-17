import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Timeline } from "../components/Timeline";
import type { TimelineAudio } from "../components/Timeline";
import { makeProject, makeCue, makeTrack } from "./fixtures";
import { stubCanvas, stubLayout, stubResizeObserver } from "./browserStubs";
import type { ProjectData } from "../types";

/**
 * jsdom reports every element as zero-sized, so the tests below pin **behaviour
 * and contracts** — which callback fires, with what, how many times — and never
 * geometry. That the hover band lines up with its cue, or that the axis labels
 * do not collide, is checked in a real browser; no test here can say anything
 * about it. Both are needed and neither substitutes for the other.
 *
 * Positions are the exception: `left` and `width` are computed from the data by
 * `timeToPercent`, never measured, so they are as testable as any pure value.
 */

const LANE_WIDTH = 1000;

function renderTimeline(
  data: ProjectData = makeProject(),
  props: Partial<Parameters<typeof Timeline>[0]> = {},
) {
  const handlers = {
    onEditCue: vi.fn(),
    onMoveCue: vi.fn(),
    onDeleteCue: vi.fn(),
    onEditTrack: vi.fn(),
    onDeleteTrack: vi.fn(),
  };
  const utils = render(
    <Timeline data={data} filteredTrackId={null} {...handlers} {...props} />,
  );
  return { ...handlers, ...utils };
}

/** Every rendered block for a cue — a multi-track cue has one per row. */
function blocks(cueId: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[data-cue-id="${cueId}"]`),
  );
}

const restores: Array<() => void> = [];

beforeEach(() => {
  restores.push(stubResizeObserver(), stubCanvas());
});

afterEach(() => {
  while (restores.length) restores.pop()?.();
  vi.restoreAllMocks();
});

describe("Timeline: what it draws", () => {
  it("gives every track a row, and names it", () => {
    renderTimeline();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("puts a multi-track cue on each of its rows", () => {
    renderTimeline();
    // c1 runs on t1 only; c2 runs on both.
    expect(blocks("c1")).toHaveLength(1);
    expect(blocks("c2")).toHaveLength(2);
  });

  it("positions a cue as a percentage of the duration", () => {
    // 180s total: a cue from 45s to 90s starts a quarter in and covers a quarter.
    const data = makeProject({
      cues: [makeCue({ id: "c1", timeStart: 45, timeEnd: 90 })],
    });
    renderTimeline(data);
    const block = blocks("c1")[0];
    expect(block.style.left).toBe("25%");
    expect(block.style.width).toBe("25%");
  });

  it("names a cue and its time range for a screen reader", () => {
    renderTimeline();
    expect(
      screen.getAllByRole("button", { name: /^Enter, 00:00 to 00:30/ }),
    ).toHaveLength(1);
  });

  it("says so when there are no tracks", () => {
    renderTimeline(makeProject({ tracks: [], cues: [] }));
    expect(screen.getByText(/No tracks to display/)).toBeInTheDocument();
  });

  it("shows one row, and its cues only, when filtered", () => {
    renderTimeline(makeProject(), { filteredTrackId: "t2" });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // c1 is on t1 alone, so it disappears; c2 is on both, so one copy remains.
    expect(blocks("c1")).toHaveLength(0);
    expect(blocks("c2")).toHaveLength(1);
  });
});

describe("Timeline: opening and deleting", () => {
  it("opens the editor on click", () => {
    const { onEditCue } = renderTimeline();
    fireEvent.click(blocks("c1")[0]);
    expect(onEditCue).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1" }),
    );
  });

  it("opens the editor on Enter and on Space", () => {
    const { onEditCue } = renderTimeline();
    fireEvent.keyDown(blocks("c1")[0], { key: "Enter" });
    fireEvent.keyDown(blocks("c1")[0], { key: " " });
    expect(onEditCue).toHaveBeenCalledTimes(2);
  });

  it("deletes a cue without also opening it", () => {
    const { onDeleteCue, onEditCue } = renderTimeline();
    fireEvent.click(
      within(blocks("c1")[0]).getByRole("button", { name: /Delete cue/ }),
    );
    expect(onDeleteCue).toHaveBeenCalledWith("c1");
    expect(onEditCue).not.toHaveBeenCalled();
  });

  it("edits and deletes a track", () => {
    const { onEditTrack, onDeleteTrack } = renderTimeline();
    fireEvent.click(screen.getByRole("button", { name: "Edit track Alice" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete track Bob" }));
    expect(onEditTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1" }),
    );
    expect(onDeleteTrack).toHaveBeenCalledWith("t2");
  });
});

describe("Timeline: retiming from the keyboard", () => {
  const data = makeProject({
    tracks: [makeTrack({ id: "t1", name: "Alice" })],
    cues: [makeCue({ id: "c1", timeStart: 30, timeEnd: 60 })],
  });

  it("moves a cue by a second, keeping its length", () => {
    const { onMoveCue } = renderTimeline(data);
    fireEvent.keyDown(blocks("c1")[0], { key: "ArrowRight" });
    expect(onMoveCue).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", timeStart: 31, timeEnd: 61 }),
    );
  });

  it("resizes the end with Shift, and the start with Alt", () => {
    const { onMoveCue } = renderTimeline(data);
    fireEvent.keyDown(blocks("c1")[0], { key: "ArrowRight", shiftKey: true });
    expect(onMoveCue).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeStart: 30, timeEnd: 61 }),
    );
    fireEvent.keyDown(blocks("c1")[0], { key: "ArrowLeft", altKey: true });
    expect(onMoveCue).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeStart: 29, timeEnd: 60 }),
    );
  });

  it("stays inside the timeline, and says nothing when it cannot move", () => {
    const atZero = makeProject({
      tracks: [makeTrack({ id: "t1", name: "Alice" })],
      cues: [makeCue({ id: "c1", timeStart: 0, timeEnd: 30 })],
    });
    const { onMoveCue } = renderTimeline(atZero);
    fireEvent.keyDown(blocks("c1")[0], { key: "ArrowLeft" });
    // Already at 00:00: nothing changed, so nothing is dispatched — and so no
    // undo entry is spent on a key press that did nothing.
    expect(onMoveCue).not.toHaveBeenCalled();
  });

  it("claims the arrow keys, which is how the transport knows to stand down", () => {
    // AudioBar seeks on the arrow keys from a window listener, and a cue is a
    // div with role="button", so its `isTypingTarget` check cannot recognise
    // one. `preventDefault` is the whole of the contract between them.
    renderTimeline(data);
    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    blocks("c1")[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves other keys alone", () => {
    renderTimeline(data);
    const event = new KeyboardEvent("keydown", {
      key: "ArrowUp",
      bubbles: true,
      cancelable: true,
    });
    blocks("c1")[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("Timeline: dragging", () => {
  // 180s over 1000px: 100px is 18s.
  const data = makeProject({
    cues: [
      makeCue({ id: "c1", timeStart: 30, timeEnd: 60 }),
      makeCue({
        id: "c2",
        timeStart: 100,
        timeEnd: 130,
        trackIds: ["t1", "t2"],
      }),
    ],
  });

  beforeEach(() => {
    restores.push(stubLayout(LANE_WIDTH));
  });

  /** A whole gesture: press, move in steps, release. */
  function drag(element: HTMLElement, deltaPx: number) {
    fireEvent.pointerDown(element, { clientX: 0, button: 0 });
    for (const step of [0.5, 1]) {
      fireEvent.pointerMove(window, { clientX: deltaPx * step });
    }
    fireEvent.pointerUp(window, { clientX: deltaPx });
  }

  it("retimes a cue once, at the end of the gesture", () => {
    const { onMoveCue } = renderTimeline(data);
    drag(blocks("c1")[0], 100);
    // One dispatch for the whole drag. MAX_HISTORY is 50 snapshots, and
    // pointermove fires around sixty times a second: dispatching per move would
    // erase the entire undo history in a single gesture.
    expect(onMoveCue).toHaveBeenCalledTimes(1);
    expect(onMoveCue).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", timeStart: 48, timeEnd: 78 }),
    );
  });

  it("dispatches nothing while the pointer is still down", () => {
    const { onMoveCue } = renderTimeline(data);
    fireEvent.pointerDown(blocks("c1")[0], { clientX: 0, button: 0 });
    fireEvent.pointerMove(window, { clientX: 50 });
    fireEvent.pointerMove(window, { clientX: 100 });
    expect(onMoveCue).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, { clientX: 100 });
    expect(onMoveCue).toHaveBeenCalledTimes(1);
  });

  it("moves every row of a multi-track cue together", () => {
    renderTimeline(data);
    drag(blocks("c2")[0], 100);
    const lefts = blocks("c2").map((block) => block.style.left);
    expect(new Set(lefts).size).toBe(1);
  });

  it("resizes from the right handle without moving the start", () => {
    // The regression that only a browser caught: the handle's pointerdown
    // bubbled to the block behind it, which started its own "move" gesture and
    // overwrote the resize — the right handle slid the whole cue instead.
    const { onMoveCue } = renderTimeline(data);
    // The handles carry `aria-hidden`, so they have no role to query by: they
    // are a pointer affordance, and the keyboard has its own path through the
    // arrow keys. They are the only hidden elements inside a block.
    const handles = blocks("c1")[0].querySelectorAll<HTMLElement>(
      ':scope > div[aria-hidden="true"]',
    );
    expect(handles).toHaveLength(2);
    drag(handles[1], 100);
    expect(onMoveCue).toHaveBeenCalledWith(
      expect.objectContaining({ timeStart: 30, timeEnd: 78 }),
    );
  });

  it("treats a press that goes nowhere as a click", () => {
    const { onMoveCue, onEditCue } = renderTimeline(data);
    fireEvent.pointerDown(blocks("c1")[0], { clientX: 0, button: 0 });
    fireEvent.pointerUp(window, { clientX: 1 });
    fireEvent.click(blocks("c1")[0]);
    expect(onMoveCue).not.toHaveBeenCalled();
    expect(onEditCue).toHaveBeenCalledTimes(1);
  });

  it("swallows the click a real drag ends with", () => {
    const { onEditCue } = renderTimeline(data);
    drag(blocks("c1")[0], 100);
    fireEvent.click(blocks("c1")[0]);
    expect(onEditCue).not.toHaveBeenCalled();
  });

  it("stops at the end of the timeline", () => {
    const { onMoveCue } = renderTimeline(data);
    drag(blocks("c1")[0], 10_000);
    expect(onMoveCue).toHaveBeenCalledWith(
      expect.objectContaining({ timeStart: 150, timeEnd: 180 }),
    );
  });

  it("ignores a press from the middle button", () => {
    const { onMoveCue } = renderTimeline(data);
    fireEvent.pointerDown(blocks("c1")[0], { clientX: 0, button: 1 });
    fireEvent.pointerMove(window, { clientX: 100 });
    fireEvent.pointerUp(window, { clientX: 100 });
    expect(onMoveCue).not.toHaveBeenCalled();
  });
});

describe("Timeline: with a soundtrack attached", () => {
  const audio = (overrides: Partial<TimelineAudio> = {}): TimelineAudio => ({
    isAttached: true,
    getCurrentTime: () => 0,
    duration: 180,
    peaks: [],
    seek: vi.fn(),
    ...overrides,
  });

  it("draws no playhead and no waveform without one", () => {
    renderTimeline();
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("draws neither when a file is detached", () => {
    renderTimeline(makeProject(), { audio: audio({ isAttached: false }) });
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("draws both once a file is attached", () => {
    renderTimeline(makeProject(), { audio: audio() });
    expect(document.querySelector("canvas")).not.toBeNull();
  });

  it("gives the waveform the share of the timeline the file covers", () => {
    // A 90-second file on a 180-second timeline draws across the first half.
    renderTimeline(makeProject(), { audio: audio({ duration: 90 }) });
    const canvasParent = document.querySelector("canvas")
      ?.parentElement as HTMLElement;
    expect(canvasParent.style.width).toBe("50%");
  });

  it("does not stretch a file longer than the timeline past the end", () => {
    renderTimeline(makeProject(), { audio: audio({ duration: 600 }) });
    const canvasParent = document.querySelector("canvas")
      ?.parentElement as HTMLElement;
    expect(canvasParent.style.width).toBe("100%");
  });
});
