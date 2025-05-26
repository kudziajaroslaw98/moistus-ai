"use client";
// Add History icon import
import useAppStore from "@/contexts/mind-map/mind-map-store";
import {
  ArrowLeft,
  Command,
  History,
  Maximize,
  MessageCircle,
  Minimize2,
  Redo,
  Undo,
  User,
} from "lucide-react";
import Link from "next/link";
import { useShallow } from "zustand/shallow";
import { LayoutSelector } from "../layout-selector";
import { Button } from "../ui/button";

export function MindMapToolbar() {
  const {
    mindMap,
    setPopoverOpen,
    toggleFocusMode,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    isFocusMode,
    popoverOpen,
  } = useAppStore(
    useShallow((state) => ({
      mindMap: state.mindMap,
      setPopoverOpen: state.setPopoverOpen,
      toggleFocusMode: state.toggleFocusMode,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      handleUndo: state.handleUndo,
      handleRedo: state.handleRedo,
      isFocusMode: state.isFocusMode,
      popoverOpen: state.popoverOpen,
    })),
  );

  const handleCommandPaletteOpen = () => {
    setPopoverOpen({ commandPalette: true });
  };

  const handleToggleHistorySidebar = () => {
    setPopoverOpen({ history: true });
  };

  const handleToggleFocusMode = () => {
    toggleFocusMode();
  };

  const handleToggleCommentsPanel = () => {
    setPopoverOpen({ commentsPanel: true });
  };

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
    <div className="absolute top-2 right-2 left-2 z-10 flex flex-wrap items-center justify-between gap-4 rounded-sm bg-zinc-900 p-3 shadow-md">
      {/* Left Section: Back Button, Title & Generate */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Back to Dashboard Link */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center rounded-sm p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="mr-2 truncate text-lg font-semibold text-zinc-100 capitalize">
          {mindMap?.title || "Loading..."}
        </h1>

        {/* AI Generation */}
        {/* <div className="flex items-center gap-2">
          <Input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Topic to generate map..."
            className="min-w-[150px] md:min-w-[200px]"
            disabled={isLoading || aiLoadingStates.isGenerating}
          />

          <Button
            onClick={onGenerateMap}
            disabled={
              isLoading || aiLoadingStates.isGenerating || !aiPrompt.trim()
            }
            title="Generate Map Structure (AI)"
            variant="default"
            size="sm"
          >
            {aiLoadingStates.isGenerating ? "..." : "Generate"}
          </Button>
        </div> */}
      </div>

      {/* Right Section: Search & History */}
      <div className="flex flex-wrap items-center gap-4">
        {/* AI Search */}
        <div className="flex items-center gap-2">
          {/* <Input
            type="text"
            value={aiSearchQuery}
            onChange={(e) => setAiSearchQuery(e.target.value)}
            placeholder="Search nodes (AI)..."
            className="min-w-[150px] md:min-w-[200px]"
            disabled={isLoading || aiLoadingStates.isSearching}
          />
          <Button
            onClick={onAiSearch}
            disabled={
              isLoading || aiLoadingStates.isSearching || !aiSearchQuery.trim()
            }
            title="Search Nodes (AI)"
            variant="sky"
            size="sm"
          >
            {aiLoadingStates.isSearching ? "..." : "Search"}
          </Button> */}
        </div>

        {/* Layout Selector */}
        <LayoutSelector />

        {/* Undo/Redo */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            variant="secondary"
            size="icon"
          >
            <Undo className="size-4" />
          </Button>

          <Button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            variant="secondary"
            size="icon"
          >
            <Redo className="size-4" />
          </Button>
        </div>

        {/* Comments Panel Toggle */}
        <Button
          onClick={handleToggleCommentsPanel}
          title="Toggle Comments Panel (Ctrl+/)"
          aria-label="Toggle Comments Panel"
          variant={popoverOpen.commentsPanel ? "default" : "secondary"}
          size="icon"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>

        {/* History Sidebar Toggle Button */}
        <Button
          onClick={handleToggleHistorySidebar}
          title="Toggle History Sidebar"
          aria-label="Toggle History Sidebar"
          variant="secondary"
          size="icon"
        >
          <History className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleCommandPaletteOpen}
          title="Command Palette"
          aria-label="Command Palette"
          variant="secondary"
          size="icon"
        >
          <Command className="h-4 w-4" />
        </Button>

        {/* Profile Button */}
        <Link href="/dashboard/profile">
          <Button
            title="Profile Settings"
            aria-label="Profile Settings"
            variant="secondary"
            size="icon"
          >
            <User className="h-4 w-4" />
          </Button>
        </Link>

        {/* Focus Mode Button */}
        <Button
          onClick={handleToggleFocusMode}
          title="Enter Focus Mode"
          aria-label="Enter Focus Mode"
          variant="secondary"
          size="icon"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
