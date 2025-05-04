"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { Minimize2 } from "lucide-react";
import { MindMapToolbar } from "../mind-map-toolbar/mind-map-toolbar";

export function ToolbarWrapper() {
  const {
    mindMap,
    aiPrompt,
    aiActions,
    aiSearchQuery,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    isLoading,
    aiLoadingStates,
    isFocusMode,
    toggleFocusMode,
    setIsCommandPaletteOpen,
  } = useMindMapContext();

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
      aiPrompt={aiPrompt}
      setAiPrompt={aiActions.setAiPrompt} // Pass down from context
      aiSearchQuery={aiSearchQuery}
      setAiSearchQuery={aiActions.setAiSearchQuery} // Pass down from context
      onGenerateMap={aiActions.generateMap} // Pass down from context
      onAiSearch={aiActions.searchNodes} // Pass down from context
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={canUndo}
      canRedo={canRedo}
      isLoading={isLoading}
      aiLoadingStates={aiLoadingStates}
      onEnterFocusMode={toggleFocusMode} // Use toggleFocusMode
      onCommandPaletteOpen={() => setIsCommandPaletteOpen(true)} // Use setter from context
    />
  );
}
