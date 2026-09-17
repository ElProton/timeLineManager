import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioBar } from "../components/AudioBar";

/**
 * No geometry here, so no stubs: this component is a bar of controls and a
 * `window` keydown listener. What the readout *looks* like as it counts is a
 * browser check — it is written straight into the DOM sixty times a second and
 * never re-renders.
 */

function renderBar(props: Partial<Parameters<typeof AudioBar>[0]> = {}) {
  const handlers = {
    onAttach: vi.fn(),
    onDetach: vi.fn(),
    onTogglePlay: vi.fn(),
    onSeek: vi.fn(),
    onAdoptDuration: vi.fn(),
    onDismissError: vi.fn(),
  };
  const utils = render(
    <AudioBar
      isAttached
      isPlaying={false}
      fileName="Bolero.wav"
      audioDuration={180}
      soundtrack="Bolero.wav"
      projectDuration={180}
      error={null}
      getCurrentTime={() => 0}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, ...utils };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.querySelectorAll("[data-extra]").forEach((el) => el.remove());
});

describe("AudioBar: with nothing attached", () => {
  it("names the file the project is waiting for", () => {
    renderBar({ isAttached: false, fileName: null });
    expect(screen.getByText(/This timeline is set to/)).toBeInTheDocument();
    expect(screen.getByText("Bolero.wav")).toBeInTheDocument();
  });

  it("says plainly that the file stays on the machine", () => {
    // The first thing anyone wonders. A project is a JSON file people mail
    // each other; the recording is not part of it.
    renderBar({ isAttached: false, fileName: null });
    expect(screen.getByText(/nothing is uploaded/i)).toBeInTheDocument();
  });

  it("asks for any soundtrack when the project names none", () => {
    renderBar({ isAttached: false, fileName: null, soundtrack: undefined });
    expect(screen.getByText(/Attach a soundtrack/)).toBeInTheDocument();
    expect(screen.queryByText(/This timeline is set to/)).toBeNull();
  });

  it("offers no transport", () => {
    renderBar({ isAttached: false, fileName: null });
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
  });

  it("hands the chosen file up", () => {
    const { onAttach, container } = renderBar({
      isAttached: false,
      fileName: null,
    });
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["x"], "Song.mp3", { type: "audio/mpeg" });
    fireEvent.change(input!, { target: { files: [file] } });
    expect(onAttach).toHaveBeenCalledWith(file);
    // Reset, so the same file can be chosen again after a failure.
    expect(input!.value).toBe("");
  });
});

describe("AudioBar: the transport", () => {
  it("plays, then pauses", () => {
    const { onTogglePlay, rerender } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);

    rerender(
      <AudioBar
        isAttached
        isPlaying
        fileName="Bolero.wav"
        audioDuration={180}
        soundtrack="Bolero.wav"
        projectDuration={180}
        error={null}
        getCurrentTime={() => 0}
        onAttach={vi.fn()}
        onDetach={vi.fn()}
        onTogglePlay={onTogglePlay}
        onSeek={vi.fn()}
        onAdoptDuration={vi.fn()}
        onDismissError={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("detaches", () => {
    const { onDetach } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onDetach).toHaveBeenCalled();
  });
});

describe("AudioBar: keyboard shortcuts", () => {
  it("plays and pauses on space", () => {
    const { onTogglePlay } = renderBar();
    fireEvent.keyDown(document.body, { key: " " });
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("seeks five seconds with the arrow keys", () => {
    const { onSeek } = renderBar({ getCurrentTime: () => 30 });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenLastCalledWith(35);
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenLastCalledWith(25);
  });

  it("stands down for an event something else already handled", () => {
    // The other half of the contract with Timeline: a focused cue answers the
    // arrow keys itself and calls preventDefault. It is a div with
    // role="button", so `isTypingTarget` cannot recognise it — this can.
    const { onSeek } = renderBar();
    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    window.dispatchEvent(event);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("leaves the keys to whatever has focus", () => {
    const { onTogglePlay, onSeek } = renderBar();
    for (const tag of ["input", "textarea", "select", "button", "a"] as const) {
      const element = document.createElement(tag);
      element.setAttribute("data-extra", "");
      document.body.appendChild(element);
      fireEvent.keyDown(element, { key: " " });
      fireEvent.keyDown(element, { key: "ArrowRight" });
    }
    expect(onTogglePlay).not.toHaveBeenCalled();
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("stands down entirely while a dialog is open", () => {
    // A dialog has its own focus trap and its own meaning for these keys.
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-extra", "");
    document.body.appendChild(dialog);

    const { onTogglePlay } = renderBar();
    fireEvent.keyDown(document.body, { key: " " });
    expect(onTogglePlay).not.toHaveBeenCalled();
  });

  it("ignores a shortcut carrying a modifier", () => {
    const { onTogglePlay } = renderBar();
    for (const modifier of ["ctrlKey", "metaKey", "altKey"] as const) {
      fireEvent.keyDown(document.body, { key: " ", [modifier]: true });
    }
    expect(onTogglePlay).not.toHaveBeenCalled();
  });

  it("binds nothing while no file is attached", () => {
    const { onTogglePlay } = renderBar({ isAttached: false, fileName: null });
    fireEvent.keyDown(document.body, { key: " " });
    expect(onTogglePlay).not.toHaveBeenCalled();
  });
});

describe("AudioBar: the length mismatch", () => {
  it("offers the file's own length when the two disagree", () => {
    const { onAdoptDuration } = renderBar({
      audioDuration: 200,
      projectDuration: 180,
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      /This file runs 03:20.*timeline is set to 03:00/,
    );
    fireEvent.click(screen.getByRole("button", { name: /use the file/i }));
    // The file's real length: rounding and the truncation warning belong to
    // App, which owns the project.
    expect(onAdoptDuration).toHaveBeenCalledWith(200);
  });

  it("says nothing when they agree, or as good as", () => {
    renderBar({ audioDuration: 180, projectDuration: 180 });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("says nothing about a length the browser has not reported yet", () => {
    renderBar({ audioDuration: 0, projectDuration: 180 });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not offer a length the project could never take", () => {
    // MAX_DURATION_SECONDS is twelve hours; offering more would be refused.
    renderBar({ audioDuration: 13 * 60 * 60, projectDuration: 180 });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("AudioBar: errors", () => {
  it("shows one, and lets it be dismissed", () => {
    const { onDismissError } = renderBar({
      error: "No waveform could be drawn for this file. It still plays.",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/still plays/);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismissError).toHaveBeenCalled();
  });

  it("shows none when there is none", () => {
    renderBar();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
