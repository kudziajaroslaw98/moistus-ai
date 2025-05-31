"use client";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  Edge,
  EdgeMouseHandler,
  Node,
  NodeTypes,
  OnConnectStartParams,
  ReactFlow,
  SelectionMode,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
// Import specific node/edge components only if needed here, otherwise rely on types
import AnnotationNode from "@/components/nodes/annotation-node";
import CodeNode from "@/components/nodes/code-node";
import DefaultNode from "@/components/nodes/default-node";
import GroupNode from "@/components/nodes/group-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TextNode from "@/components/nodes/text-node";

import FloatingEdge from "@/components/edges/floating-edge";
// import SuggestedConnectionEdge from "@/components/edges/suggested-connection-edge";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { useContextMenu } from "@/hooks/use-context-menu";
import type { AppNode } from "@/types/app-node";
import type { EdgeData } from "@/types/edge-data";
import type { NodeData } from "@/types/node-data";
import { useParams } from "next/navigation";
import { useShallow } from "zustand/shallow";
import FloatingConnectionLine from "../edges/floating-connection-line";
import BuilderNode from "../nodes/builder-node";
import TaskNode from "../nodes/task-node";
import { ZoomSlider } from "../ui/zoom-slider";

export function ReactFlowArea() {
  // const {
  //   suggestedEdges,
  //   crudActions,
  // } = useMindMapContext();
  const mapId = useParams().id;
  const reactFlowInstance = useReactFlow();
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);
  const connectingHandleType = useRef<"source" | "target" | null>(null);

  const {
    supabase,
    nodes,
    edges,
    isFocusMode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setReactFlowInstance,
    setNodeInfo,
    setSelectedNodes,
    setPopoverOpen,
    setEdgeInfo,
    setMapId,
    addNode,
    fetchMindMapData,
    deleteNodes,
    isDraggingNodes,
    deleteEdges,
    setIsDraggingNodes,
    initializeComments,
    unsubscribeFromComments,
    getCurrentUser,
    getVisibleEdges,
    getVisibleNodes,
  } = useAppStore(
    useShallow((state) => ({
      supabase: state.supabase,
      nodes: state.nodes,
      edges: state.edges,
      getVisibleEdges: state.getVisibleEdges,
      getVisibleNodes: state.getVisibleNodes,
      isFocusMode: state.isFocusMode,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      setReactFlowInstance: state.setReactFlowInstance,
      setNodeInfo: state.setNodeInfo,
      setSelectedNodes: state.setSelectedNodes,
      setPopoverOpen: state.setPopoverOpen,
      isDraggingNodes: state.isDraggingNodes,
      setEdgeInfo: state.setEdgeInfo,
      setMapId: state.setMapId,
      addNode: state.addNode,
      fetchMindMapData: state.fetchMindMapData,
      deleteNodes: state.deleteNodes,
      deleteEdges: state.deleteEdges,
      setIsDraggingNodes: state.setIsDraggingNodes,
      initializeComments: state.initializeComments,
      unsubscribeFromComments: state.unsubscribeFromComments,
      getCurrentUser: state.getCurrentUser,
    })),
  );

  const { contextMenuHandlers } = useContextMenu();

  useEffect(() => {
    getCurrentUser();

    if (reactFlowInstance) {
      setReactFlowInstance(reactFlowInstance);
    }
  }, [reactFlowInstance, setReactFlowInstance]);

  useEffect(() => {
    if (!mapId || !supabase) return;
    setMapId(mapId as string);
    fetchMindMapData(mapId as string);
    initializeComments(mapId as string);
  }, [fetchMindMapData, mapId, supabase]);

  useEffect(() => {
    return () => {
      unsubscribeFromComments();
    };
  }, []);

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      setNodeInfo(node);
      setPopoverOpen({ nodeEdit: true });
    },
    [],
  );

  const handleEdgeDoubleClick: EdgeMouseHandler<Edge<EdgeData>> = useCallback(
    (_event, edge) => {
      setEdgeInfo(edge);
      setPopoverOpen({ edgeEdit: true });
    },
    [],
  );

  const nodeTypesWithProps: NodeTypes = useMemo(
    () => ({
      defaultNode: DefaultNode,
      questionNode: QuestionNode,
      taskNode: TaskNode,
      imageNode: ImageNode,
      resourceNode: ResourceNode,
      annotationNode: AnnotationNode,
      codeNode: CodeNode,
      groupNode: GroupNode,
      textNode: TextNode,
      builderNode: BuilderNode,
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      // suggestedConnection: SuggestedConnectionEdge,
      editableEdge: FloatingEdge,
      defaultEdge: FloatingEdge,
      floatingEdge: FloatingEdge,
      default: FloatingEdge,
    }),
    [],
  );

  const onConnectStart = useCallback(
    (
      _: MouseEvent | TouchEvent,
      { nodeId, handleId, handleType }: OnConnectStartParams,
    ) => {
      connectingNodeId.current = nodeId;
      connectingHandleId.current = handleId;
      connectingHandleType.current = handleType;
    },
    [],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeId.current || !reactFlowInstance) {
        return;
      }

      const targetIsPane = (event.target as HTMLElement).classList.contains(
        "react-flow__pane",
      );

      if (
        targetIsPane &&
        connectingNodeId.current &&
        connectingHandleType.current === "source"
      ) {
        const clientX =
          "touches" in event
            ? event.touches[0].clientX
            : (event as MouseEvent).clientX;
        const clientY =
          "touches" in event
            ? event.touches[0].clientY
            : (event as MouseEvent).clientY;

        const panePosition = reactFlowInstance.screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        const parentNode = nodes.find(
          (node) => node.id === connectingNodeId.current,
        );

        addNode({
          parentNode: parentNode ?? null,
          position: panePosition,
          data: {},
          content: "New Node",
          nodeType: parentNode?.data?.node_type ?? "defaultNode",
        });
      }

      connectingNodeId.current = null;
      connectingHandleId.current = null;
      connectingHandleType.current = null;
    },
    [reactFlowInstance, addNode, nodes],
  );

  const handleSelectionChange = useCallback(
    ({ nodes }: { nodes: AppNode[] }) => {
      setSelectedNodes(nodes);
    },
    [setSelectedNodes],
  );

  const handleNodeDragStart = useCallback(() => {
    if (!isDraggingNodes) {
      setIsDraggingNodes(true);
    }
  }, [setIsDraggingNodes, isDraggingNodes]);

  const handleNodeDragStop = useCallback(() => {
    // Short delay to ensure drag operation completes before allowing auto-resize
    setTimeout(() => {
      setIsDraggingNodes(false);
    }, 100);
  }, [setIsDraggingNodes]);

  return (
    <ReactFlow
      colorMode="dark"
      multiSelectionKeyCode={["Meta", "Control"]}
      className="bg-zinc-900"
      minZoom={0.1}
      snapToGrid={true}
      nodesDraggable={true}
      nodesConnectable={true}
      selectNodesOnDrag={true}
      selectionOnDrag={true}
      fitView={true}
      nodes={getVisibleNodes()}
      edges={getVisibleEdges()}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onEdgeDoubleClick={handleEdgeDoubleClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onNodesDelete={deleteNodes}
      onEdgesDelete={deleteEdges}
      nodeTypes={nodeTypesWithProps}
      edgeTypes={edgeTypes}
      deleteKeyCode={["Delete"]}
      connectionLineComponent={FloatingConnectionLine}
      onNodeContextMenu={contextMenuHandlers.onNodeContextMenu}
      onPaneContextMenu={contextMenuHandlers.onPaneContextMenu}
      onEdgeContextMenu={contextMenuHandlers.onEdgeContextMenu}
      onPaneClick={contextMenuHandlers.onPaneClick}
      selectionMode={SelectionMode.Partial}
      connectionLineType={ConnectionLineType.Bezier}
      connectionMode={ConnectionMode.Loose}
      onConnect={onConnect}
      onSelectionChange={handleSelectionChange}
      onNodeDragStart={handleNodeDragStart}
      onNodeDragStop={handleNodeDragStop}
    >
      <Controls
        position="top-right"
        orientation="horizontal"
        showZoom={false}
        showFitView={false}
        className={`${isFocusMode ? "!right-12" : ""} cursor-pointer`}
      />

      <ZoomSlider position="top-left" />

      <Background color="#52525c" gap={16} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
