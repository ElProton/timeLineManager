import { useEffect, useRef } from "react";
import type { Peak } from "../utils/waveform";

interface Props {
  peaks: Peak[];
  /** Any CSS colour. Defaults to the indigo the rest of the app uses. */
  colour?: string;
}

/**
 * Draws the peaks of the attached soundtrack behind the timeline.
 *
 * A canvas, not a few thousand DOM nodes: the same reasoning that caps the
 * time axis at 40 markers applies here, only with fifty times as many columns.
 *
 * `html-to-image` copies a canvas through `toDataURL`, so the waveform comes
 * out in the JPEG export like everything else.
 */
export function Waveform({ peaks, colour = "#6366f1" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const draw = () => {
      // The canvas has a CSS size and a bitmap size. Matching the bitmap to
      // the device pixels is what keeps the drawing sharp on a retina screen.
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(parent.clientWidth * ratio));
      const height = Math.max(1, Math.round(parent.clientHeight * ratio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, width, height);
      if (peaks.length === 0) return;

      const middle = height / 2;
      context.fillStyle = colour;

      for (let x = 0; x < width; x += 1) {
        const peak = peaks[Math.floor((x / width) * peaks.length)];
        const top = middle - peak.max * middle;
        const bottom = middle - peak.min * middle;
        // Silence is a hairline rather than nothing at all, so the lane reads
        // as a soundtrack that is quiet here and not as a failed drawing.
        context.fillRect(x, top, 1, Math.max(1, bottom - top));
      }
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [peaks, colour]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      aria-hidden="true"
    />
  );
}
