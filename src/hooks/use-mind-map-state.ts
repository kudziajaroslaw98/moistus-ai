import { useCallback, useEffect } from "react";
import {
  Node,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  Connection,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import { NodeData } from "@/types/node-data";
import { AppEdge } from "@/types/app-edge";

interface UseMindMapStateResult {
  nodes: Node<NodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  onNodesChange: OnNodesChange;
  edges: AppEdge[]; // Use AppEdge
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>; // Use AppEdge
  onEdgesChange: OnEdgesChange;
  // onConnect now needs to return the edge added (locally and in DB)
  onConnect: (params: Connection) => void; // Or return Promise<void> if async
}

export function useMindMapState(
  initialNodes: Node<NodeData>[] = [],
  initialEdges: AppEdge[] = [],
  // addEdgeCrud: UseMindMapStateProps['addEdgeCrud'] // Accept the CRUD function
): UseMindMapStateResult {
  // Initialize useNodesState with the data type expected in the Node's data property
  const [nodes, setNodes, onNodesChangeDirect] = useNodesState<Node<NodeData>>(
    initialNodes as Node<NodeData>[], // Assert type if needed
  );
  // Initialize useEdgesState with the AppEdge type
  const [edges, setEdges, onEdgesChangeDirect] =
    useEdgesState<AppEdge>(initialEdges); // Use AppEdge here

  // Sync state when initial data changes (e.g., on map load)
  useEffect(() => {
    // Deep comparison check to prevent infinite loops if initial data objects change identity but not content
    if (JSON.stringify(nodes) !== JSON.stringify(initialNodes)) {
      setNodes(initialNodes as Node<NodeData>[]);
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    // Deep comparison check
    if (JSON.stringify(edges) !== JSON.stringify(initialEdges)) {
      setEdges(initialEdges as AppEdge[]);
    }
  }, [initialEdges, setEdges]);

  // onNodesChange wrapper - pass the correct type
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeDirect(changes as NodeChange<Node<NodeData>>[]); // Assert type if necessary
    },
    [onNodesChangeDirect],
  );

  // onEdgesChange wrapper - pass the correct type
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Note: Deletion changes handled in React Flow, then CRUD hook persists
      onEdgesChangeDirect(changes as EdgeChange<AppEdge>[]); // Assert type
    },
    [onEdgesChangeDirect],
  );

  // onConnect wrapper - This is where a new edge is created by user interaction
  // This needs to call the addEdge CRUD action to save to DB and update local state
  const onConnect = useCallback(
    // React Flow's onConnect provides a Connection object, not a full Edge object
    (params: Connection) => {
      // The actual saving and local state update will be handled by the CRUD hook
      // called in the parent component (MindMapCanvas)
      // This function primarily passes the connection info up.
      console.log("onConnect called with:", params);
      // We don't add the edge to local state directly here anymore
      // The parent component will call the addEdge CRUD action which updates state
    },
    [], // No dependencies needed here as it just passes params up
  );

  return {
    nodes: nodes as Node<NodeData>[], // Assert type on return if needed
    setNodes: setNodes as React.Dispatch<
      React.SetStateAction<Node<NodeData>[]>
    >, // Assert type
    onNodesChange,
    edges: edges as AppEdge[], // Assert type
    setEdges: setEdges as React.Dispatch<React.SetStateAction<AppEdge[]>>, // Assert type
    onEdgesChange,
    onConnect, // Return the wrapped handler
  };
}
