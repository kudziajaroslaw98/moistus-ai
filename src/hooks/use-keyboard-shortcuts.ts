import { ReactFlowInstance } from "@xyflow/react";
import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (idToDelete: string) => void;
  onAddChild: (parentId: string | null) => void;
  onCopy: () => void;
  onPaste: () => void;
  selectedNodeId: string | null | undefined;
  selectedEdgeId: string | null | undefined;
  canUndo: boolean;
  canRedo: boolean;
  isBusy: boolean;

  reactFlowInstance: ReactFlowInstance | null;
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onAddChild,
  onCopy,
  onPaste,
  selectedNodeId,
  selectedEdgeId,
  canUndo,
  canRedo,
  isBusy,
  reactFlowInstance,
}: UseKeyboardShortcutsProps): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".ql-editor");

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

      if (isCtrlCmd && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();

        if (canUndo) {
          onUndo();
        }

        return;
      }

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

      if (isCtrlCmd && event.key.toLowerCase() === "c") {
        event.preventDefault();
        onCopy();
        return;
      }

      if (isCtrlCmd && event.key.toLowerCase() === "v") {
        event.preventDefault();
        onPaste();
        return;
      }

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
    onCopy,
    onPaste,
    selectedNodeId,
    selectedEdgeId,
    canUndo,
    canRedo,
    isBusy,
    reactFlowInstance,
  ]);
}
