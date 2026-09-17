import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../components/Modal";

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <Modal isOpen onClose={onClose} title="Test dialog" {...props}>
      <button type="button">first</button>
      <button type="button">second</button>
    </Modal>,
  );
  return { onClose, ...utils };
}

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden">
        <button type="button">inside</button>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("exposes dialog semantics and is labelled by its title", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Test dialog");
  });

  it("moves focus into the dialog on open", () => {
    renderModal();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "first" }),
    );
  });

  it("restores focus to the trigger on close", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = renderModal();
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes on Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the close button", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a press that starts and ends on the backdrop", () => {
    const { onClose, container } = renderModal();
    fireEvent.mouseDown(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on a press inside the dialog", () => {
    const { onClose } = renderModal();
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  describe("focus trap", () => {
    // jsdom does not move focus on Tab by itself, so these assertions land
    // squarely on the handler rather than on browser behaviour.
    it("wraps from the last focusable back to the first", () => {
      renderModal();
      const close = screen.getByRole("button", { name: "Close dialog" });
      const last = screen.getByRole("button", { name: "second" });

      last.focus();
      fireEvent.keyDown(document, { key: "Tab" });
      expect(document.activeElement).toBe(close);
    });

    it("wraps backwards from the first focusable to the last", () => {
      renderModal();
      const close = screen.getByRole("button", { name: "Close dialog" });
      const last = screen.getByRole("button", { name: "second" });

      close.focus();
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(last);
    });
  });
});
