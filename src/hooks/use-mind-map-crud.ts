import { nodeTypes } from "@/constants/node-types"; // Import node types to check validity
import { deleteNodeAndDescendants } from "@/helpers/delete-node-and-descendants";
import { createClient } from "@/helpers/supabase/client";
import uuid from "@/helpers/uuid";
import { NotificationType } from "@/hooks/use-notifications";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data"; // Use AppEdge and EdgeData
import { NodeData } from "@/types/node-data";
import { SupabaseClient } from "@supabase/supabase-js"; // Import type
import {
  EdgeChange,
  getIncomers,
  Node,
  NodeChange,
  NodeDimensionChange, // Import NodeDimensionChange
  NodePositionChange,
  XYPosition,
} from "@xyflow/react"; // Import necessary functions
import { useCallback, useRef, useState } from "react"; // Import useRef

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
    initialData?: Partial<NodeData>, // Allow passing initial data including metadata/styles
  ) => Promise<Node<NodeData> | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  saveNodePosition: (nodeId: string, position: XYPosition) => Promise<void>;
  saveNodeContent: (nodeId: string, content: string) => Promise<void>;
  // Added saveNodeDimensions
  saveNodeDimensions: (
    nodeId: string,
    dimensions: { width: number; height: number },
  ) => Promise<void>;
  // Renamed and updated to save all editable node properties
  saveNodeProperties: (
    nodeId: string,
    changes: Partial<NodeData>,
  ) => Promise<void>;

  addEdge: (
    sourceId: string,
    targetId: string,
    initialData?: Partial<EdgeData>,
  ) => Promise<AppEdge | null>; // Allow passing initial edge data
  // saveEdgeStyle is now merged into saveEdgeProperties
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
  // Debounce timers ref
  const saveTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // --- Helper: Debounce save function ---
  const debounceSave = (
    id: string,
    field: "position" | "dimensions",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveFn: (...args: any[]) => Promise<void>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => {
    const key = `${id}-${field}`;
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
    }
    saveTimers.current[key] = setTimeout(() => {
      saveFn(...args);
      delete saveTimers.current[key]; // Clear timer after execution
    }, 500); // 500ms debounce delay
  };

  // --- Helper: Get default properties for edge type (if needed) ---
  const getDefaultEdgePropertiesForType = (type: string = "editableEdge") => {
    // Default visual styles
    const defaultStyle = { stroke: "#6c757d", strokeWidth: 2 };
    // Default behaviors/data
    const defaultData: Partial<EdgeData> = {
      animated: false,
      label: undefined,
      color: "#6c757d", // Store color in data for easier access
      strokeWidth: 2, // Store stroke width in data
      markerEnd: undefined, // Default markerEnd to undefined
      // metadata: {} // Default empty metadata
    };

    // Customize defaults based on type if needed
    // if (type === 'fancyEdge') {
    //    defaultData.animated = true;
    // }

    return {
      ...defaultData,
      style: defaultStyle, // React Flow's style prop for rendering
      type: type, // The React Flow type name
    };
  };

  // --- ADD NODE ---
  const addNode = useCallback(
    async (
      parentNodeId: string | null = null,
      content: string = "New Node",
      nodeType: string = "defaultNode", // Default node type is now 'defaultNode'
      position?: XYPosition,
      initialData: Partial<NodeData> = {}, // Accept initial data
    ): Promise<Node<NodeData> | null> => {
      if (!mapId) {
        showNotification("Cannot add node: Map ID missing.", "error");
        return null;
      }
      // Validate nodeType
      if (!nodeTypes[nodeType as keyof typeof nodeTypes]) {
        console.warn(
          `Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.`, // Fallback to 'defaultNode'
        );
        nodeType = "defaultNode"; // Fallback to default if type is invalid
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
            // Find existing root nodes (nodes with no incoming edges)
            const rootNodes = nodes.filter((n) => {
              const incomers = getIncomers(n, nodes, edges);
              return incomers.length === 0;
            });
            newNodePosition = {
              x: 250 + rootNodes.length * 200, // Offset new roots horizontally
              y: 100,
            };
          }
        }

        const newNodeId = uuid();
        const user = await supabase.auth.getUser();
        if (!user.data.user) throw new Error("User not authenticated.");

        // --- Prepare Node Data for DB ---
        const newNodeDbData: Omit<NodeData, "created_at" | "updated_at"> & {
          created_at?: string; // Optional for insert
          updated_at?: string; // Optional for insert
        } = {
          id: newNodeId,
          user_id: user.data.user.id,
          map_id: mapId,
          parent_id: parentNodeId, // Keep parent_id for initial tree structure hint or layout
          content: content,
          position_x: newNodePosition.x,
          position_y: newNodePosition.y,
          node_type: nodeType,
          // Merge initialData, ensuring metadata is merged if present
          ...initialData,
          metadata: {
            ...initialData.metadata, // Merge metadata if provided
          },
          // Ensure width/height from initialData are included if provided
          width: initialData.width,
          height: initialData.height,
        };

        // Clean up undefined or null values before insert if Supabase is strict
        Object.keys(newNodeDbData).forEach((key) =>
          newNodeDbData[key] === undefined ||
          (newNodeDbData[key] === null &&
            !(key === "parent_id" || key === "metadata")) // Keep parent_id and potentially null metadata
            ? delete newNodeDbData[key]
            : {},
        );

        const { data: insertedNodeData, error: nodeInsertError } =
          await supabase
            .from("nodes")
            .insert([newNodeDbData]) // Cast needed because Omit doesn't handle optional properties well for insert type
            .select("*") // Select all columns to get width/height back
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
          // Pass all fetched data into the React Flow node's data property
          data: finalNodeData, // Now pass the full fetched data object
          type: finalNodeData.node_type || "defaultNode", // Use node_type from DB, default to 'defaultNode'
          // Apply width and height from DB
          width: finalNodeData.width || undefined,
          height: finalNodeData.height || undefined,
          // Style applied here for React Flow renderer if needed, often managed by data or type
          // For explicit style columns, you might map them here, or handle in the custom node component
        };

        // --- Add Edge to DB if there's a parent ---
        if (parentNodeId) {
          const newEdgeId = uuid();
          const defaultEdgeProps =
            getDefaultEdgePropertiesForType("editableEdge"); // Use 'editableEdge' or 'defaultEdge' type?
          const user_id = (await supabase.auth.getUser()).data.user?.id;

          const newEdgeDbData: Omit<EdgeData, "created_at" | "updated_at"> & {
            created_at?: string;
            updated_at?: string;
          } = {
            id: newEdgeId,
            map_id: mapId,
            source: parentNodeId,
            target: newNodeId,
            user_id: user_id || "",
            // Use default edge properties, allowing overrides from initialData if needed later
            type: defaultEdgeProps.type,
            label: defaultEdgeProps.label,
            animated: defaultEdgeProps.animated,
            color: defaultEdgeProps.color,
            strokeWidth: defaultEdgeProps.strokeWidth,
            markerEnd: defaultEdgeProps.markerEnd, // Include markerEnd
            style: defaultEdgeProps.style, // React Flow style object
            metadata: defaultEdgeProps.metadata, // Empty metadata by default
          };

          // Clean up undefined/null
          Object.keys(newEdgeDbData).forEach((key) =>
            newEdgeDbData[key] === undefined || newEdgeDbData[key] === null
              ? delete newEdgeDbData[key]
              : {},
          );

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
              user_id: user_id || "", // Or from finalEdgeData
              type: finalEdgeData.type || "editableEdge", // Or "defaultEdge"
              animated: finalEdgeData.animated ?? false,
              label: finalEdgeData.label,
              style: finalEdgeData.style || {
                stroke: finalEdgeData.color || "#6c757d",
                strokeWidth: finalEdgeData.strokeWidth || 2,
              }, // Use style object or fallback from data
              markerEnd: finalEdgeData.markerEnd, // Pass if managing
              data: finalEdgeData, // Pass the full edge data
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
        // This relies on ON DELETE CASCADE set up for the 'edges' table
        // where 'source' and 'target' foreign keys reference 'nodes.id'.
        // It *also* relies on ON DELETE CASCADE for 'parent_id' in 'nodes' table
        // if you are still using parent_id for recursive deletion.
        // Using the helper function which relies on ON DELETE CASCADE on 'nodes.id' for edges
        // and ON DELETE CASCADE for 'parent_id' in 'nodes' table (if still used).
        // A safer/more explicit way might be a Supabase function. Assuming cascades are set up.
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

  // --- SAVE NODE POSITION (Debounced) ---
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

  // --- SAVE NODE DIMENSIONS (Debounced) ---
  const saveNodeDimensions = useCallback(
    async (nodeId: string, dimensions: { width: number; height: number }) => {
      try {
        // Ensure dimensions are valid numbers
        const width = Math.round(dimensions.width);
        const height = Math.round(dimensions.height);
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
          console.warn(
            `Invalid dimensions provided for node ${nodeId}:`,
            dimensions,
          );
          return;
        }

        const { error } = await supabase
          .from("nodes")
          .update({
            width: width,
            height: height,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);
        if (error) throw error;
        // Local state update is handled by React Flow
      } catch (err: unknown) {
        console.error(`Error saving dimensions for node ${nodeId}:`, err);
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

  // --- SAVE ALL NODE PROPERTIES (from modal) ---
  // Renamed from saveNodeStyle
  const saveNodeProperties = useCallback(
    async (nodeId: string, changes: Partial<NodeData>) => {
      // Filter changes to include only fields that exist in NodeData and are editable
      const validUpdates: Partial<NodeData> = {};
      const editableKeys: (keyof NodeData)[] = [
        "content",
        "tags",
        "status",
        "importance",
        "sourceUrl", // General
        "node_type",
        "metadata", // Type and Metadata
        "width", // Add width
        "height", // Add height
        // Note: position_x, position_y, id, map_id, user_id, created_at, updated_at, isSearchResult are not editable here
        // Embedding, aiSummary, extractedConcepts are read-only via modal
      ];

      editableKeys.forEach((key) => {
        if (changes.hasOwnProperty(key)) {
          // Check if the key exists in the changes object
          // Special handling for nullable fields or values that should map to DB null
          if (key === "content" || key === "sourceUrl") {
            // Save empty strings as null/undefined
            if (
              typeof changes[key] === "string" &&
              (changes[key] as string).trim() === ""
            ) {
              validUpdates[key] = null; // Or undefined depending on DB column nullability
            } else {
              validUpdates[key] = changes[key];
            }
          } else if (key === "tags") {
            // Save empty arrays as null/undefined
            if (Array.isArray(changes[key]) && changes[key]?.length === 0) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else if (key === "metadata") {
            // Ensure metadata is an object, save null if empty/cleared
            if (
              typeof changes.metadata === "object" &&
              changes.metadata !== null &&
              Object.keys(changes.metadata).length > 0
            ) {
              validUpdates.metadata = changes.metadata;
            } else {
              validUpdates.metadata = null;
            }
          } else if (
            key === "importance" ||
            key === "width" ||
            key === "height"
          ) {
            // Handle numbers, save null if undefined or null in changes
            if (
              changes[key] === undefined ||
              changes[key] === null ||
              changes[key].toString() === ""
            ) {
              // Treat empty string from input as null
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else {
            // For other fields (colors, status, boolean toggles, node_type)
            validUpdates[key] = changes[key];
          }
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        // console.warn("saveNodeProperties called with no valid changes.");
        // setIsLoading(false); // Ensure loading state is reset if no changes
        return; // Do nothing if no valid changes
      }

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
                  // Update data properties directly by merging validUpdates
                  data: {
                    ...n.data, // Start with existing data
                    ...validUpdates, // Merge in the updates
                    // Special handle for metadata if validUpdates.metadata exists, ensure deep merge if needed, or replace
                    metadata:
                      validUpdates.metadata !== undefined
                        ? validUpdates.metadata
                        : n.data?.metadata, // Use new metadata if provided, otherwise keep old
                  },
                  // Update React Flow specific props
                  type: validUpdates.node_type ?? n.type, // Update type in React Flow state
                  // Update width/height in React Flow state if changed
                  width: validUpdates.width ?? n.width,
                  height: validUpdates.height ?? n.height,
                }
              : n,
          ),
        );

        addStateToHistory("saveNodeProperties");
        showNotification("Node properties saved.", "success"); // Show success for property saves
      } catch (err: unknown) {
        console.error(`Error saving properties for node ${nodeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save properties for node ${nodeId}.`;
        showNotification(message, "error");
        // TODO: Revert style/properties locally on save failure
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setNodes, addStateToHistory, showNotification],
  );

  // --- ADD EDGE (onConnect handler) ---
  const addEdge = useCallback(
    async (
      sourceId: string,
      targetId: string,
      initialData: Partial<EdgeData> = {},
    ): Promise<AppEdge | null> => {
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
        // Get default edge properties and merge any initial data provided
        const defaultEdgeProps = getDefaultEdgePropertiesForType(
          initialData.type,
        );

        const newEdgeDbData: Omit<EdgeData, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        } = {
          id: newEdgeId,
          map_id: mapId,
          user_id: (await supabase.auth.getUser()).data.user?.id || "",
          source: sourceId,
          target: targetId,
          // Merge initial data over defaults
          ...defaultEdgeProps, // Start with defaults
          ...initialData, // Apply initial data overrides
          // Ensure style object is merged if both default and initialData provide it
          // Ensure metadata is merged if both provide it, or use initialData metadata if present
          metadata:
            initialData.metadata !== undefined
              ? initialData.metadata
              : defaultEdgeProps.metadata,
        };

        // Clean up undefined/null before insert
        Object.keys(newEdgeDbData).forEach((key) =>
          newEdgeDbData[key] === undefined ||
          (newEdgeDbData[key] === null && !(key === "metadata")) // Keep potentially null metadata
            ? delete newEdgeDbData[key]
            : {},
        );

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
          user_id: finalEdgeData.user_id || "", // Use fetched user_id
          type: finalEdgeData.type || "editableEdge", // Fallback type
          animated: finalEdgeData.animated ?? false, // Fallback
          label: finalEdgeData.label,
          style: finalEdgeData.style || {
            stroke: finalEdgeData.color || "#6c757d",
            strokeWidth: finalEdgeData.strokeWidth || 2,
          }, // Use style object or fallback from data
          markerEnd: finalEdgeData.markerEnd, // Pass if managing
          data: finalEdgeData, // Pass the full edge data
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
      // Filter valid style updates based on EdgeData and table columns
      const validUpdates: EdgeData = {} as EdgeData;
      const editableKeys: (keyof EdgeData)[] = [
        "type",
        "label",
        "animated",
        "color",
        "strokeWidth", // React Flow related + common style
        "markerEnd", // New editable key
        "metadata", // Other potential editable fields
      ];

      editableKeys.forEach((key) => {
        if (changes.hasOwnProperty(key)) {
          // Check if the key exists in the changes object
          // Handle null/undefined for nullable columns
          if (key === "label") {
            // Removed description
            if (
              typeof changes[key] === "string" &&
              (changes[key] as string).trim() === ""
            ) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else if (key === "strokeWidth") {
            // Removed strength
            // Handle numbers, save null if undefined or null
            if (
              changes[key] === undefined ||
              changes[key] === null ||
              changes[key].toString() === ""
            ) {
              // Treat empty string from input as null
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else if (key === "metadata") {
            // Ensure metadata is an object, save null if empty/cleared
            if (
              typeof changes.metadata === "object" &&
              changes.metadata !== null &&
              Object.keys(changes.metadata).length > 0
            ) {
              validUpdates.metadata = changes.metadata;
            } else {
              validUpdates.metadata = null;
            }
          } else {
            // For boolean toggles, type, color, markerEnd
            // Explicitly handle markerEnd value 'none' mapping to null/undefined in DB
            if (key === "markerEnd" && changes[key] === "none") {
              validUpdates[key] = "none"; // Or undefined depending on DB schema
            } else {
              validUpdates[key] = changes[key];
            }
          }
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        // console.warn("saveEdgeProperties called with no valid changes.");
        // setIsLoading(false); // Ensure loading state is reset if no changes
        return; // Do nothing if no valid changes
      }

      setIsLoading(true);
      try {
        const { error } = await supabase
          .from("edges")
          .update({
            ...validUpdates, // Update all valid fields
            updated_at: new Date().toISOString(),
          })
          .eq("id", edgeId);
        if (error) throw error;

        // --- Update local state (React Flow Edges) ---
        setEdges((prev) =>
          prev.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  type: validUpdates.type ?? edge.type,
                  label: validUpdates.label ?? edge.label,
                  animated: validUpdates.animated ?? edge.animated,
                  // style properties applied directly to the style object
                  style: {
                    ...edge.style, // Preserve existing style props
                    stroke: validUpdates.color ?? edge.style?.stroke, // Use 'color' from updates for stroke
                    strokeWidth:
                      validUpdates.strokeWidth ?? edge.style?.strokeWidth, // Use 'strokeWidth' from updates
                  },
                  markerEnd: validUpdates.markerEnd ?? edge.markerEnd, // Update markerEnd if managing

                  data: {
                    ...edge.data, // Start with existing data
                    ...validUpdates, // Merge in the updates
                    metadata:
                      validUpdates.metadata !== undefined
                        ? validUpdates.metadata
                        : edge.data?.metadata,
                  },
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
            : `Failed to save properties for edge ${edgeId}.`;
        showNotification(message, "error");
        // TODO: Revert local state on save failure
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setEdges, addStateToHistory, showNotification], // Add setEdges dependency
  );

  // --- HANDLE NODE CHANGES ---
  // This function is triggered by React Flow on nodes change (drag, dimensions, selection etc.)
  const handleNodeChanges = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        switch (change.type) {
          case "position": {
            // Handle position changes (dragging)
            const positionChange = change as NodePositionChange;
            // Only save position when dragging stops (change.dragging is false)
            if (positionChange.dragging === false && positionChange.position) {
              // Use debounceSave to prevent excessive writes during rapid drags
              debounceSave(
                positionChange.id,
                "position",
                saveNodePosition,
                positionChange.id,
                positionChange.position,
              );
              // History is managed in the parent (MindMapCanvas) after onNodesChange completes
            }
            break;
          }
          case "dimensions": {
            // Handle dimension changes (resizing)
            const dimensionChange = change as NodeDimensionChange;
            if (
              dimensionChange.dimensions &&
              dimensionChange.resizing === false // Save only when resizing stops
            ) {
              // Use debounceSave for dimensions as well
              debounceSave(
                dimensionChange.id,
                "dimensions",
                saveNodeDimensions,
                dimensionChange.id,
                dimensionChange.dimensions,
              );
              // History is managed in the parent
            }
            break;
          }
          // Handle other change types if needed (e.g., 'select', 'remove')
          // 'remove' is implicitly handled by the onDelete callback in useKeyboardShortcuts/ContextMenu
        }
      });
    },
    [saveNodePosition, saveNodeDimensions], // Depend on debounced save functions
  );

  // --- HANDLE EDGE CHANGES ---
  // This function is triggered by React Flow on edges change (currently only deletion)
  const handleEdgeChanges = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === "remove") {
          deleteEdge(change.id);
        }
      });
    },
    [deleteEdge], // Depend on deleteEdge CRUD function
  );

  return {
    crudActions: {
      addNode,
      deleteNode,
      saveNodePosition,
      saveNodeContent, // Kept as a specific function for content? Or remove and use saveNodeProperties? Let's keep it for quick content edits.
      saveNodeDimensions, // Added saveNodeDimensions
      saveNodeProperties, // The comprehensive save
      addEdge, // New function for onConnect
      // saveEdgeStyle is gone
      deleteEdge, // New function for edge deletion
      saveEdgeProperties, // New function for modal save
      handleNodeChanges,
      handleEdgeChanges, // New handler
    },
    isLoading, // This isLoading reflects async operations in CRUD actions
  };
}
