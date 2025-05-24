"use client";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { EdgeData } from "@/types/edge-data";
import type { PathType } from "@/types/path-types";
import {
  GitPullRequestArrow,
  Network,
  NotepadTextDashed,
  Pause,
  Play,
  Plus,
  ScanBarcode,
  ScanText,
  Sparkles,
  Trash,
} from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import ABezierBIcon from "./icons/a-bezier-b";
import ASmoothstepBIcon from "./icons/a-smoothstep-b";
import AStepBIcon from "./icons/a-step-b";
import AStrainghtBIcon from "./icons/a-straight-b";
import { Button } from "./ui/button";
import { OptionList } from "./ui/option-list";
import { Tooltip } from "./ui/Tooltip";

const edgePathTypeOptions: PathType[] = [
  "smoothstep",
  "step",
  "straight",
  "bezier",
];
const edgeColorOptions = [
  { name: "Default", value: undefined },
  { name: "Grey", value: "#888" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Rose", value: "#fb7185" },
];

interface ContextMenuDisplayProps {
  aiActions: {
    summarizeNode: (nodeId: string) => void;
    summarizeBranch: (nodeId: string) => void;
    extractConcepts: (nodeId: string) => void;
    openContentModal: (nodeId: string) => void;
    suggestConnections: () => void;
    suggestMerges: () => void;
    generateFromSelectedNodes?: (
      nodeIds: string[],
      prompt: string,
    ) => Promise<void>;
  };
  // applyLayout: (direction: "TB" | "LR") => void;
  ref?: React.RefObject<HTMLDivElement | null>;
  // setNodeParentAction: (
  //   edgeId: string,
  //   nodeId: string,
  //   parentId: string | null,
  // ) => Promise<void>;
}

export function ContextMenuDisplay({ aiActions }: ContextMenuDisplayProps) {
  const {
    nodes,
    edges,
    updateEdge,
    addNode,
    deleteNodes,
    deleteEdges,
    loadingStates,
    selectedNodes,
    setPopoverOpen,
    popoverOpen,
    reactFlowInstance,
    contextMenuState,
    getEdge,
    setContextMenuState,
  } = useAppStore(
    useShallow((state) => ({
      reactFlowInstance: state.reactFlowInstance,
      nodes: state.nodes,
      edges: state.edges,
      updateEdge: state.updateEdge,
      addNode: state.addNode,
      getEdge: state.getEdge,
      deleteNodes: state.deleteNodes,
      deleteEdges: state.deleteEdges,
      loadingStates: state.loadingStates,
      selectedNodes: state.selectedNodes,
      setPopoverOpen: state.setPopoverOpen,
      popoverOpen: state.popoverOpen,
      contextMenuState: state.contextMenuState,
      setContextMenuState: state.setContextMenuState,
    })),
  );

  const { x, y, nodeId, edgeId } = contextMenuState;
  const clickedNode = useMemo(
    () => (nodeId ? nodes.find((n) => n.id === nodeId) : null),
    [nodeId, nodes],
  );
  const clickedEdge = useMemo(
    () => (edgeId ? getEdge(edgeId) : null),
    [edgeId, getEdge],
  );
  const clickedNodeData = clickedNode?.data;

  const clickedTargetNode = clickedEdge
    ? nodes.find((n) => n.id === clickedEdge.target)
    : null;
  const isCurrentParentLink =
    clickedEdge?.data?.metadata?.isParentLink === true;
  const canBeParentLink =
    clickedEdge &&
    clickedTargetNode &&
    (!clickedTargetNode.data.parent_id ||
      clickedTargetNode.data.parent_id === clickedEdge.source); // Can set as parent if target has no parent or current parent is this edge's source

  const edgeColors = useMemo(() => {
    const isCustomColor =
      clickedEdge?.data?.style?.stroke !== undefined &&
      edgeColorOptions.find(
        (c) => c.value === clickedEdge?.data?.style?.stroke,
      ) === undefined;
    return isCustomColor
      ? [
          ...edgeColorOptions,
          { name: "Custom", value: clickedEdge?.data?.style?.stroke },
        ]
      : edgeColorOptions;
  }, [clickedEdge]);

  const handleCloseContextMenu = () => {
    setPopoverOpen({ contextMenu: false });
    setContextMenuState({
      x: 0,
      y: 0,
      nodeId: null,
      edgeId: null,
    });
  };

  const handleActionClick = (action: () => void, disabled?: boolean) => {
    if (disabled) return;
    action();
    handleCloseContextMenu();
  };

  const getItemIcon = (type: PathType) => {
    switch (type) {
      case "smoothstep":
        return <ASmoothstepBIcon className="size-4 stroke-zinc-200" />;
      case "step":
        return <AStepBIcon className="size-4 stroke-zinc-200" />;
      case "straight":
        return <AStrainghtBIcon className="size-4 stroke-zinc-200" />;
      case "bezier":
        return <ABezierBIcon className="size-4 stroke-zinc-200" />;
      default:
        return <ASmoothstepBIcon className="size-4 stroke-zinc-200" />;
    }
  };

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentNode = nodes.find((n) => n.id === parentId);

      if (!parentNode) return;

      const position = {
        x: parentNode.position.x + (parentNode.width || 170) + 100,
        y: parentNode.position.y + (parentNode.height || 60) / 2 - 30,
      };

      addNode({
        parentNode,
        position,
      });
    },
    [nodes, addNode],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) return;

      deleteNodes([node]);
    },
    [deleteNodes],
  );

  const handleUpdateEdgeStyle = useCallback(
    (edgeId: string, data: Partial<EdgeData>) => {
      const edge = getEdge(edgeId);

      if (!edge) return;

      updateEdge({ edgeId, data: { ...edge.data, ...data } });
    },
    [updateEdge, getEdge],
  );

  const handleEdgesDelete = useCallback(
    (edgeIds: string[]) => {
      const edgesToDelete = edges.filter((e) => edgeIds.includes(e.id));

      if (edgesToDelete.length === 0) return;

      deleteEdges(edgesToDelete);
    },
    [deleteEdges],
  );

  const nodeMenuItems = nodeId ? (
    <>
      <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
        Node
      </span>

      <Button
        variant="ghost"
        align="left"
        onClick={() => handleAddChild(nodeId)}
        className="gap-2"
      >
        <Plus className="size-4" />

        <span>Add Child</span>
      </Button>

      <Button
        variant="ghost-destructive"
        align="left"
        onClick={() => handleDeleteNode(nodeId)}
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
            loadingStates.isStateLoading ||
              loadingStates.isSummarizing ||
              !clickedNodeData?.content,
          )
        }
        disabled={
          loadingStates.isStateLoading ||
          loadingStates.isSummarizing ||
          !clickedNodeData?.content
        }
        className="gap-2"
      >
        <ScanText className="size-4" />

        <span>Summarize Node (AI)</span>
      </Button>

      <Button
        variant="ghost"
        align="left"
        disabled={
          loadingStates.isStateLoading || loadingStates.isSummarizingBranch
        }
        onClick={() =>
          handleActionClick(
            () => aiActions.summarizeBranch(nodeId),
            loadingStates.isStateLoading || loadingStates.isSummarizingBranch,
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
          loadingStates.isStateLoading ||
          loadingStates.isExtracting ||
          !clickedNodeData?.content
        }
        onClick={() =>
          handleActionClick(
            () => aiActions.extractConcepts(nodeId),
            loadingStates.isStateLoading ||
              loadingStates.isExtracting ||
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
          loadingStates.isStateLoading ||
          loadingStates.isGeneratingContent ||
          !clickedNodeData?.content
        }
        onClick={() =>
          handleActionClick(
            () => aiActions.openContentModal(nodeId),
            loadingStates.isStateLoading ||
              loadingStates.isGeneratingContent ||
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

  const paneMenuItems =
    !nodeId && !edgeId ? (
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Node
        </span>

        <Button
          variant="ghost"
          align="left"
          disabled={loadingStates.isStateLoading}
          onClick={() =>
            handleActionClick(() => {
              if (!reactFlowInstance || !contextMenuState) return;
              const flowPosition = reactFlowInstance.screenToFlowPosition({
                x: contextMenuState.x,
                y: contextMenuState.y,
              });
              addNode({ parentNode: null, position: flowPosition });
            }, loadingStates.isStateLoading)
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
            loadingStates.isStateLoading ||
            loadingStates.isSuggestingConnections ||
            nodes.length < 2
          }
          onClick={() =>
            handleActionClick(
              aiActions.suggestConnections,
              loadingStates.isStateLoading ||
                loadingStates.isSuggestingConnections ||
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
            loadingStates.isStateLoading ||
            loadingStates.isSuggestingMerges ||
            nodes.length < 2
          }
          onClick={() =>
            handleActionClick(
              aiActions.suggestMerges,
              loadingStates.isStateLoading ||
                loadingStates.isSuggestingMerges ||
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

        {/* <Button
          variant="ghost"
          align="left"
          disabled={loadingStates.isStateLoading}
          onClick={() =>
            handleActionClick(
              () => applyLayout("TB"),
              loadingStates.isStateLoading,
            )
          }
          className="gap-2"
        >
          <LayoutPanelTop className="size-4" />

          <span>Layout (Top-Bottom)</span>
        </Button> */}

        {/* <Button
          variant="ghost"
          align="left"
          disabled={loadingStates.isStateLoading}
          onClick={() =>
            handleActionClick(
              () => applyLayout("LR"),
              loadingStates.isStateLoading,
            )
          }
          className="gap-2"
        >
          <LayoutPanelLeft className="size-4" />

          <span>Layout (Left-Right)</span>
        </Button> */}
      </>
    ) : null;

  const edgeMenuItems =
    edgeId && clickedEdge ? (
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Edge
        </span>

        <Button
          variant="ghost-destructive"
          align="left"
          disabled={loadingStates.isStateLoading}
          onClick={() =>
            handleActionClick(
              () => handleEdgesDelete([edgeId]),
              loadingStates.isStateLoading,
            )
          }
          className={"gap-2"}
        >
          <Trash className="size-4" />

          <span>Delete Edge</span>
        </Button>

        <Button
          variant="ghost"
          align="left"
          disabled={
            loadingStates.isStateLoading ||
            !canBeParentLink ||
            isCurrentParentLink
          }
          // onClick={() =>
          //   handleActionClick(
          //     () =>
          //       setNodeParentAction(
          //         edgeId,
          //         clickedEdge.target,
          //         clickedEdge.source,
          //       ),
          //     loadingStates.isStateLoading ||
          //       !canBeParentLink ||
          //       isCurrentParentLink,
          //   )
          // }
          className="gap-2"
        >
          <GitPullRequestArrow className="size-4" />

          <span>
            {isCurrentParentLink ? "Is Parent Link" : "Set as Parent Link"}
          </span>
        </Button>

        <hr className="my-1 border-zinc-800" />

        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Edge Style
        </span>

        <Button
          variant="ghost"
          align="left"
          disabled={loadingStates.isStateLoading}
          onClick={() =>
            handleActionClick(
              () =>
                handleUpdateEdgeStyle(edgeId, {
                  animated: !clickedEdge.animated,
                }),
              loadingStates.isStateLoading,
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

        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Path Style
        </span>

        <OptionList
          items={edgePathTypeOptions}
          direction="horizontal"
          gap="gap-2"
          className="w-full"
          initialFocusIdx={edgePathTypeOptions.findIndex(
            (type) => clickedEdge.data?.metadata?.pathType === type,
          )}
          onItemSelect={(_, idx) => {
            const pathType = edgePathTypeOptions[idx];
            handleActionClick(
              () =>
                handleUpdateEdgeStyle(edgeId, {
                  metadata: {
                    ...(clickedEdge.data?.metadata || {}),
                    pathType,
                    isParentLink:
                      clickedEdge.data?.metadata?.isParentLink ?? false,
                  },
                }),
              loadingStates.isStateLoading,
            );
          }}
          renderItem={(pathType, idx, { focused }) => (
            <Tooltip
              content={`${pathType.charAt(0).toUpperCase() + pathType.slice(1)} Path`}
            >
              <Button
                variant={
                  clickedEdge.data?.metadata?.pathType === pathType
                    ? "secondary"
                    : "ghost"
                }
                size="icon"
                tabIndex={-1}
                aria-label={`${pathType} path`}
              >
                {getItemIcon(pathType)}
              </Button>
            </Tooltip>
          )}
        />

        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Color
        </span>

        <OptionList
          items={edgeColors}
          direction="horizontal"
          initialFocusIdx={edgeColors.findIndex(
            (opt) =>
              (clickedEdge?.data?.style?.stroke === opt.value &&
                opt.value !== undefined) ||
              (clickedEdge?.data?.style?.stroke === undefined &&
                opt.value === undefined),
          )}
          onItemSelect={(_, idx) => {
            const colorOpt = edgeColorOptions[idx];
            handleActionClick(
              () =>
                handleUpdateEdgeStyle(edgeId, {
                  style: {
                    ...clickedEdge.style,
                    strokeWidth: clickedEdge.data?.style?.strokeWidth,
                    stroke: colorOpt.value,
                  },
                }),
              loadingStates.isStateLoading,
            );
          }}
          renderItem={(colorOpt, idx, { focused }) => {
            const isSelected =
              (clickedEdge?.data?.style?.stroke === colorOpt.value &&
                colorOpt.value !== undefined) ||
              (clickedEdge?.data?.style?.stroke === undefined &&
                colorOpt.value === undefined);
            return (
              <Tooltip content={colorOpt.name}>
                <Button
                  variant={isSelected ? "secondary" : "ghost"}
                  size="icon"
                  tabIndex={-1}
                  aria-label={colorOpt.name}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-zinc-500"
                    style={{ backgroundColor: colorOpt.value || "transparent" }}
                  ></span>
                </Button>
              </Tooltip>
            );
          }}
        />
      </>
    ) : null;

  // Create a selected nodes menu item if we have selectedNodes and generateFromSelectedNodes function
  const selectedNodesMenuItems =
    !nodeId &&
    !edgeId &&
    selectedNodes &&
    selectedNodes.length > 0 &&
    aiActions.generateFromSelectedNodes &&
    !popoverOpen.generateFromNodesModal ? (
      <>
        <span className="block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500">
          Selected Nodes ({selectedNodes.length})
        </span>

        <Button
          variant="ghost"
          align="left"
          disabled={loadingStates.isGeneratingContent}
          onClick={() =>
            handleActionClick(() => {
              setPopoverOpen({ generateFromNodesModal: true });
            }, loadingStates.isGeneratingContent)
          }
          className="gap-2"
        >
          <Sparkles className="size-4" />

          <span>Generate content from selected nodes</span>
        </Button>

        <hr className="my-1 border-zinc-800" />
      </>
    ) : null;

  return (
    <div
      className="ring-opacity-5 absolute z-[1000] flex min-w-[250px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 px-2 py-2 shadow-lg ring-1 ring-black focus:outline-none"
      style={{ top: y, left: x }}
    >
      {selectedNodesMenuItems}

      {nodeId && nodeMenuItems}

      {edgeId && edgeMenuItems}

      {!nodeId && !edgeId && paneMenuItems}
    </div>
  );
}
