"use client";
import { AiLoadingStates } from "@/hooks/use-ai-features";

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
}: MindMapToolbarProps) {
  return (
    <div className="absolute top-2 left-2 right-2 z-10 flex flex-wrap items-center justify-between gap-4 bg-zinc-800 p-3 shadow-md rounded-sm">
      {/* Left Section: Title & Generate */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-semibold text-zinc-100 mr-4 truncate">
          {mindMapTitle}
        </h1>
        {/* AI Generation */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Topic to generate map..."
            className="min-w-[200px] rounded-sm border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
            {aiLoadingStates.isGenerating ? "..." : "Generate"}{" "}
            {/* Shorten text */}
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
            className="min-w-[200px] rounded-sm border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            {aiLoadingStates.isSearching ? "..." : "Search"}{" "}
            {/* Shorten text */}
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
            {/* Undo Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12.066 11.2a4.95 4.95 0 00-6.936 0A4.95 4.95 0 004.5 14.556V16.5a.5.5 0 001 0v-1.944a3.95 3.95 0 117.084-2.995.5.5 0 00-.584.806A2.95 2.95 0 008.32 14.5v1.444a.5.5 0 001 0V14.5a2.95 2.95 0 10-2.748-2.918.5.5 0 00-.57-.816z"
              />{" "}
            </svg>
          </button>
          <button
            onClick={onRedo}
            className="rounded-sm bg-zinc-600 p-1.5 text-sm font-medium text-zinc-200 shadow-sm hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-40"
            disabled={isLoading || !canRedo}
            title="Redo (Ctrl+Y)"
          >
            {/* Redo Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.934 11.2a4.95 4.95 0 016.936 0A4.95 4.95 0 0119.5 14.556V16.5a.5.5 0 01-1 0v-1.944a3.95 3.95 0 10-7.084-2.995.5.5 0 01.584.806A2.95 2.95 0 0115.68 14.5v1.444a.5.5 0 01-1 0V14.5a2.95 2.95 0 112.748-2.918.5.5 0 01.57-.816z"
              />{" "}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
