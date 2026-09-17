import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "../components/ConfirmDialog";

/** Minimal host wiring the hook to its dialog, as App does. */
function Host({ onResult }: { onResult: (value: boolean) => void }) {
  const { confirm, confirmProps } = useConfirm();
  return (
    <>
      <button
        type="button"
        onClick={async () =>
          onResult(
            await confirm({
              title: "Delete track",
              message: "Are you sure?",
              confirmLabel: "Delete",
              destructive: true,
            }),
          )
        }
      >
        ask
      </button>
      <ConfirmDialog {...confirmProps} />
    </>
  );
}

describe("useConfirm", () => {
  it("shows nothing until asked", () => {
    render(<Host onResult={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a dialog carrying the options", async () => {
    render(<Host onResult={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "ask" }));

    expect(await screen.findByRole("dialog")).toHaveAccessibleName(
      "Delete track",
    );
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("resolves true when confirmed", async () => {
    const results: boolean[] = [];
    render(<Host onResult={(value) => results.push(value)} />);

    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    await screen.findByRole("dialog");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(results).toEqual([true]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false when cancelled", async () => {
    const results: boolean[] = [];
    render(<Host onResult={(value) => results.push(value)} />);

    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    await screen.findByRole("dialog");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    expect(results).toEqual([false]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false when dismissed with Escape", async () => {
    const results: boolean[] = [];
    render(<Host onResult={(value) => results.push(value)} />);

    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    await screen.findByRole("dialog");
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(results).toEqual([false]);
  });

  it("settles a pending request as cancelled when a second one arrives", async () => {
    // Otherwise the first caller awaits a promise that never resolves.
    const results: boolean[] = [];
    render(<Host onResult={(value) => results.push(value)} />);
    const ask = screen.getByRole("button", { name: "ask" });

    fireEvent.click(ask);
    await screen.findByRole("dialog");
    await act(async () => {
      fireEvent.click(ask);
    });

    expect(results).toEqual([false]);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });
    expect(results).toEqual([false, true]);
  });
});
