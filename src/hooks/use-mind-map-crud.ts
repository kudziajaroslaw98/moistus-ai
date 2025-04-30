import { useState, useCallback } from "react";
import {
  Node,
  NodeChange,
  XYPosition,
  EdgeChange,
  getIncomers,
} from "@xyflow/react"; // Import necessary functions
import { createClient } from "@/helpers/supabase/client";
import uuid from "@/helpers/uuid";
import { NodeData } from "@/types/node-data";
import { EdgeData } from "@/types/edge-data"; // Use AppEdge and EdgeData
import { NotificationType } from "@/hooks/use-notifications";
import { deleteNodeAndDescendants } from "@/helpers/delete-node-and-descendants";
import { SupabaseClient } from "@supabase/supabase-js"; // Import type
import { nodeTypes } from "@/constants/node-types"; // Import node types to check validity
import { AppEdge } from "@/types/app-edge";

interface UseMindMapCRUDProps {
  mapId: string;
  nodes: Node<NodeData>[];
  edges: AppEdge[]; // Accept AppEdge[]
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>; // Use AppEdge[]
  addStateToHistory: (sourceAction?: string) => void;
  showNotification: (message: string, type: NotificationType) => void;
}

interface CrudActions {
  addNode: (
    parentNodeId?: string | null,
    content?: string,
    nodeType?: string,
    position?: XYPosition,
    metadata?: Record<string, unknown> | null,
    initialStyle?: {
      backgroundColor?: string;
      borderColor?: string;
      color?: string;
    },
  ) => Promise<Node<NodeData> | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  saveNodePosition: (nodeId: string, position: XYPosition) => Promise<void>;
  saveNodeContent: (nodeId: string, content: string) => Promise<void>;
  saveNodeStyle: (nodeId: string, style: Partial<NodeData>) => Promise<void>;
  // Rework edge saving:
  addEdge: (sourceId: string, targetId: string) => Promise<AppEdge | null>;
  saveEdgeStyle: (
    edgeId: string,
    styleChanges: Partial<EdgeData>,
  ) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>; // Delete edge via onEdgesDelete or modal
  saveEdgeProperties: (
    edgeId: string,
    changes: Partial<EdgeData>,
  ) => Promise<void>; // Save from modal
  handleNodeChanges: (
    changes: NodeChange[],
    currentNodes: Node<NodeData>[],
  ) => void;
  handleEdgeChanges: (
    changes: EdgeChange[],
    currentEdges: AppEdge[], // Use AppEdge[]
    currentNodes: Node<NodeData>[], // Needed for edge deletion context
  ) => void;
}

interface UseMindMapCRUDResult {
  crudActions: CrudActions;
  isLoading: boolean;
}

export function useMindMapCRUD({
  mapId,
  nodes,
  edges, // Receive edges
  setNodes,
  setEdges, // Use AppEdge[]
  addStateToHistory,
  showNotification,
}: UseMindMapCRUDProps): UseMindMapCRUDResult {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // --- Helper: Get default style for node type ---

  // --- Helper: Get default properties for edge type (if needed) ---
  const getDefaultEdgePropertiesForType = (type: string) => {
    // Currently edge type names match React Flow types, but could customize here
    return {
      animated: type === "smoothstep" ? false : true, // Default to false for all
      style: { stroke: "#6c757d", strokeWidth: 2 }, // Default color
      label: undefined,
      color: "#6c757d",
    };
  };

  // --- ADD NODE ---
  const addNode = useCallback(
    async (
      parentNodeId: string | null = null,
      content: string = "New Node",
      nodeType: string = "editableNode", // Default node type
      position?: XYPosition,
      metadata: Record<string, unknown> | null = null,
    ): Promise<Node<NodeData> | null> => {
      if (!mapId) {
        showNotification("Cannot add node: Map ID missing.", "error");
        return null;
      }
      // Validate nodeType
      if (!nodeTypes[nodeType as keyof typeof nodeTypes]) {
        console.warn(
          `Attempted to add node with unknown type: ${nodeType}. Falling back to 'editableNode'.`,
        );
        nodeType = "editableNode"; // Fallback to default if type is invalid
      }

      setIsLoading(true); // Combined loading for node + edge creation
      let newNodeReactFlowNode: Node<NodeData> | null = null;
      let newEdgeReactFlowEdge: AppEdge | null = null;

      try {
        // Determine position
        let newNodePosition = position;
        if (!newNodePosition) {
          if (parentNodeId) {
            const parentNode = nodes.find((n) => n.id === parentNodeId);
            if (parentNode) {
              // Calculate child position relative to parent
              newNodePosition = {
                x: parentNode.position.x + (parentNode.width || 170) + 100, // Offset to the right
                y: parentNode.position.y + (parentNode.height || 60) / 2 - 30, // Align vertically
              };
            } else {
              // Fallback if parent not found (shouldn't happen if parentNodeId exists)
              newNodePosition = {
                x: Math.random() * 400 + 50,
                y: Math.random() * 400 + 50,
              };
            }
          } else {
            // Position for a new root node
            const existingRootNodes = nodes.filter(
              (n) => getIncomers(n, nodes, edges).length === 0,
            ); // Check for nodes with no incoming edges
            newNodePosition = {
              x: 250 + existingRootNodes.length * 200, // Offset new roots horizontally
              y: 100,
            };
          }
        }

        const newNodeId = uuid();
        const user = await supabase.auth.getUser();
        if (!user.data.user) throw new Error("User not authenticated.");

        // --- Save Node to DB ---
        const newNodeDbData: Omit<NodeData, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        } = {
          id: newNodeId,
          user_id: user.data.user.id,
          map_id: mapId,
          // parent_id is REMOVED from nodes table in this new model
          content: content,
          position_x: newNodePosition.x,
          position_y: newNodePosition.y,
          node_type: nodeType, // Save the selected node type
          metadata: metadata as any,
        };

        const { data: insertedNodeData, error: nodeInsertError } =
          await supabase
            .from("nodes")
            .insert([newNodeDbData])
            .select()
            .single();

        if (nodeInsertError || !insertedNodeData) {
          throw new Error(
            nodeInsertError?.message || "Failed to save new node to database.",
          );
        }

        const finalNodeData: NodeData = insertedNodeData as NodeData;

        newNodeReactFlowNode = {
          id: finalNodeData.id,
          position: {
            x: finalNodeData.position_x,
            y: finalNodeData.position_y,
          },
          data: { ...finalNodeData, label: finalNodeData.content },
          type: finalNodeData.node_type || "editableNode", // Ensure React Flow uses the correct component type
          // Style applied here for React Flow renderer
        };

        // --- Add Edge to DB if there's a parent ---
        if (parentNodeId) {
          const newEdgeId = uuid();
          const defaultEdgeProps =
            getDefaultEdgePropertiesForType("editableEdge"); // Get default edge properties
          const user_id = (await supabase.auth.getUser()).data.user?.id;

          const newEdgeDbData: Omit<EdgeData, "created_at" | "updated_at"> & {
            created_at?: string;
            updated_at?: string;
          } = {
            id: newEdgeId,
            map_id: mapId,
            source: parentNodeId,
            target: newNodeId,
            user_id,
            type: "editableEdge", // Default type for new connections
            label: defaultEdgeProps.label,
            color: defaultEdgeProps.color,
            animated: defaultEdgeProps.animated,
            style: defaultEdgeProps.style,
            // Add other edge properties here if needed
          };

          const { data: insertedEdgeData, error: edgeInsertError } =
            await supabase
              .from("edges")
              .insert([newEdgeDbData])
              .select()
              .single();

          if (edgeInsertError || !insertedEdgeData) {
            // Log error but don't prevent node creation success
            console.error(
              "Warning: Failed to save new edge to database:",
              edgeInsertError,
            );
            showNotification(
              "Warning: Node created, but connection failed to save.",
              "error",
            );
          } else {
            const finalEdgeData: EdgeData = insertedEdgeData as EdgeData;
            newEdgeReactFlowEdge = {
              id: finalEdgeData.id,
              source: finalEdgeData.source,
              target: finalEdgeData.target,
              user_id: user_id || "",
              type: finalEdgeData.type || "editableEdge",
              animated: finalEdgeData.animated ?? false,
              label: finalEdgeData.label,
              style: finalEdgeData.style || {
                stroke: finalEdgeData.color || "#6c757d",
                strokeWidth: 2,
              },
              data: finalEdgeData,
            };
            setEdges((eds) => [...eds, newEdgeReactFlowEdge!]);
          }
        }

        setNodes((nds) => [...nds, newNodeReactFlowNode!]); // Add node to local state regardless of edge save success

        addStateToHistory("addNode"); // History captures both node and edge state if edge saved
        showNotification("Node added.", "success");
        return newNodeReactFlowNode;
      } catch (err: unknown) {
        console.error("Error adding node:", err);
        const message =
          err instanceof Error ? err.message : "Failed to add node.";
        showNotification(message, "error");
        // TODO: If node saved but edge failed, we should probably clean up the node in DB?
        // Or handle this inconsistency on data load?
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      mapId,
      nodes,
      edges, // Need edges to find root nodes
      supabase,
      setNodes,
      setEdges,
      addStateToHistory,
      showNotification,
    ],
  );

  // --- DELETE NODE ---
  const deleteNode = useCallback(
    async (nodeId: string) => {
      if (!mapId || !nodeId) return;

      const nodeToDelete = nodes.find((node) => node.id === nodeId);
      if (!nodeToDelete) return;

      // Check if deleting the last remaining node
      if (nodes.length === 1 && nodes[0].id === nodeId) {
        // Allow deleting the absolute last node
        // Proceed with deletion
      } else {
        // Check if deleting a root node (node with no incoming edges) when it's the last root
        const incomers = getIncomers(nodeToDelete, nodes, edges);
        const isRoot = incomers.length === 0;
        const rootNodes = nodes.filter(
          (n) => getIncomers(n, nodes, edges).length === 0,
        );
        if (isRoot && rootNodes.length <= 1) {
          showNotification("Cannot delete the last root node.", "error");
          return;
        }
      }

      setIsLoading(true);
      try {
        // Pass supabase client to the helper function
        // This relies on ON DELETE CASCADE on nodes table in the edges table definition
        await deleteNodeAndDescendants(nodeId, supabase as SupabaseClient); // Assert type

        // Optimistically remove node and associated edges (both source and target)
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) =>
          eds.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId,
          ),
        );

        addStateToHistory("deleteNode");
        showNotification("Node(s) deleted.", "success");
      } catch (err: unknown) {
        // Use unknown
        console.error("Error deleting node:", err);
        const message =
          err instanceof Error ? err.message : "Failed to delete node(s).";
        showNotification(message, "error");
        // TODO: Revert local state on failure
      } finally {
        setIsLoading(false);
      }
    },
    [
      mapId,
      nodes,
      edges, // Need edges to check root status
      supabase,
      setNodes,
      setEdges,
      addStateToHistory,
      showNotification,
    ],
  );

  // --- SAVE NODE POSITION ---
  const saveNodePosition = useCallback(
    async (nodeId: string, position: XYPosition) => {
      // No need to set loading here if this is called async from handleNodeChanges
      try {
        const { error } = await supabase
          .from("nodes")
          .update({
            position_x: position.x,
            position_y: position.y,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);
        if (error) throw error;
        // No need to update local state here, as react-flow's onNodesChange handles it
      } catch (err: unknown) {
        console.error(`Error saving position for node ${nodeId}:`, err);
        // Optionally show a less intrusive warning
      }
    },
    [supabase],
  );

  // --- SAVE NODE CONTENT ---
  // This is now triggered by BaseEditableNode's onBlur,
  // which also updates local React Flow state.
  const saveNodeContent = useCallback(
    async (nodeId: string, content: string) => {
      // No need to set loading here if this is called async from BaseEditableNode
      try {
        const trimmedContent = content.trim();
        const { error } = await supabase
          .from("nodes")
          .update({
            content: trimmedContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);
        if (error) throw error;
        // Local state update is handled by BaseEditableNode before this async call finishes.
        // History state management should be in the parent (MindMapCanvas).
      } catch (err: unknown) {
        console.error(`Error saving content for node ${nodeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save content for node ${nodeId}.`;
        showNotification(message, "error");
        // TODO: Revert node content locally on save failure
      }
    },
    [supabase, showNotification],
  );

  // --- SAVE NODE STYLE (including type and metadata) ---
  const saveNodeStyle = useCallback(
    async (nodeId: string, styleChanges: Partial<NodeData>) => {
      const validUpdates: Partial<NodeData> = {};
      // Include metadata and node_type if they are in the changes
      if (styleChanges.metadata !== undefined)
        validUpdates.metadata = styleChanges.metadata;
      if (styleChanges.node_type !== undefined)
        validUpdates.node_type = styleChanges.node_type; // Allow changing node type

      if (Object.keys(validUpdates).length === 0) return;

      setIsLoading(true); // Indicate that a save operation is ongoing
      try {
        const { error } = await supabase
          .from("nodes")
          .update({
            ...validUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);
        if (error) throw error;

        // Update local state
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: { ...n.data, ...validUpdates }, // Update data properties
                  // Update React Flow style object if these properties affect appearance
                  // React Flow node 'style' is for basic CSS; more complex should use data
                  type: validUpdates.node_type ?? n.type, // Update type in React Flow state
                }
              : n,
          ),
        );

        addStateToHistory("saveNodeStyle");
        // showNotification("Style saved.", "success"); // Might be too chatty
      } catch (err: unknown) {
        console.error(`Error saving style for node ${nodeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save style for node ${nodeId}.`;
        showNotification(message, "error");
        // TODO: Revert style locally on save failure
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setNodes, addStateToHistory, showNotification],
  );

  const saveEdgeStyle = useCallback(
    async (edgeId: string, styleChanges: Partial<EdgeData>) => {
      // Filter valid style updates based on EdgeData and table columns
      const validStyleUpdates: { [key: string]: any } = {};
      if (styleChanges.label !== undefined)
        validStyleUpdates.label = styleChanges.label;
      if (styleChanges.type !== undefined)
        validStyleUpdates.type = styleChanges.type;
      if (styleChanges.animated !== undefined)
        validStyleUpdates.animated = styleChanges.animated;
      if (styleChanges.color !== undefined)
        validStyleUpdates.color = styleChanges.color;
      if (styleChanges.strokeWidth !== undefined)
        validStyleUpdates.strokeWidth = styleChanges.strokeWidth;
      if (styleChanges.metadata !== undefined)
        validStyleUpdates.metadata = styleChanges.metadata;
      // Add other fields like markerEnd if you manage them in DB

      if (Object.keys(validStyleUpdates).length === 0) {
        // console.warn("saveEdgeStyle called with no valid changes.");
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase
          .from("edges")
          .update({
            ...validStyleUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", edgeId);
        if (error) throw error;

        // --- Update local state (React Flow Edges) ---
        setEdges((eds) =>
          eds.map((edge) => {
            if (edge.id === edgeId) {
              // Merge the changes into the existing edge data and style
              return {
                ...edge,
                type: validStyleUpdates.type ?? edge.type,
                label: validStyleUpdates.label ?? edge.label,
                animated: validStyleUpdates.animated ?? edge.animated,
                style: {
                  ...edge.style,
                  stroke: validStyleUpdates.color ?? edge.style?.stroke,
                  strokeWidth:
                    validStyleUpdates.strokeWidth ?? edge.style?.strokeWidth,
                },
                data: {
                  ...edge.data,
                  ...(validStyleUpdates.metadata
                    ? { metadata: validStyleUpdates.metadata }
                    : {}),
                  // Update specific data fields if needed based on styleChanges
                  label: validStyleUpdates.label ?? edge.data?.label,
                  type: validStyleUpdates.type ?? edge.data?.type,
                  animated: validStyleUpdates.animated ?? edge.data?.animated,
                  color: validStyleUpdates.color ?? edge.data?.color,
                  strokeWidth:
                    validStyleUpdates.strokeWidth ?? edge.data?.strokeWidth,
                },
                // markerEnd: validStyleUpdates.markerEnd ?? edge.markerEnd, // Example if managing markerEnd
              };
            }
            return edge;
          }),
        );
        // ---------------------------------------------

        addStateToHistory("saveEdgeStyle");
        // showNotification("Edge style saved.", "success"); // Optional: Less chatty might be better
      } catch (err: unknown) {
        console.error(`Error saving style for edge ${edgeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save style for edge ${edgeId}.`;
        showNotification(message, "error");
        // TODO: Revert edge style locally on save failure
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setEdges, addStateToHistory, showNotification], // Add setEdges dependency
  );

  // --- ADD EDGE (onConnect handler) ---
  const addEdge = useCallback(
    async (sourceId: string, targetId: string): Promise<AppEdge | null> => {
      if (!mapId) {
        showNotification("Cannot add connection: Map ID missing.", "error");
        return null;
      }
      // Prevent connecting a node to itself
      if (sourceId === targetId) {
        showNotification("Cannot connect a node to itself.", "error");
        return null;
      }
      // Prevent creating a duplicate edge between the same source and target
      const existingEdge = edges.find(
        (e) => e.source === sourceId && e.target === targetId,
      );
      if (existingEdge) {
        showNotification("Connection already exists.", "error");
        return null;
      }

      setIsLoading(true); // Indicate saving
      let newReactFlowEdge: AppEdge | null = null;
      try {
        const newEdgeId = uuid();
        const defaultEdgeProps =
          getDefaultEdgePropertiesForType("editableEdge"); // Get default properties

        const newEdgeDbData: Omit<EdgeData, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        } = {
          id: newEdgeId,
          map_id: mapId,
          user_id: (await supabase.auth.getUser()).data.user?.id || "",
          source: sourceId,
          target: targetId,
          type: "editableEdge", // Default type for new user-drawn connections
          label: defaultEdgeProps.label,
          color: defaultEdgeProps.color,
          animated: defaultEdgeProps.animated,
          style: defaultEdgeProps.style,
        };

        const { data: insertedEdgeData, error } = await supabase
          .from("edges")
          .insert([newEdgeDbData])
          .select()
          .single();

        if (error || !insertedEdgeData) {
          throw new Error(
            error?.message || "Failed to save new connection to database.",
          );
        }

        const finalEdgeData: EdgeData = insertedEdgeData as EdgeData;

        newReactFlowEdge = {
          id: finalEdgeData.id,
          source: finalEdgeData.source,
          target: finalEdgeData.target,
          type: finalEdgeData.type || "editableEdge",
          animated: finalEdgeData.animated ?? false,
          label: finalEdgeData.label,
          style: finalEdgeData.style || {
            stroke: finalEdgeData.color || "#6c757d",
            strokeWidth: 2,
          },
          data: finalEdgeData,
        };

        // Add edge to local state
        setEdges((eds) => [...eds, newReactFlowEdge!]);

        addStateToHistory("addEdge"); // History captures new edge state
        showNotification("Connection saved.", "success");
        return newReactFlowEdge;
      } catch (err: unknown) {
        console.error(`Error saving connection ${sourceId}->${targetId}:`, err);
        const message =
          err instanceof Error ? err.message : "Failed to save connection.";
        showNotification(message, "error");
        // TODO: If local state was optimistically updated, revert it
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, edges, supabase, setEdges, addStateToHistory, showNotification],
  );

  // --- DELETE EDGE ---
  const deleteEdge = useCallback(
    async (edgeId: string): Promise<void> => {
      setIsLoading(true); // Indicate saving
      try {
        const { error } = await supabase
          .from("edges")
          .delete()
          .eq("id", edgeId);

        if (error) {
          throw new Error(
            error?.message || "Failed to delete connection from database.",
          );
        }

        // Remove edge from local state
        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));

        addStateToHistory("deleteEdge");
        showNotification("Connection deleted.", "success");
      } catch (err: unknown) {
        console.error(`Error deleting connection ${edgeId}:`, err);
        const message =
          err instanceof Error ? err.message : "Failed to delete connection.";
        showNotification(message, "error");
        // TODO: Revert local state on failure
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setEdges, addStateToHistory, showNotification],
  );

  // --- SAVE EDGE PROPERTIES (from modal) ---
  const saveEdgeProperties = useCallback(
    async (edgeId: string, changes: Partial<EdgeData>): Promise<void> => {
      setIsLoading(true); // Indicate saving
      try {
        // Prepare updates for the database, including flattening style if needed
        const dbUpdates: Partial<EdgeData> = { ...changes };
        // Supabase 'update' automatically merges jsonb, but explicit flattening might be safer
        if (changes.style) {
          // If saving style object, ensure it's handled correctly by DB schema (jsonb)
          // No need to flatten if the 'style' column is jsonb
        }
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("edges")
          .update(dbUpdates)
          .eq("id", edgeId);

        if (error) {
          throw new Error(
            error?.message || "Failed to save connection properties.",
          );
        }

        // Update local state
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  data: { ...edge.data, ...changes }, // Update data
                  // Ensure React Flow props also reflect changes if they are separate from data
                  type: changes.type ?? edge.type,
                  label: changes.label ?? edge.label,
                  animated: changes.animated ?? edge.animated,
                  // Merge styles
                  style: changes.style
                    ? { ...edge.style, ...changes.style }
                    : edge.style,
                }
              : edge,
          ),
        );

        addStateToHistory("saveEdgeProperties");
        showNotification("Connection properties saved.", "success");
      } catch (err: unknown) {
        console.error(`Error saving properties for edge ${edgeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save connection properties.";
        showNotification(message, "error");
        // TODO: Revert local state on failure
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setEdges, addStateToHistory, showNotification],
  );

  // --- HANDLE NODE CHANGES ---
  // This function is triggered by React Flow on nodes change (drag, dimensions)
  const handleNodeChanges = useCallback(
    (changes: NodeChange[], currentNodes: Node<NodeData>[]) => {
      const positionChanges = changes.filter(
        (
          change,
        ): change is NodeChange & {
          type: "position";
          dragging: boolean;
          position?: XYPosition; // position is optional on drag=true
        } => change.type === "position", // Consider saving only when dragging stops
      );

      positionChanges.forEach((change) => {
        // Only save position when dragging stops (change.dragging is false)
        if (change.dragging === false && change.position) {
          saveNodePosition(change.id, change.position);
          // History is managed in the parent (MindMapCanvas) after onNodesChange
        }
      });

      // Handle dimension changes if needed (e.g., if you store dimensions in DB)
      const dimensionChanges = changes.filter(
        (
          change,
        ): change is NodeChange & {
          type: "dimensions";
          dimensions: { width: number; height: number };
        } => change.type === "dimensions",
      );
      dimensionChanges.forEach(() => {
        // Optional: Save dimensions to DB if you store them on the node
        // const updatedNode = currentNodes.find((n) => n.id === change.id);
        // if (updatedNode && change.dimensions) {
        //   saveNodeDimensions(change.id, change.dimensions);
        // }
      });

      // No history add here, parent handles it after onNodesChange
    },
    [saveNodePosition],
  );

  // --- HANDLE EDGE CHANGES ---
  // This function is triggered by React Flow on edges change (currently only deletion)
  const handleEdgeChanges = useCallback(
    (
      changes: EdgeChange[],
      currentEdges: AppEdge[],
      currentNodes: Node<NodeData>[],
    ) => {
      changes.forEach((change) => {
        if (change.type === "remove") {
          // When an edge is removed in React Flow (e.g., via Delete key)
          // Trigger the deleteEdge CRUD action
          deleteEdge(change.id);
          // History is managed in the parent (MindMapCanvas) after onEdgesChange
        }
        // Add other edge change types if React Flow supports them and you need to handle
      });
    },
    [deleteEdge], // Depend on deleteEdge CRUD function
  );

  return {
    crudActions: {
      addNode,
      deleteNode,
      saveNodePosition,
      saveNodeContent,
      saveNodeStyle,
      addEdge, // New function for onConnect
      saveEdgeStyle,
      deleteEdge, // New function for edge deletion
      saveEdgeProperties, // New function for modal save
      handleNodeChanges,
      handleEdgeChanges, // New handler
    },
    isLoading, // This isLoading reflects async operations in CRUD actions
  };
}
