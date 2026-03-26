import { useRef, useCallback } from "react";
import { ProjectData } from "../types";
import * as htmlToImage from "html-to-image";

export function useExport(projectData: ProjectData | null) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const saveJson = useCallback(() => {
    if (!projectData) return;
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectData.metadata.title.replace(/\s+/g, "_")}_timeline.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [projectData]);

  const exportImage = useCallback(async () => {
    if (!timelineRef.current || !projectData) return;
    try {
      const node = timelineRef.current;
      const dataUrl = await htmlToImage.toJpeg(node, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: node.scrollWidth + "px",
          height: node.scrollHeight + "px",
        },
      });
      const link = document.createElement("a");
      link.download = `${projectData.metadata.title.replace(/\s+/g, "_")}_timeline.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export image", err);
      alert("Failed to export image. Please try again.");
    }
  }, [projectData]);

  return {
    timelineRef,
    saveJson,
    exportImage,
  };
}
