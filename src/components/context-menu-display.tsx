"use client";
import React from "react";
import { Node, XYPosition, Edge } from "@xyflow/react"; // Import Edge
import { NodeData } from "@/types/node-data";
import { ContextMenuState } from "@/types/context-menu-state";
import { AiLoadingStates } from "@/hooks/use-ai-features";
import { EdgeData } from "@/types/edge-data"; // Import EdgeData
import { cn } from "@/utils/cn";
import AStrainghtBIcon from "./icons/a-straight-b";
import AStepBIcon from "./icons/a-step-b";
import ASmoothstepBIcon from "./icons/a-smoothstep-b";

// Define some predefined edge types and colors
const edgeTypesOptions = ["smoothstep", "step", "straight"] as const;
type EdgeTypesType = "smoothstep" | "step" | "straight";
const edgeColorOptions = [
  { name: "Default", value: undefined }, // Use default flow color
  { name: "Grey", value: "#888" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Rose", value: "#fb7185" },
];

interface ContextMenuDisplayProps {
  contextMenuState: ContextMenuState;
  closeContextMenu: () => void;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[]; // <-- Add edges prop
  addNode: (parentId: string | null, position?: XYPosition) => void;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  saveEdgeStyle: (
    edgeId: string,
    styleChanges: Partial<EdgeData>,
  ) => Promise<void>; // <-- Add saveEdgeStyle prop
  aiActions: {
    summarizeNode: (nodeId: string) => void;
    summarizeBranch: (nodeId: string) => void;
    extractConcepts: (nodeId: string) => void;
    openContentModal: (nodeId: string) => void;
    suggestConnections: () => void;
    suggestMerges: () => void;
  };
  aiLoadingStates: AiLoadingStates;
  applyLayout: (direction: "TB" | "LR") => void;
  isLoading: boolean;
  ref?: React.RefObject<HTMLDivElement | null>; // Optional ref prop
}

export function ContextMenuDisplay({
  contextMenuState,
  closeContextMenu,
  nodes,
  edges, // <-- Destructure edges
  addNode,
  deleteNode,
  deleteEdge,
  saveEdgeStyle, // <-- Destructure saveEdgeStyle
  aiActions,
  aiLoadingStates,
  applyLayout,
  isLoading,
  ref,
}: ContextMenuDisplayProps) {
  if (!contextMenuState.visible) return null;

  const { x, y, nodeId, edgeId } = contextMenuState; // <-- Destructure edgeId
  const clickedNode = nodeId ? nodes.find((n) => n.id === nodeId) : null;
  const clickedNodeData = clickedNode?.data;
  const clickedEdge = edgeId ? edges.find((e) => e.id === edgeId) : null; // <-- Find clicked edge

  const handleActionClick = (action: () => void, disabled?: boolean) => {
    if (disabled) return;
    action();
    closeContextMenu();
  };

  const getItemClasses = (disabled: boolean = false): string => {
    return `block w-full rounded-md text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 transition-color cursor-pointer ${
      disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""
    }`;
  };

  const getItemIcon = (type: EdgeTypesType) => {
    switch (type) {
      case "smoothstep":
        return <ASmoothstepBIcon className="size-4 stroke-zinc-200" />;
      case "step":
        return <AStepBIcon className="size-4 stroke-zinc-200" />;
      case "straight":
        return <AStrainghtBIcon className="size-4 stroke-zinc-200" />;
    }
  };

  // --- Node Menu Items ---
  const nodeMenuItems = nodeId ? (
    <>
      <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
        Node
      </span>
      {/* ... existing node menu items ... */}
      <button
        className={getItemClasses(isLoading)}
        onClick={() => handleActionClick(() => addNode(nodeId), isLoading)}
      >
        Add Child
      </button>
      <button
        className={cn([
          getItemClasses(isLoading),
          "text-rose-400 hover:bg-rose-900/50",
        ])}
        onClick={() => handleActionClick(() => deleteNode(nodeId), isLoading)}
      >
        Delete Node
      </button>
      <hr className="my-1 border-zinc-800" />
      <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
        AI
      </span>
      <button
        className={getItemClasses(
          isLoading ||
            aiLoadingStates.isSummarizing ||
            !clickedNodeData?.content,
        )}
        onClick={() =>
          handleActionClick(
            () => aiActions.summarizeNode(nodeId),
            isLoading ||
              aiLoadingStates.isSummarizing ||
              !clickedNodeData?.content,
          )
        }
      >
        Summarize Node (AI)
      </button>
      <button
        className={getItemClasses(
          isLoading || aiLoadingStates.isSummarizingBranch,
        )}
        onClick={() =>
          handleActionClick(
            () => aiActions.summarizeBranch(nodeId),
            isLoading || aiLoadingStates.isSummarizingBranch,
          )
        }
      >
        Summarize Branch (AI)
      </button>
      <button
        className={getItemClasses(
          isLoading ||
            aiLoadingStates.isExtracting ||
            !clickedNodeData?.content,
        )}
        onClick={() =>
          handleActionClick(
            () => aiActions.extractConcepts(nodeId),
            isLoading ||
              aiLoadingStates.isExtracting ||
              !clickedNodeData?.content,
          )
        }
      >
        Extract Concepts (AI)
      </button>
      <button
        className={getItemClasses(
          isLoading ||
            aiLoadingStates.isGeneratingContent ||
            !clickedNodeData?.content,
        )}
        onClick={() =>
          handleActionClick(
            () => aiActions.openContentModal(nodeId),
            isLoading ||
              aiLoadingStates.isGeneratingContent ||
              !clickedNodeData?.content,
          )
        }
      >
        Generate Content (AI)
      </button>
    </>
  ) : null;

  // --- Pane Menu Items ---
  const paneMenuItems =
    !nodeId && !edgeId ? ( // <-- Check edgeId is null too
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Node
        </span>
        <button
          className={getItemClasses(isLoading)}
          onClick={() =>
            handleActionClick(
              () => addNode(null, "New Node", "editableNode", { x, y }), // Pass coords for pane click
              isLoading,
            )
          }
        >
          Add Node Here
        </button>
        <hr className="my-1 border-zinc-800" />
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          AI
        </span>
        <button
          className={getItemClasses(
            isLoading ||
              aiLoadingStates.isSuggestingConnections ||
              nodes.length < 2,
          )}
          onClick={() =>
            handleActionClick(
              aiActions.suggestConnections,
              isLoading ||
                aiLoadingStates.isSuggestingConnections ||
                nodes.length < 2,
            )
          }
        >
          Suggest Connections (AI)
        </button>
        <button
          className={getItemClasses(
            isLoading || aiLoadingStates.isSuggestingMerges || nodes.length < 2,
          )}
          onClick={() =>
            handleActionClick(
              aiActions.suggestMerges,
              isLoading ||
                aiLoadingStates.isSuggestingMerges ||
                nodes.length < 2,
            )
          }
        >
          Suggest Merges (AI)
        </button>
        <hr className="my-1 border-zinc-800" />
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Layout
        </span>
        <button
          className={getItemClasses(isLoading)}
          onClick={() => handleActionClick(() => applyLayout("TB"), isLoading)}
        >
          Layout (Top-Bottom)
        </button>
        <button
          className={getItemClasses(isLoading)}
          onClick={() => handleActionClick(() => applyLayout("LR"), isLoading)}
        >
          Layout (Left-Right)
        </button>
      </>
    ) : null;

  // --- Edge Menu Items ---
  const edgeMenuItems =
    edgeId && clickedEdge ? (
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Edge
        </span>
        <button
          className={cn([
            getItemClasses(isLoading),
            "text-rose-400 hover:bg-rose-900/50",
          ])}
          onClick={() => handleActionClick(() => deleteEdge(edgeId), isLoading)}
        >
          Delete Edge
        </button>

        <hr className="my-1 border-zinc-800" />
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Edge Style
        </span>
        {/* Simple actions */}

        <button
          className={getItemClasses(isLoading)}
          onClick={() =>
            handleActionClick(
              () => saveEdgeStyle(edgeId, { animated: !clickedEdge.animated }),
              isLoading,
            )
          }
        >
          {clickedEdge.animated ? "Stop Animation" : "Start Animation"}
        </button>

        {/* --- Change Type Submenu --- */}
        <div
          className={getItemClasses(isLoading) + " group relative bg-zinc-950"}
        >
          <span>Change Type ({clickedEdge.type || "default"})</span>
          <div
            className={`invisible absolute top-0 left-full z-10 ml-1 flex min-w-[120px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 p-1 opacity-0 shadow-lg transition-all delay-100 duration-150 ease-in-out group-hover:visible group-hover:opacity-100 group-hover:delay-0`}
          >
            {edgeTypesOptions.map((type) => (
              <button
                key={type}
                className={cn([
                  getItemClasses(isLoading || clickedEdge.type === type),
                  "flex items-center gap-2",
                ])}
                onClick={() =>
                  handleActionClick(
                    () => saveEdgeStyle(edgeId, { type }),
                    isLoading,
                  )
                }
                disabled={clickedEdge.type === type || isLoading} // Ensure disabled check includes isLoading
              >
                {getItemIcon(type)}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {/* --------------------------- */}

        {/* --- Change Color Submenu --- */}
        <div
          className={getItemClasses(isLoading) + " group relative bg-zinc-950"}
        >
          <span>Change Color</span>
          <div
            className={`invisible absolute top-0 left-full z-10 ml-1 flex min-w-[120px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 p-1 opacity-0 shadow-lg transition-all delay-100 duration-150 ease-in-out group-hover:visible group-hover:opacity-100 group-hover:delay-0`}
          >
            {edgeColorOptions.map((colorOpt) => (
              <button
                key={colorOpt.name}
                className={getItemClasses(
                  isLoading || clickedEdge.style?.stroke === colorOpt.value,
                )}
                onClick={() =>
                  handleActionClick(
                    () => saveEdgeStyle(edgeId, { color: colorOpt.value }),
                    isLoading,
                  )
                }
                disabled={
                  (clickedEdge.style?.stroke === colorOpt.value &&
                    colorOpt.value !== undefined) ||
                  (clickedEdge.style?.stroke === undefined &&
                    colorOpt.value === undefined) ||
                  isLoading
                }
              >
                <span
                  className="mr-2 inline-block h-3 w-3 rounded-full border border-zinc-500"
                  style={{ backgroundColor: colorOpt.value || "transparent" }}
                ></span>
                {colorOpt.name}
              </button>
            ))}
          </div>
        </div>
        {/* -------------------------- */}

        {/* ... (rest of edge menu items like delete) ... */}
      </>
    ) : null;
  // --------------------------

  return (
    <div
      ref={ref}
      className="ring-opacity-5 absolute z-[1000] flex min-w-[250px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 px-1 py-1 shadow-lg ring-1 ring-black focus:outline-none"
      style={{ top: y, left: x }}
    >
      {nodeId && nodeMenuItems}
      {edgeId && edgeMenuItems}
      {!nodeId && !edgeId && paneMenuItems}
    </div>
  );
}
