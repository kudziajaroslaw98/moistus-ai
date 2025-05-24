"use client";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { Minimize2 } from "lucide-react";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { MindMapToolbar } from "../mind-map-toolbar/mind-map-toolbar";

export function ToolbarWrapper() {
  // const {
  //   mindMap,
  //   aiPrompt,
  //   aiActions,
  //   aiSearchQuery,
  //   isLoading,
  //   aiLoadingStates,
  //   toggleFocusMode,
  //   setIsCommandPaletteOpen,
  //   setIsHistorySidebarOpen, // Get setter for history sidebar
  // } = useMindMapContext();
  const {
    mindMap,
    handleUndo,
    toggleFocusMode,
    handleRedo,
    isFocusMode,
    setPopoverOpen,
  } = useAppStore(
    useShallow((state) => ({
      mindMap: state.mindMap,
      handleUndo: state.handleUndo,
      handleRedo: state.handleRedo,
      isFocusMode: state.isFocusMode,
      toggleFocusMode: state.toggleFocusMode,
      setPopoverOpen: state.setPopoverOpen,
    })),
  );

  const handleCommandPaletteOpen = useCallback(() => {
    setPopoverOpen({ commandPalette: true });
  }, []);

  const handleToggleHistorySidebar = useCallback(() => {
    setPopoverOpen({ history: true });
  }, []);

  if (isFocusMode) {
    return (
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={toggleFocusMode} // Use toggleFocusMode directly
          className="flex items-center justify-center rounded-sm bg-zinc-700 p-2 text-zinc-200 shadow-md transition-colors hover:bg-zinc-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:outline-none"
          title="Exit Focus Mode"
          aria-label="Exit Focus Mode"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <MindMapToolbar
      mindMapTitle={mindMap?.title || "Loading..."}
      // aiPrompt={aiPrompt}
      // setAiPrompt={aiActions.setAiPrompt} // Pass down from context
      // aiSearchQuery={aiSearchQuery}
      // setAiSearchQuery={aiActions.setAiSearchQuery} // Pass down from context
      // onGenerateMap={aiActions.generateMap} // Pass down from context
      // onAiSearch={aiActions.searchNodes} // Pass down from context
      onUndo={handleUndo}
      onRedo={handleRedo}
      // isLoading={isLoading}
      // aiLoadingStates={aiLoadingStates}
      onEnterFocusMode={toggleFocusMode} // Use toggleFocusMode
      onCommandPaletteOpen={handleCommandPaletteOpen} // Use setter from context
      onToggleHistorySidebar={handleToggleHistorySidebar} // Add toggle handler
    />
  );
}
