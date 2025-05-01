"use client";
import { AiLoadingStates } from "@/hooks/use-ai-features";
import Link from "next/link"; // Import Link
import { ArrowLeft, Maximize, Redo, Undo } from "lucide-react"; // Import an icon

interface MindMapToolbarProps {
  mindMapTitle: string;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  aiSearchQuery: string;
  setAiSearchQuery: (value: string) => void;
  onGenerateMap: () => void;
  onAiSearch: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isLoading: boolean;
  aiLoadingStates: AiLoadingStates;
  onEnterFocusMode: () => void;
}

export function MindMapToolbar({
  mindMapTitle,
  aiPrompt,
  setAiPrompt,
  aiSearchQuery,
  setAiSearchQuery,
  onGenerateMap,
  onAiSearch,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isLoading,
  aiLoadingStates,
  onEnterFocusMode,
}: MindMapToolbarProps) {
  return (
    <div className="absolute top-2 left-2 right-2 z-10 flex flex-wrap items-center justify-between gap-4 bg-zinc-800 p-3 shadow-md rounded-sm">
      {/* Left Section: Back Button, Title & Generate */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Back to Dashboard Link */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center p-1.5 rounded-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="text-lg font-semibold text-zinc-100 mr-2 truncate">
          {mindMapTitle}
        </h1>

        {/* AI Generation */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Topic to generate map..."
            className="min-w-[150px] md:min-w-[200px] rounded-sm border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            disabled={isLoading || aiLoadingStates.isGenerating}
          />
          <button
            onClick={onGenerateMap}
            className="rounded-sm bg-teal-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50"
            disabled={
              isLoading || aiLoadingStates.isGenerating || !aiPrompt.trim()
            }
            title="Generate Map Structure (AI)"
          >
            {aiLoadingStates.isGenerating ? "..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Right Section: Search & History */}
      <div className="flex flex-wrap items-center gap-4">
        {/* AI Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={aiSearchQuery}
            onChange={(e) => setAiSearchQuery(e.target.value)}
            placeholder="Search nodes (AI)..."
            className="min-w-[150px] md:min-w-[200px] rounded-sm border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            disabled={isLoading || aiLoadingStates.isSearching}
          />
          <button
            onClick={onAiSearch}
            className="rounded-sm bg-sky-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50"
            disabled={
              isLoading || aiLoadingStates.isSearching || !aiSearchQuery.trim()
            }
            title="Search Nodes (AI)"
          >
            {aiLoadingStates.isSearching ? "..." : "Search"}
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            className="rounded-sm bg-zinc-600 p-1.5 text-sm font-medium text-zinc-200 shadow-sm hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-40"
            disabled={isLoading || !canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="size-4" />
          </button>

          <button
            onClick={onRedo}
            className="rounded-sm bg-zinc-600 p-1.5 text-sm font-medium text-zinc-200 shadow-sm hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-40"
            disabled={isLoading || !canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="size-4" />
          </button>
        </div>

        {/* Focus Mode Button */}
        <button
          onClick={onEnterFocusMode} // Call the passed handler
          className="rounded-sm bg-zinc-600 p-1.5 text-sm font-medium text-zinc-200 shadow-sm hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-40"
          disabled={isLoading} // Disable if other actions are loading? Optional.
          title="Enter Focus Mode"
          aria-label="Enter Focus Mode"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
