import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModals } from "../hooks/useModals";
import type { Cue, Track } from "../types";

const mockCue: Cue = {
  id: "act1",
  description: "Enter",
  timeStart: 0,
  timeEnd: 30,
  trackIds: ["a1"],
  color: "#ef4444",
};

const mockTrack: Track = { id: "a1", name: "Alice" };

describe("useModals", () => {
  describe("cue modal", () => {
    it("starts closed with no editing action", () => {
      const { result } = renderHook(() => useModals());
      expect(result.current.isCueModalOpen).toBe(false);
      expect(result.current.editingCue).toBeNull();
    });

    it("opens for new action (no argument)", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openCueModal());

      expect(result.current.isCueModalOpen).toBe(true);
      expect(result.current.editingCue).toBeNull();
    });

    it("opens for editing an existing action", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openCueModal(mockCue));

      expect(result.current.isCueModalOpen).toBe(true);
      expect(result.current.editingCue).toEqual(mockCue);
    });

    it("closes action modal", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openCueModal(mockCue));
      act(() => result.current.closeCueModal());

      expect(result.current.isCueModalOpen).toBe(false);
    });
  });

  describe("track modal", () => {
    it("starts closed with no editing track", () => {
      const { result } = renderHook(() => useModals());
      expect(result.current.isTrackModalOpen).toBe(false);
      expect(result.current.editingTrack).toBeNull();
    });

    it("opens for new track", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openTrackModal());

      expect(result.current.isTrackModalOpen).toBe(true);
      expect(result.current.editingTrack).toBeNull();
    });

    it("opens for editing an existing track", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openTrackModal(mockTrack));

      expect(result.current.isTrackModalOpen).toBe(true);
      expect(result.current.editingTrack).toEqual(mockTrack);
    });

    it("closes track modal", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openTrackModal());
      act(() => result.current.closeTrackModal());

      expect(result.current.isTrackModalOpen).toBe(false);
    });
  });

  describe("metadata modal", () => {
    it("starts closed", () => {
      const { result } = renderHook(() => useModals());
      expect(result.current.isMetadataModalOpen).toBe(false);
    });

    it("opens and closes", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openMetadataModal());
      expect(result.current.isMetadataModalOpen).toBe(true);

      act(() => result.current.closeMetadataModal());
      expect(result.current.isMetadataModalOpen).toBe(false);
    });
  });

  describe("modals are independent", () => {
    it("opening one does not affect others", () => {
      const { result } = renderHook(() => useModals());

      act(() => result.current.openCueModal());
      expect(result.current.isCueModalOpen).toBe(true);
      expect(result.current.isTrackModalOpen).toBe(false);
      expect(result.current.isMetadataModalOpen).toBe(false);

      act(() => result.current.openTrackModal());
      expect(result.current.isTrackModalOpen).toBe(true);
      expect(result.current.isCueModalOpen).toBe(true); // still open
    });
  });
});
