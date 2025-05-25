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
import SuggestedConnectionEdge from "@/components/edges/suggested-connection-edge";
import type { AppNode } from "@/contexts/mind-map/app-state";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { useContextMenu } from "@/hooks/use-context-menu";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { useParams } from "next/navigation";
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

  const supabase = useAppStore((state) => state.supabase);

  const allNodes = useAppStore((state) => state.nodes);
  const allEdges = useAppStore((state) => state.edges);
  const getVisibleNodes = useAppStore((state) => state.getVisibleNodes);
  const getVisibleEdges = useAppStore((state) => state.getVisibleEdges);
  
  // Use visible nodes and edges for rendering (filtered for collapsed branches)
  const nodes = getVisibleNodes();
  const edges = getVisibleEdges();
  const isFocusMode = useAppStore((state) => state.isFocusMode);
  const onNodesChange = useAppStore((state) => state.onNodesChange);
  const onEdgesChange = useAppStore((state) => state.onEdgesChange);
  const onConnect = useAppStore((state) => state.onConnect);
  const setReactFlowInstance = useAppStore(
    (state) => state.setReactFlowInstance,
  );
  const setNodeInfo = useAppStore((state) => state.setNodeInfo);
  const setSelectedNodes = useAppStore((state) => state.setSelectedNodes);
  const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
  const setEdgeInfo = useAppStore((state) => state.setEdgeInfo);
  const setMapId = useAppStore((state) => state.setMapId);
  const addNode = useAppStore((state) => state.addNode);
  const updateNode = useAppStore((state) => state.updateNode);
  const fetchMindMapData = useAppStore((state) => state.fetchMindMapData);
  const deleteNodes = useAppStore((state) => state.deleteNodes);
  const deleteEdges = useAppStore((state) => state.deleteEdges);
  const setIsDraggingNodes = useAppStore((state) => state.setIsDraggingNodes);

  const { contextMenuHandlers } = useContextMenu();

  useEffect(() => {
    if (reactFlowInstance) {
      setReactFlowInstance(reactFlowInstance);
    }
  }, [reactFlowInstance, setReactFlowInstance]);

  useEffect(() => {
    if (!mapId || !supabase) return;
    setMapId(mapId as string);
    fetchMindMapData(mapId as string);
  }, [fetchMindMapData, mapId, supabase]);

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

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<NodeData>) => {
      return updateNode({ nodeId: nodeId, data: data });
    },
    [],
  );

  const nodeTypesWithProps: NodeTypes = useMemo(
    () => ({
      defaultNode: (props) => <DefaultNode {...props} />,
      questionNode: (props) => <QuestionNode {...props} />,
      taskNode: (props) => (
        <TaskNode {...props} saveNodeProperties={handleUpdateNode} />
      ),
      imageNode: (props) => <ImageNode {...props} />,
      resourceNode: (props) => <ResourceNode {...props} />,
      annotationNode: (props) => <AnnotationNode {...props} />,
      codeNode: (props) => <CodeNode {...props} />,
      groupNode: (props) => <GroupNode {...props} />,
      textNode: (props) => <TextNode {...props} />,
      builderNode: (props) => <BuilderNode {...props} />,
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      suggestedConnection: SuggestedConnectionEdge,
      editableEdge: FloatingEdge,
      defaultEdge: FloatingEdge,
      floatingEdge: FloatingEdge,
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

        const parentNode = allNodes.find(
          (node) => node.id === connectingNodeId.current,
        );

        addNode({
          parentNode: parentNode ?? null,
          position: panePosition,
          data: {},
          content: "New Node",
          nodeType: "defaultNode",
        });
      }

      connectingNodeId.current = null;
      connectingHandleId.current = null;
      connectingHandleType.current = null;
    },
    [reactFlowInstance, addNode, allNodes],
  );

  const handleSelectionChange = useCallback(
    ({ nodes }: { nodes: AppNode[] }) => {
      setSelectedNodes(nodes);
    },
    [setSelectedNodes],
  );

  const handleNodeDragStart = useCallback(() => {
    setIsDraggingNodes(true);
  }, [setIsDraggingNodes]);

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
      nodes={nodes}
      edges={edges}
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
