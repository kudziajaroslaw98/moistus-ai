"use client";
import React, { useRef } from "react";
import { Node, XYPosition, Edge } from "@xyflow/react"; // Import Edge
import { NodeData } from "@/types/node-data";
import { ContextMenuState } from "@/types/context-menu-state";
import { AiLoadingStates } from "@/hooks/use-ai-features";
import { EdgeData } from "@/types/edge-data"; // Import EdgeData
import useOutsideAlerter from "@/hooks/use-click-outside";

// Define some predefined edge types and colors
const edgeTypesOptions = ["smoothstep", "step", "straight"];
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
    return `block w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 cursor-pointer ${
      disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""
    }`;
  };

  // --- Node Menu Items ---
  const nodeMenuItems = nodeId ? (
    <>
      {/* ... existing node menu items ... */}
      <button
        className={getItemClasses(isLoading)}
        onClick={() => handleActionClick(() => addNode(nodeId), isLoading)}
      >
        Add Child
      </button>
      <button
        className={getItemClasses(isLoading)}
        onClick={() => handleActionClick(() => deleteNode(nodeId), isLoading)}
      >
        Delete Node
      </button>
      <hr className="my-1 border-zinc-700" />
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
        {/* ... existing pane menu items ... */}
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
        <hr className="my-1 border-zinc-700" />
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
        <hr className="my-1 border-zinc-700" />
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
          className={getItemClasses(isLoading) + " group relative bg-zinc-800"}
        >
          {" "}
          {/* Add relative and group */}
          <span>Change Type ({clickedEdge.type || "default"})</span>
          {/* Submenu Div - Apply transition classes */}
          <div
            className={`bg-zinc-750 invisible absolute top-0 left-full z-10 ml-1 min-w-[120px] rounded-sm border border-zinc-600 bg-zinc-800 py-1 opacity-0 shadow-lg transition-all delay-100 duration-150 ease-in-out group-hover:visible group-hover:opacity-100 group-hover:delay-0`}
          >
            {edgeTypesOptions.map((type) => (
              <button
                key={type}
                className={getItemClasses(
                  isLoading || clickedEdge.type === type,
                )}
                onClick={() =>
                  handleActionClick(
                    () => saveEdgeStyle(edgeId, { type }),
                    isLoading,
                  )
                }
                disabled={clickedEdge.type === type || isLoading} // Ensure disabled check includes isLoading
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        {/* --------------------------- */}

        {/* --- Change Color Submenu --- */}
        <div
          className={getItemClasses(isLoading) + " group relative bg-zinc-800"}
        >
          {" "}
          {/* Add relative and group */}
          <span>Change Color</span>
          {/* Submenu Div - Apply transition classes */}
          <div
            className={`bg-zinc-750 invisible absolute top-0 left-full z-10 ml-1 min-w-[120px] rounded-sm border border-zinc-600 bg-zinc-800 py-1 opacity-0 shadow-lg transition-all delay-100 duration-150 ease-in-out group-hover:visible group-hover:opacity-100 group-hover:delay-0`}
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
                } // Corrected disabled logic for default
              >
                {/* Visual color indicator */}
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
        <hr className="my-1 border-zinc-700" />
        <button
          className={
            getItemClasses(isLoading || true) +
            " text-rose-400 hover:bg-rose-900/50"
          } // Keep delete disabled for now
          // TODO: Implement deleteEdge function in CRUD hook if needed
          // onClick={() => handleActionClick(() => deleteEdge(edgeId), isLoading)}
          disabled={true} // Temporarily disable delete
        >
          Delete Edge (Not Implemented)
        </button>
      </>
    ) : null;
  // --------------------------

  return (
    <div
      ref={ref}
      className="ring-opacity-5 absolute z-[1000] min-w-[180px] rounded-sm bg-zinc-800 py-1 shadow-lg ring-1 ring-black focus:outline-none"
      style={{ top: y, left: x }}
    >
      {nodeId && nodeMenuItems}
      {edgeId && edgeMenuItems}
      {!nodeId && !edgeId && paneMenuItems}
    </div>
  );
}
