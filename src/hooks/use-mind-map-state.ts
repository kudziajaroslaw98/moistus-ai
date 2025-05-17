import { AppEdge } from "@/types/app-edge";
import { NodeData } from "@/types/node-data";
import {
  Connection,
  EdgeChange,
  Node,
  NodeChange,
  OnEdgesChange,
  OnNodesChange,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect } from "react";

interface UseMindMapStateResult {
  nodes: Node<NodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  onNodesChange: OnNodesChange;
  edges: AppEdge[];
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  onEdgesChange: OnEdgesChange;

  onConnect: (params: Connection) => void;
}

export function useMindMapState(
  initialNodes: Node<NodeData>[] = [],
  initialEdges: AppEdge[] = [],
): UseMindMapStateResult {
  const [nodes, setNodes, onNodesChangeDirect] = useNodesState<Node<NodeData>>(
    initialNodes as Node<NodeData>[],
  );

  const [edges, setEdges, onEdgesChangeDirect] =
    useEdgesState<AppEdge>(initialEdges);

  useEffect(() => {
    if (JSON.stringify(nodes) !== JSON.stringify(initialNodes)) {
      setNodes(initialNodes as Node<NodeData>[]);
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    if (JSON.stringify(edges) !== JSON.stringify(initialEdges)) {
      setEdges(initialEdges as AppEdge[]);
    }
  }, [initialEdges, setEdges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeDirect(changes as NodeChange<Node<NodeData>>[]);
    },
    [onNodesChangeDirect],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeDirect(changes as EdgeChange<AppEdge>[]);
    },
    [onEdgesChangeDirect],
  );

  const onConnect = useCallback((params: Connection) => {
    console.log("onConnect called with:", params);
  }, []);

  return {
    nodes: nodes as Node<NodeData>[],
    setNodes: setNodes as React.Dispatch<
      React.SetStateAction<Node<NodeData>[]>
    >,
    onNodesChange,
    edges: edges as AppEdge[],
    setEdges: setEdges as React.Dispatch<React.SetStateAction<AppEdge[]>>,
    onEdgesChange,
    onConnect,
  };
}
