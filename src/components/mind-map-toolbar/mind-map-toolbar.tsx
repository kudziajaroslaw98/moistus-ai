"use client";
import { AiLoadingStates } from "@/hooks/use-ai-features";
import Link from "next/link"; // Import Link
import { ArrowLeft, Maximize, Redo, Undo } from "lucide-react"; // Import an icon
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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
    <div className="absolute top-2 right-2 left-2 z-10 flex flex-wrap items-center justify-between gap-4 rounded-sm bg-zinc-800 p-3 shadow-md">
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

        <h1 className="mr-2 truncate text-lg font-semibold text-zinc-100">
          {mindMapTitle}
        </h1>

        {/* AI Generation */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Right Section: Search & History */}
      <div className="flex flex-wrap items-center gap-4">
        {/* AI Search */}
        <div className="flex items-center gap-2">
          <Input
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
          </Button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onUndo}
            disabled={isLoading || !canUndo}
            title="Undo (Ctrl+Z)"
            variant="secondary"
            size="icon"
          >
            <Undo className="size-4" />
          </Button>

          <Button
            onClick={onRedo}
            disabled={isLoading || !canRedo}
            title="Redo (Ctrl+Y)"
            variant="secondary"
            size="icon"
          >
            <Redo className="size-4" />
          </Button>
        </div>

        {/* Focus Mode Button */}
        <Button
          onClick={onEnterFocusMode}
          disabled={isLoading}
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
