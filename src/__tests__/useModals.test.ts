import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModals } from "../hooks/useModals";
import { Action, Actor } from "../types";

const mockAction: Action = {
  id: "act1",
  description: "Enter",
  timeStart: 0,
  timeEnd: 30,
  actorIds: ["a1"],
  color: "#ef4444",
};

const mockActor: Actor = { id: "a1", name: "Alice" };

describe("useModals", () => {
  describe("action modal", () => {
    it("starts closed with no editing action", () => {
      const { result } = renderHook(() => useModals());
      expect(result.current.isActionModalOpen).toBe(false);
      expect(result.current.editingAction).toBeNull();
    });

    it("opens for new action (no argument)", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openActionModal());

      expect(result.current.isActionModalOpen).toBe(true);
      expect(result.current.editingAction).toBeNull();
    });

    it("opens for editing an existing action", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openActionModal(mockAction));

      expect(result.current.isActionModalOpen).toBe(true);
      expect(result.current.editingAction).toEqual(mockAction);
    });

    it("closes action modal", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openActionModal(mockAction));
      act(() => result.current.closeActionModal());

      expect(result.current.isActionModalOpen).toBe(false);
    });
  });

  describe("actor modal", () => {
    it("starts closed with no editing actor", () => {
      const { result } = renderHook(() => useModals());
      expect(result.current.isActorModalOpen).toBe(false);
      expect(result.current.editingActor).toBeNull();
    });

    it("opens for new actor", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openActorModal());

      expect(result.current.isActorModalOpen).toBe(true);
      expect(result.current.editingActor).toBeNull();
    });

    it("opens for editing an existing actor", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openActorModal(mockActor));

      expect(result.current.isActorModalOpen).toBe(true);
      expect(result.current.editingActor).toEqual(mockActor);
    });

    it("closes actor modal", () => {
      const { result } = renderHook(() => useModals());
      act(() => result.current.openActorModal());
      act(() => result.current.closeActorModal());

      expect(result.current.isActorModalOpen).toBe(false);
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

      act(() => result.current.openActionModal());
      expect(result.current.isActionModalOpen).toBe(true);
      expect(result.current.isActorModalOpen).toBe(false);
      expect(result.current.isMetadataModalOpen).toBe(false);

      act(() => result.current.openActorModal());
      expect(result.current.isActorModalOpen).toBe(true);
      expect(result.current.isActionModalOpen).toBe(true); // still open
    });
  });
});
