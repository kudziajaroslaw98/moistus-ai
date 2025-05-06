"use client";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  EdgeMouseHandler,
  EdgeTypes,
  Node,
  NodeTypes,
  ReactFlow,
  SelectionMode,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
// Import specific node/edge components only if needed here, otherwise rely on types
import AnnotationNode from "@/components/nodes/annotation-node";
import CodeNode from "@/components/nodes/code-node";
import DefaultNode from "@/components/nodes/default-node";
import GroupNode from "@/components/nodes/group-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";
import TextNode from "@/components/nodes/text-node"; // Import TextNode

import DefaultEdge from "@/components/edges/default-edge";
import EditableEdge from "@/components/edges/editable-edge";
import SuggestedConnectionEdge from "@/components/edges/suggested-connection-edge";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";

export function ReactFlowArea() {
  const {
    nodes,
    edges,
    suggestedEdges,
    contextMenuHandlers,
    setReactFlowInstance,
    crudActions, // Get specific actions needed like addEdge, saveEdgeProperties
    setIsNodeEditModalOpen,
    setNodeToEdit,
    setIsEdgeEditModalOpen,
    setEdgeToEdit,
    onNodesChange,
    onEdgesChange,
  } = useMindMapContext();
  const reactFlowInstance = useReactFlow();

  // Store the instance in context once it's available
  useEffect(() => {
    if (reactFlowInstance) {
      setReactFlowInstance(reactFlowInstance);
    }
    // Cleanup function might be needed if instance changes
    // return () => setReactFlowInstance(null);
  }, [reactFlowInstance, setReactFlowInstance]);

  const allEdges = useMemo(
    () => [...edges, ...suggestedEdges],
    [edges, suggestedEdges],
  );

  const handleNodeDoubleClick = (
    event: React.MouseEvent,
    node: Node<NodeData>,
  ) => {
    setNodeToEdit(node);
    setIsNodeEditModalOpen(true);
  };

  const handleEdgeDoubleClick: EdgeMouseHandler<Edge<Partial<EdgeData>>> = (
    _event,
    edge,
  ) => {
    setEdgeToEdit(edge as AppEdge);
    setIsEdgeEditModalOpen(true);
  };

  // You might need specific logic from the original onEditNode callback here
  // For now, this basic implementation opens the modal.
  const handleOpenNodeEdit = useCallback(
    (nodeId: string, nodeData: NodeData) => {
      if (nodeData) {
        setNodeToEdit(nodeData as unknown as Node<NodeData>);
        setIsNodeEditModalOpen(true);
      }
    },
    [setNodeToEdit, setIsNodeEditModalOpen],
  );

  // Define nodeTypesWithProps inside the component or memoize if needed
  const nodeTypesWithProps: NodeTypes = useMemo(
    () => ({
      defaultNode: (props) => (
        <DefaultNode {...props} onEditNode={handleOpenNodeEdit} />
      ),
      questionNode: (props) => (
        <QuestionNode {...props} onEditNode={handleOpenNodeEdit} />
      ),
      taskNode: (props) => (
        <TaskNode
          {...props}
          onEditNode={handleOpenNodeEdit}
          saveNodeProperties={crudActions.saveNodeProperties}
        />
      ),
      imageNode: (props) => (
        <ImageNode {...props} onEditNode={handleOpenNodeEdit} />
      ),
      resourceNode: (props) => (
        <ResourceNode {...props} onEditNode={handleOpenNodeEdit} />
      ),
      annotationNode: (props) => (
        <AnnotationNode {...props} onEditNode={handleOpenNodeEdit} />
      ),
      codeNode: (props) => (
        <CodeNode {...props} onEditNode={handleOpenNodeEdit} />
      ),
      groupNode: (props) => (
        <GroupNode {...props} onEditNode={handleOpenNodeEdit} />
      ), // Assuming GroupNode also needs edit
      textNode: (props) => (
        <TextNode {...props} onEditNode={handleOpenNodeEdit} />
      ), // Add TextNode
    }),
    [handleOpenNodeEdit], // Dependency array includes the callback
  );

  const edgeTypesWithProps: EdgeTypes = useMemo(
    () => ({
      suggestedConnection: (edgeProps) => (
        <SuggestedConnectionEdge {...edgeProps} /> // Needs modification to use context/callbacks
      ),
      editableEdge: (edgeProps) => <EditableEdge {...edgeProps} />,
      defaultEdge: (edgeProps) => <DefaultEdge {...edgeProps} />,
    }),
    [], // Dependencies might be needed if callbacks change
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={allEdges}
      onNodesChange={onNodesChange} // Use action from context
      onEdgesChange={onEdgesChange} // Use action from context
      onConnect={(params) =>
        crudActions.addEdge(params.source!, params.target!)
      } // Use action
      onNodeContextMenu={contextMenuHandlers.onNodeContextMenu}
      onPaneContextMenu={contextMenuHandlers.onPaneContextMenu}
      onEdgeContextMenu={contextMenuHandlers.onEdgeContextMenu}
      onEdgeDoubleClick={handleEdgeDoubleClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onPaneClick={contextMenuHandlers.onPaneClick}
      nodeTypes={nodeTypesWithProps}
      edgeTypes={edgeTypesWithProps}
      snapToGrid={true}
      edgesReconnectable={true}
      nodesDraggable={true} // Or get from context if needed
      nodesConnectable={true} // Or get from context if needed
      fitView
      colorMode="dark"
      multiSelectionKeyCode={["Meta", "Control"]}
      selectionMode={SelectionMode.Partial}
      selectNodesOnDrag={true}
      selectionOnDrag={true}
      className="bg-zinc-900" // Ensure canvas bg is set
    >
      <Controls />

      <Background color="#52525c" gap={16} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
