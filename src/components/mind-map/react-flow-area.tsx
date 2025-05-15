"use client";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  Edge,
  EdgeMouseHandler,
  MarkerType,
  Node,
  OnConnectStartParams,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
// Import specific node/edge components only if needed here, otherwise rely on types
import AnnotationNode from "@/components/nodes/annotation-node";
import CodeNode from "@/components/nodes/code-node";
import DefaultNode from "@/components/nodes/default-node";
import GroupNode from "@/components/nodes/group-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";
import TextNode from "@/components/nodes/text-node";

import FloatingEdge from "@/components/edges/floating-edge";
import SuggestedConnectionEdge from "@/components/edges/suggested-connection-edge";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import FloatingConnectionLine from "../edges/floating-connection-line";

const edgeTypes = {
  suggestedConnection: SuggestedConnectionEdge,
  editableEdge: FloatingEdge,
  defaultEdge: FloatingEdge,
  floatingEdge: FloatingEdge,
};

const defaultEdgeOptions = {
  type: "floatingEdge",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#b1b1b7",
  },
};

const nodeTypesWithProps = {
  defaultNode: DefaultNode,
  questionNode: QuestionNode,
  taskNode: TaskNode,
  imageNode: ImageNode,
  resourceNode: ResourceNode,
  annotationNode: AnnotationNode,
  codeNode: CodeNode,
  groupNode: GroupNode,
  textNode: TextNode,
};

export function ReactFlowArea() {
  const {
    nodes,
    edges,
    contextMenuHandlers,
    setReactFlowInstance,
    crudActions,
    setIsNodeEditModalOpen,
    setNodeToEdit,
    setIsEdgeEditModalOpen,
    setEdgeToEdit,
    onNodesChange,
    onEdgesChange,
  } = useMindMapContext();
  const reactFlowInstance = useReactFlow();
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleId = useRef<string | null>(null);
  const connectingHandleType = useRef<"source" | "target" | null>(null);

  useEffect(() => {
    if (reactFlowInstance) {
      setReactFlowInstance(reactFlowInstance);
    }
  }, [reactFlowInstance, setReactFlowInstance]);

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      setNodeToEdit(node.data);
      setIsNodeEditModalOpen(true);
    },
    [setNodeToEdit, setIsNodeEditModalOpen],
  );

  const handleEdgeDoubleClick: EdgeMouseHandler<Edge<Partial<EdgeData>>> =
    useCallback(
      (_event, edge) => {
        setEdgeToEdit(edge as AppEdge);
        setIsEdgeEditModalOpen(true);
      },
      [setEdgeToEdit, setIsEdgeEditModalOpen],
    );

  const handleOpenNodeEdit = useCallback(
    (nodeId: string, nodeData: NodeData) => {
      if (nodeData) {
        setNodeToEdit(nodeData);
        setIsNodeEditModalOpen(true);
      }
    },
    [setNodeToEdit, setIsNodeEditModalOpen],
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

        crudActions.addNode(
          connectingNodeId.current,
          "New Node",
          "defaultNode",
          panePosition,
        );
      }

      connectingNodeId.current = null;
      connectingHandleId.current = null;
      connectingHandleType.current = null;
    },
    [reactFlowInstance, crudActions],
  );

  const handleOnConnect = useCallback(
    (params: Connection) => crudActions.addEdge(params.source!, params.target!),
    [crudActions.addEdge],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleOnConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onNodeContextMenu={contextMenuHandlers.onNodeContextMenu}
      onPaneContextMenu={contextMenuHandlers.onPaneContextMenu}
      onEdgeContextMenu={contextMenuHandlers.onEdgeContextMenu}
      onEdgeDoubleClick={handleEdgeDoubleClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onPaneClick={contextMenuHandlers.onPaneClick}
      nodeTypes={nodeTypesWithProps}
      edgeTypes={edgeTypes}
      snapToGrid={true}
      nodesDraggable={true}
      nodesConnectable={true}
      fitView
      colorMode="dark"
      multiSelectionKeyCode={["Meta", "Control"]}
      selectionMode={SelectionMode.Partial}
      selectNodesOnDrag={true}
      selectionOnDrag={true}
      connectionLineComponent={FloatingConnectionLine}
      connectionLineType={ConnectionLineType.Bezier}
      connectionMode={ConnectionMode.Loose}
      className="bg-zinc-900"
      defaultEdgeOptions={defaultEdgeOptions}
    >
      <Controls />

      <Background color="#52525c" gap={16} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
