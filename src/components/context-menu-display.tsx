"use client";
import { AiLoadingStates } from "@/hooks/use-ai-features";
import { ContextMenuState } from "@/types/context-menu-state";
import { EdgeData } from "@/types/edge-data"; // Import EdgeData
import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Edge, Node, ReactFlowInstance, XYPosition } from "@xyflow/react"; // Import Edge
import {
  ChevronRight,
  GitPullRequestArrow,
  LayoutPanelLeft,
  LayoutPanelTop,
  Network,
  NotepadTextDashed,
  Palette,
  Pause,
  Play,
  Plus,
  ScanBarcode,
  ScanText,
  Shapes,
  Sparkles,
  Trash,
} from "lucide-react";
import React from "react";
import ABezierBIcon from "./icons/a-bezier-b";
import ASmoothstepBIcon from "./icons/a-smoothstep-b";
import AStepBIcon from "./icons/a-step-b";
import AStrainghtBIcon from "./icons/a-straight-b";
import { Button } from "./ui/button";

// Define some predefined edge types and colors
const edgeTypesOptions = ["smoothstep", "step", "straight", "bezier"] as const;
type EdgeTypesType = "smoothstep" | "step" | "straight" | "bezier";
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
  reactFlowInstance: ReactFlowInstance;
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
  reactFlowInstance,
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

  const getItemIcon = (type: EdgeTypesType) => {
    switch (type) {
      case "smoothstep":
        return <ASmoothstepBIcon className="size-4 stroke-zinc-200" />;
      case "step":
        return <AStepBIcon className="size-4 stroke-zinc-200" />;
      case "straight":
        return <AStrainghtBIcon className="size-4 stroke-zinc-200" />;
      case "bezier":
        return <ABezierBIcon className="size-4 stroke-zinc-200" />;
    }
  };

  // --- Node Menu Items ---
  const nodeMenuItems = nodeId ? (
    <>
      <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
        Node
      </span>
      {/* ... existing node menu items ... */}
      <Button
        variant="ghost"
        align="left"
        onClick={() => handleActionClick(() => addNode(nodeId), isLoading)}
        disabled={isLoading}
        className="gap-2"
      >
        <Plus className="size-4" />
        <span>Add Child</span>
      </Button>
      <Button
        variant="ghost-destructive"
        align="left"
        onClick={() => handleActionClick(() => deleteNode(nodeId), isLoading)}
        disabled={isLoading}
        className="gap-2"
      >
        <Trash className="size-4" />
        Delete Node
      </Button>
      <hr className="my-1 border-zinc-700" />
      <Button
        variant="ghost"
        align="left"
        onClick={() =>
          handleActionClick(
            () => aiActions.summarizeNode(nodeId),
            isLoading ||
              aiLoadingStates.isSummarizing ||
              !clickedNodeData?.content,
          )
        }
        disabled={
          isLoading ||
          aiLoadingStates.isSummarizing ||
          !clickedNodeData?.content
        }
        className="gap-2"
      >
        <ScanText className="size-4" />
        <span>Summarize Node (AI)</span>
      </Button>
      <Button
        variant="ghost"
        disabled={isLoading || aiLoadingStates.isSummarizingBranch}
        onClick={() =>
          handleActionClick(
            () => aiActions.summarizeBranch(nodeId),
            isLoading || aiLoadingStates.isSummarizingBranch,
          )
        }
        className="gap-2"
      >
        <ScanBarcode className="size-4" />
        <span>Summarize Branch (AI)</span>
      </Button>
      <Button
        variant="ghost"
        align="left"
        disabled={
          isLoading || aiLoadingStates.isExtracting || !clickedNodeData?.content
        }
        onClick={() =>
          handleActionClick(
            () => aiActions.extractConcepts(nodeId),
            isLoading ||
              aiLoadingStates.isExtracting ||
              !clickedNodeData?.content,
          )
        }
        className="gap-2"
      >
        <NotepadTextDashed className="size-4" />
        <span>Extract Concepts (AI)</span>
      </Button>
      <Button
        variant="ghost"
        align="left"
        disabled={
          isLoading ||
          aiLoadingStates.isGeneratingContent ||
          !clickedNodeData?.content
        }
        onClick={() =>
          handleActionClick(
            () => aiActions.openContentModal(nodeId),
            isLoading ||
              aiLoadingStates.isGeneratingContent ||
              !clickedNodeData?.content,
          )
        }
        className="gap-2"
      >
        <Sparkles className="size-4" />
        <span>Generate Content (AI)</span>
      </Button>
    </>
  ) : null;

  // --- Pane Menu Items ---
  const paneMenuItems =
    !nodeId && !edgeId ? ( // <-- Check edgeId is null too
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Node
        </span>
        <Button
          variant="ghost"
          align="left"
          disabled={isLoading}
          onClick={() =>
            handleActionClick(() => {
              // Convert page coordinates to flow coordinates
              const flowPosition = reactFlowInstance.screenToFlowPosition({
                x: contextMenuState.x,
                y: contextMenuState.y,
              });
              addNode(null, flowPosition);
            }, isLoading)
          }
          className="gap-2"
        >
          <Plus className="size-4" />
          <span>Add Node Here</span>
        </Button>
        <hr className="my-1 border-zinc-800" />
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          AI
        </span>
        <Button
          variant="ghost"
          align="left"
          disabled={
            isLoading ||
            aiLoadingStates.isSuggestingConnections ||
            nodes.length < 2
          }
          onClick={() =>
            handleActionClick(
              aiActions.suggestConnections,
              isLoading ||
                aiLoadingStates.isSuggestingConnections ||
                nodes.length < 2,
            )
          }
          className="gap-2"
        >
          <Network className="size-4" />
          <span>Suggest Connections (AI)</span>
        </Button>
        <Button
          variant="ghost"
          align="left"
          disabled={
            isLoading || aiLoadingStates.isSuggestingMerges || nodes.length < 2
          }
          onClick={() =>
            handleActionClick(
              aiActions.suggestMerges,
              isLoading ||
                aiLoadingStates.isSuggestingMerges ||
                nodes.length < 2,
            )
          }
          className="gap-2"
        >
          <GitPullRequestArrow className="size-4" />
          <span>Suggest Merges (AI)</span>
        </Button>
        <hr className="my-1 border-zinc-800" />
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Layout
        </span>
        <Button
          variant="ghost"
          align="left"
          disabled={isLoading}
          onClick={() => handleActionClick(() => applyLayout("TB"), isLoading)}
          className="gap-2"
        >
          <LayoutPanelTop className="size-4" />
          <span>Layout (Top-Bottom)</span>
        </Button>
        <Button
          variant="ghost"
          align="left"
          disabled={isLoading}
          onClick={() => handleActionClick(() => applyLayout("LR"), isLoading)}
          className="gap-2"
        >
          <LayoutPanelLeft className="size-4" />
          <span>Layout (Left-Right)</span>
        </Button>
      </>
    ) : null;

  // --- Edge Menu Items ---
  const edgeMenuItems =
    edgeId && clickedEdge ? (
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Edge
        </span>
        <Button
          variant="ghost-destructive"
          align="left"
          disabled={isLoading}
          onClick={() => handleActionClick(() => deleteEdge(edgeId), isLoading)}
          className={"gap-2"}
        >
          <Trash className="size-4" />
          <span>Delete Edge</span>
        </Button>

        <hr className="my-1 border-zinc-800" />
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Edge Style
        </span>
        {/* Simple actions */}

        <Button
          variant="ghost"
          align="left"
          disabled={isLoading}
          onClick={() =>
            handleActionClick(
              () => saveEdgeStyle(edgeId, { animated: !clickedEdge.animated }),
              isLoading,
            )
          }
          className="gap-2"
        >
          {clickedEdge.animated ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
          <span>
            {clickedEdge.animated ? "Stop Animation" : "Start Animation"}
          </span>
        </Button>

        {/* --- Change Type Submenu --- */}
        <div
          className={
            `block w-full rounded-md text-left px-3 py-1.5 h-8 text-xs text-zinc-200 hover:bg-zinc-800 transition-color cursor-pointer ${
              isLoading
                ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                : ""
            }` + " group relative bg-zinc-950"
          }
        >
          <div className="flex justify-between w-full h-full items-center">
            <div className="flex items-center gap-2">
              <Shapes className="size-4" />
              <span>Change Type ({clickedEdge.type || "default"}) </span>
            </div>
            <ChevronRight className="size-4" />
          </div>
          <div
            className={`invisible absolute top-0 left-full z-10 ml-1 flex min-w-[120px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 p-1 opacity-0 shadow-lg transition-all delay-100 duration-150 ease-in-out group-hover:visible group-hover:opacity-100 group-hover:delay-0`}
          >
            {edgeTypesOptions.map((type) => (
              <Button
                variant="ghost"
                size={"sm"}
                key={type}
                align={"left"}
                className={cn(["flex items-center justify-start gap-2"])}
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
              </Button>
            ))}
          </div>
        </div>
        {/* --------------------------- */}

        {/* --- Change Color Submenu --- */}
        <div
          className={
            `block w-full rounded-md text-left px-3 py-1.5 h-8 text-xs text-zinc-200 hover:bg-zinc-800 transition-color cursor-pointer ${
              isLoading
                ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                : ""
            }` + " group relative bg-zinc-950"
          }
        >
          <div className="flex justify-between w-full h-full items-center">
            <div className="flex items-center gap-2">
              <Palette className="size-4" />
              <span>
                Change Color (
                {edgeColorOptions.find(
                  (opt) => opt.value === clickedEdge.style?.stroke,
                )?.name || "default"}
                )
              </span>
            </div>
            <ChevronRight className="size-4" />
          </div>
          <div
            className={`invisible absolute top-0 left-full z-10 ml-1 flex min-w-[120px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 p-1 opacity-0 shadow-lg transition-all delay-100 duration-150 ease-in-out group-hover:visible group-hover:opacity-100 group-hover:delay-0`}
          >
            {edgeColorOptions.map((colorOpt) => (
              <Button
                size={"sm"}
                variant="ghost"
                key={colorOpt.name}
                align={"left"}
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
              </Button>
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
