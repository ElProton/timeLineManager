import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExport } from "../hooks/useExport";
import { ProjectData } from "../types";

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toJpeg: vi.fn(() => Promise.resolve("data:image/jpeg;base64,fake")),
}));

const mockProject: ProjectData = {
  schemaVersion: 1,
  metadata: { title: "My Show", musicName: "Song", durationSeconds: 180 },
  actors: [{ id: "a1", name: "Alice" }],
  actions: [],
};

describe("useExport", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();

    createObjectURLMock = vi.fn(() => "blob:fake-url");
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;

    clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy as () => void);
  });

  it("provides a timelineRef", () => {
    const { result } = renderHook(() => useExport(mockProject));
    expect(result.current.timelineRef).toBeDefined();
    expect(result.current.timelineRef.current).toBeNull();
  });

  describe("saveJson", () => {
    it("does nothing when projectData is null", () => {
      const { result } = renderHook(() => useExport(null));
      act(() => result.current.saveJson());
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it("creates a blob and triggers download", () => {
      const { result } = renderHook(() => useExport(mockProject));
      act(() => result.current.saveJson());

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:fake-url");
    });
  });

  describe("exportImage", () => {
    it("does nothing when projectData is null", async () => {
      const { result } = renderHook(() => useExport(null));
      await act(async () => {
        await result.current.exportImage();
      });
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("does nothing when timelineRef is null", async () => {
      const { result } = renderHook(() => useExport(mockProject));
      await act(async () => {
        await result.current.exportImage();
      });
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
