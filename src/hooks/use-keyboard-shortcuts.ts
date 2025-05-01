import { ReactFlowInstance } from "@xyflow/react"; // Import ReactFlowInstance
import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (idToDelete: string) => void;
  onAddChild: (parentId: string | null) => void;
  onCopy: () => void; // Add copy callback
  onPaste: () => void; // Add paste callback
  selectedNodeId: string | null | undefined;
  selectedEdgeId: string | null | undefined;
  canUndo: boolean;
  canRedo: boolean;
  isBusy: boolean;
  // Add reactFlowInstance to get viewport info for pasting
  reactFlowInstance: ReactFlowInstance | null;
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onAddChild,
  onCopy, // Destructure new callbacks
  onPaste, // Destructure new callbacks
  selectedNodeId,
  selectedEdgeId,
  canUndo,
  canRedo,
  isBusy,
  reactFlowInstance, // Destructure instance
}: UseKeyboardShortcutsProps): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".ql-editor");

      // Don't interfere with text input shortcuts
      if (
        isInputFocused &&
        (event.key === "c" || event.key === "v") &&
        (event.ctrlKey || event.metaKey)
      ) {
        return;
      }

      if (isBusy) {
        return;
      }

      const isCtrlCmd = event.ctrlKey || event.metaKey;

      // --- Undo (Ctrl/Cmd + Z) ---
      if (isCtrlCmd && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          onUndo();
        }
        return;
      }

      // --- Redo (Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y) ---
      if (
        (isCtrlCmd && event.shiftKey && event.key.toLowerCase() === "z") ||
        (isCtrlCmd && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        if (canRedo) {
          onRedo();
        }
        return;
      }

      // --- Copy (Ctrl/Cmd + C) ---
      if (isCtrlCmd && event.key.toLowerCase() === "c") {
        event.preventDefault();
        onCopy(); // Call the copy handler
        return;
      }

      // --- Paste (Ctrl/Cmd + V) ---
      if (isCtrlCmd && event.key.toLowerCase() === "v") {
        event.preventDefault();
        onPaste(); // Call the paste handler
        return;
      }

      // --- Delete Node/Edge (Delete or Backspace) ---
      if (event.key === "Delete") {
        if (selectedNodeId) {
          event.preventDefault();
          onDelete(selectedNodeId);
          return;
        }
        if (selectedEdgeId) {
          event.preventDefault();
          onDelete(selectedEdgeId);
          return;
        }
      }

      // --- Add Child Node (Tab) ---
      if (event.key === "Tab" && selectedNodeId) {
        event.preventDefault();
        onAddChild(selectedNodeId);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    onUndo,
    onRedo,
    onDelete,
    onAddChild,
    onCopy, // Add dependencies
    onPaste, // Add dependencies
    selectedNodeId,
    selectedEdgeId,
    canUndo,
    canRedo,
    isBusy,
    reactFlowInstance, // Add dependency
  ]);
}
