import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  // onDelete now needs to handle both node and edge deletion
  onDelete: (idToDelete: string) => void;
  onAddChild: (parentId: string | null) => void; // Expects parentId or null
  selectedNodeId: string | null | undefined;
  selectedEdgeId: string | null | undefined; // Add selectedEdgeId
  canUndo: boolean;
  canRedo: boolean;
  isBusy: boolean; // General flag to disable shortcuts during operations
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onAddChild,
  selectedNodeId,
  selectedEdgeId, // Use selectedEdgeId
  canUndo,
  canRedo,
  isBusy,
}: UseKeyboardShortcutsProps): void {
  // This hook doesn't return anything

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts if busy, or if typing in an input/textarea/editor
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".ql-editor"); // Check for Quill editor class

      if (isBusy || isInputFocused) {
        return;
      }

      const isCtrlCmd = event.ctrlKey || event.metaKey; // Meta for Mac Command key

      // --- Undo (Ctrl/Cmd + Z) ---
      if (isCtrlCmd && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          onUndo();
        }
        return; // Prevent other actions
      }

      // --- Redo (Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y) ---
      if (
        (isCtrlCmd && event.shiftKey && event.key.toLowerCase() === "z") ||
        (isCtrlCmd && event.key === "y")
      ) {
        event.preventDefault();
        if (canRedo) {
          onRedo();
        }
        return; // Prevent other actions
      }

      // --- Delete Node/Edge (Delete or Backspace) ---
      // Check selectedId AFTER checking modifier keys for undo/redo
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNodeId) {
          event.preventDefault();
          onDelete(selectedNodeId);
          return; // Node deleted, stop here
        }
        // Check for selected edge if no node is selected
        if (selectedEdgeId) {
          event.preventDefault();
          onDelete(selectedEdgeId);
          return; // Edge deleted, stop here
        }
        // If neither node nor edge selected, allow default Backspace/Delete behavior
      }

      // --- Add Child Node (Tab) ---
      // Check selectedNodeId
      if (event.key === "Tab" && selectedNodeId) {
        event.preventDefault(); // Prevent default focus change
        onAddChild(selectedNodeId);
        return;
      }

      // Add other shortcuts here...
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // Add all dependencies that the handler uses
  }, [
    onUndo,
    onRedo,
    onDelete,
    onAddChild,
    selectedNodeId,
    selectedEdgeId, // Add selectedEdgeId dependency
    canUndo,
    canRedo,
    isBusy,
  ]);
}
