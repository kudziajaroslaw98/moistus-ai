import { nodeTypes } from "@/constants/node-types";
import { deleteNodeById } from "@/helpers/delete-node-and-descendants";
import generateUuid from "@/helpers/generate-uuid";
import { createClient } from "@/helpers/supabase/client";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  EdgeChange,
  getIncomers,
  getNodesBounds,
  MarkerType,
  Node,
  NodeChange,
  XYPosition,
} from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { AiActions } from "./use-ai-features";

interface UseMindMapCRUDProps {
  mapId: string;
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  addStateToHistory: (
    actionName?: string,
    stateOverride?: { nodes?: Node<NodeData>[]; edges?: AppEdge[] },
  ) => void;
  aiActions: AiActions | null;
}

export interface CrudActions {
  addNode: (
    parentNodeId?: string | null,
    content?: string,
    nodeType?: string,
    position?: XYPosition,
    initialData?: Partial<NodeData>,
  ) => Promise<Node<NodeData> | null>;
  deleteNode: (nodeId: string, skipHistory?: boolean) => Promise<void>;
  saveNodePosition: (nodeId: string, position: XYPosition) => Promise<void>;
  saveNodeMetadata: (
    nodeId: string,
    metadata: Partial<NodeData["metadata"]>,
  ) => Promise<void>;
  saveNodeAiData: (
    nodeId: string,
    aiData: Partial<NodeData["aiData"]>,
  ) => Promise<void>;
  saveNodeContent: (nodeId: string, content: string) => Promise<void>;
  triggerNodeSave: (change: NodeChange) => void;
  triggerEdgeSave: (change: EdgeChange) => void;
  saveNodeDimensions: (
    nodeId: string,
    dimensions: { width: number; height: number },
  ) => Promise<void>;

  saveNodeProperties: (
    nodeId: string,
    changes: Partial<NodeData>,
  ) => Promise<void>;

  addEdge: (
    sourceId: string,
    targetId: string,
    initialData?: Partial<EdgeData>,
  ) => Promise<AppEdge | null>;

  setNodeParent: (
    edgeId: string,
    nodeId: string,
    parentId: string | null,
  ) => Promise<void>;

  deleteEdge: (edgeId: string, skipHistory?: boolean) => Promise<void>;
  saveEdgeProperties: (
    edgeId: string,
    changes: Partial<EdgeData>,
  ) => Promise<void>;
  groupNodes: (nodeIds: string[]) => Promise<void>;
  restoreNode: (node: Node<NodeData>) => Promise<void>;
  restoreEdge: (edge: AppEdge) => Promise<void>;
}

interface UseMindMapCRUDResult {
  crudActions: CrudActions;
  isLoading: boolean;
}

export function useMindMapCRUD({
  mapId,
  nodes,
  edges,
  setNodes,
  setEdges,
  addStateToHistory,
  aiActions,
}: UseMindMapCRUDProps): UseMindMapCRUDResult {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const saveTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const debounceSave = useCallback(
    (
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
        delete saveTimers.current[key];
      }, 500);
    },
    [],
  );

  const getDefaultEdgePropertiesForType = (type: string = "editableEdge") => {
    const defaultStyle = { stroke: "#6c757d", strokeWidth: 2 };

    const defaultData: Partial<EdgeData> = {
      animated: false,
      label: undefined,
      markerEnd: undefined,
    };

    return {
      ...defaultData,
      style: defaultStyle,
      type: type,
    };
  };

  const addNode = useCallback(
    async (
      parentNodeId: string | null = null,
      content: string = "New Node",
      nodeType: string = "defaultNode",
      position?: XYPosition,
      initialData: Partial<NodeData> = {},
    ): Promise<Node<NodeData> | null> => {
      if (!mapId) {
        toast.error(`Cannot add node: Map ID missing.`);
        return null;
      }

      if (!nodeTypes[nodeType as keyof typeof nodeTypes]) {
        console.warn(
          `Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.`,
        );
        nodeType = "defaultNode";
      }

      setIsLoading(true);
      let newNodeReactFlowNode: Node<NodeData> | null = null;
      let newEdgeReactFlowEdge: AppEdge | null = null;

      try {
        let newNodePosition = position;

        if (!newNodePosition) {
          if (parentNodeId) {
            const parentNode = nodes.find((n) => n.id === parentNodeId);

            if (parentNode) {
              newNodePosition = {
                x: parentNode.position.x + (parentNode.width || 170) + 100,
                y: parentNode.position.y + (parentNode.height || 60) / 2 - 30,
              };
            } else {
              newNodePosition = {
                x: Math.random() * 400 + 50,
                y: Math.random() * 400 + 50,
              };
            }
          } else {
            const rootNodes = nodes.filter((n) => {
              const incomers = getIncomers(n, nodes, edges);
              return incomers.length === 0;
            });
            newNodePosition = {
              x: 250 + rootNodes.length * 200,
              y: 100,
            };
          }
        }

        const newNodeId = generateUuid();
        const user = await supabase.auth.getUser();
        if (!user.data.user) throw new Error("User not authenticated.");

        const newNodeDbData: Omit<NodeData, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        } = {
          id: newNodeId,
          user_id: user.data.user.id,
          map_id: mapId,
          parent_id: parentNodeId,
          content: content,
          position_x: newNodePosition.x,
          position_y: newNodePosition.y,
          node_type: nodeType,

          ...initialData,
          metadata: {
            ...initialData.metadata,
          },

          width: initialData.width,
          height: initialData.height,
        };

        const { data: insertedNodeData, error: nodeInsertError } =
          await supabase
            .from("nodes")
            .insert([newNodeDbData])
            .select("*")
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

          data: finalNodeData,
          type: finalNodeData.node_type || "defaultNode",

          width: finalNodeData.width || undefined,
          height: finalNodeData.height || undefined,
        };

        if (parentNodeId) {
          const newEdgeId = generateUuid();
          const defaultEdgeProps =
            getDefaultEdgePropertiesForType("editableEdge");
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

            type: defaultEdgeProps.type,
            label: defaultEdgeProps.label,
            animated: defaultEdgeProps.animated,
            markerEnd: defaultEdgeProps.markerEnd,
            markerStart: defaultEdgeProps.markerStart,
            style: defaultEdgeProps.style,
            metadata: {},
          };

          const { data: insertedEdgeData, error: edgeInsertError } =
            await supabase
              .from("edges")
              .insert([newEdgeDbData])
              .select()
              .single();

          if (edgeInsertError || !insertedEdgeData) {
            console.error(
              "Warning: Failed to save new edge to database:",
              edgeInsertError,
            );
            toast.error(`Failed to save new edge to database.`);
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
              style: {
                stroke: finalEdgeData.style?.stroke || "#6c757d",
                strokeWidth: finalEdgeData.style?.strokeWidth || 2,
              },
              markerEnd: finalEdgeData.markerEnd,
              data: finalEdgeData,
            };
          }
        }

        let finalNodes: Node<NodeData>[] = [];
        let finalEdges: AppEdge[] = [];

        setNodes((nds) => {
          finalNodes = [...nds, newNodeReactFlowNode!];
          return finalNodes;
        });

        if (newEdgeReactFlowEdge) {
          setEdges((eds) => {
            finalEdges = [...eds, newEdgeReactFlowEdge!];
            return finalEdges;
          });
        } else {
          finalEdges = edges;
        }

        addStateToHistory("addNode", { nodes: finalNodes, edges: finalEdges });

        toast.success(`Node added.`);
        return newNodeReactFlowNode;
      } catch (err: unknown) {
        console.error("Error adding node:", err);
        const message =
          err instanceof Error ? err.message : "Failed to add node.";
        toast.error(message);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, nodes, edges, supabase, setNodes, setEdges, addStateToHistory],
  );

  const deleteNode = useCallback(
    async (nodeId: string, skipHistory: boolean = false) => {
      if (!mapId || !nodeId) return;

      const nodeToDelete = nodes.find((node) => node.id === nodeId);
      if (!nodeToDelete) return;

      if (nodes.length === 1 && nodes[0].id === nodeId) {
      } else {
        const incomers = getIncomers(nodeToDelete, nodes, edges);
        const isRoot = incomers.length === 0;
        const rootNodes = nodes.filter(
          (n) => getIncomers(n, nodes, edges).length === 0,
        );

        if (isRoot && rootNodes.length <= 1) {
          toast.error("Cannot delete the last root node.");
          return;
        }
      }

      setIsLoading(true);

      try {
        const nodesToRemove = [nodeId];
        const nextNodes = nodes.filter(
          (node) => !nodesToRemove.includes(node.id),
        );
        const nextEdges = edges.filter(
          (edge) =>
            !nodesToRemove.includes(edge.source) &&
            !nodesToRemove.includes(edge.target),
        );

        await deleteNodeById(nodeId, supabase as SupabaseClient);

        setNodes(nextNodes);
        setEdges(nextEdges);

        if (!skipHistory) {
          addStateToHistory("deleteNode", {
            nodes: nextNodes,
            edges: nextEdges,
          });
        }

        toast.success("Node(s) deleted.");
      } catch (err: unknown) {
        console.error("Error deleting node:", err);
        const message =
          err instanceof Error ? err.message : "Failed to delete node(s).";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, nodes, edges, supabase, setNodes, setEdges, addStateToHistory],
  );

  const saveNodePosition = useCallback(
    async (nodeId: string, position: XYPosition) => {
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
      } catch (err: unknown) {
        console.error(`Error saving position for node ${nodeId}:`, err);
      }
    },
    [supabase],
  );

  const saveNodeMetadata = useCallback(
    async (nodeId: string, metadataPatch: Partial<NodeData["metadata"]>) => {
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) {
        toast.error("Node not found for metadata update.");
        return;
      }

      const newMetadata = { ...node.data.metadata, ...metadataPatch };

      try {
        // --- Database Update ---
        const { error: dbError } = await supabase
          .from("nodes")
          .update({
            metadata: newMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);

        if (dbError) throw dbError;

        // --- Local State Update ---
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, metadata: newMetadata } }
              : n,
          ),
        );
        addStateToHistory("updateNodeMetadata"); // Or a more specific action name

        toast.success("Node metadata updated.");
      } catch (error) {
        console.error("Failed to save node metadata:", error);
        toast.error("Failed to save node metadata.");
      }
    },
    [addStateToHistory, nodes, setNodes, supabase],
  );

  const saveNodeAiData = useCallback(
    async (nodeId: string, aiDataPatch: Partial<NodeData["aiData"]>) => {
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) {
        toast.error("Node not found for metadata update.");
        return;
      }

      const newAiData = { ...node.data.aiData, ...aiDataPatch };

      try {
        // --- Database Update ---
        const { error: dbError } = await supabase
          .from("nodes")
          .update({
            aiData: newAiData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);

        if (dbError) throw dbError;

        // --- Local State Update ---
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, aiData: newAiData } }
              : n,
          ),
        );
        addStateToHistory("updateNodeAiData"); // Or a more specific action name
        toast.success("Node metadata updated.");
      } catch (error) {
        console.error("Failed to save node metadata:", error);
        toast.error("Error saving node metadata.");
      }
    },
    [addStateToHistory, nodes, setNodes, supabase],
  );

  const groupNodes = useCallback(
    async (nodeIds: string[]) => {
      if (nodeIds.length < 2) {
        toast.error("Select at least two nodes to group.");
        return;
      }

      if (!mapId) {
        toast.error("Cannot group nodes: Map ID missing.");
        return;
      }

      setIsLoading(true);
      const groupNodeId = generateUuid();
      const user = await supabase.auth.getUser();

      if (!user.data.user) {
        toast.error("User not authenticated.");
        setIsLoading(false);
        return;
      }

      const nodesToGroup = nodes.filter((n) => nodeIds.includes(n.id));

      if (nodesToGroup.length !== nodeIds.length) {
        toast.error("Error: Some selected nodes not found.");
        setIsLoading(false);
        return;
      }

      const rect = getNodesBounds(nodesToGroup);
      console.log(rect);
      let groupPosition = { x: 100, y: 100 };

      if (rect && (rect.width !== 0 || rect.height !== 0)) {
        groupPosition = { x: rect.x, y: rect.y };
      } else {
        groupPosition = nodesToGroup[0]?.position || groupPosition;
        console.warn("Using fallback position for group node.");
      }

      groupPosition.x -= 10;
      groupPosition.y -= 10;

      try {
        const groupNodeDbData: Partial<NodeData> = {
          id: groupNodeId,
          user_id: user.data.user.id,
          map_id: mapId,
          parent_id: null,
          content: null,
          position_x: groupPosition.x,
          position_y: groupPosition.y,
          width: rect.width,
          height: rect.height,
          node_type: "groupNode",
          metadata: { label: "New Group" },
        };

        const { data: insertedGroupData, error: groupInsertError } =
          await supabase
            .from("nodes")
            .insert([groupNodeDbData])
            .select("*")
            .single();

        if (groupInsertError || !insertedGroupData) {
          throw new Error(
            groupInsertError?.message || "Failed to create group node in DB.",
          );
        }

        const finalGroupNodeData: NodeData = insertedGroupData as NodeData;

        const { error: childrenUpdateError } = await supabase
          .from("nodes")
          .update({ parent_id: groupNodeId })
          .in("id", nodeIds);

        if (childrenUpdateError) {
          console.error(
            "Error updating child node parents:",
            childrenUpdateError,
          );
          toast.error("Error updating child node parents.");
        }

        let finalNodes: Node<NodeData>[] = [];
        setNodes((currentNodes) => {
          const newGroupNode: Node<NodeData> = {
            id: finalGroupNodeData.id,
            type: "groupNode",
            position: {
              x: finalGroupNodeData.position_x,
              y: finalGroupNodeData.position_y,
            },
            data: finalGroupNodeData,
            zIndex: -1,
            width: finalGroupNodeData.width!,
            height: finalGroupNodeData.height!,
          };

          const updatedNodes = currentNodes.map((node) => {
            if (nodeIds.includes(node.id)) {
              return {
                ...node,

                parentNode: groupNodeId,
                extent: "parent" as const,

                data: {
                  ...node.data,
                  parent_id: groupNodeId,
                },
              };
            }

            return node;
          });

          finalNodes = [...updatedNodes, newGroupNode];
          return finalNodes;
        });

        addStateToHistory("groupNodes", { nodes: finalNodes, edges: edges });

        toast.success("Nodes grouped successfully.");
      } catch (err: unknown) {
        console.error("Error grouping nodes:", err);
        const message =
          err instanceof Error ? err.message : "Failed to group nodes.";

        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, nodes, edges, supabase, setNodes, addStateToHistory],
  );

  const saveNodeDimensions = useCallback(
    async (nodeId: string, dimensions: { width: number; height: number }) => {
      try {
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
      } catch (err: unknown) {
        console.error(`Error saving dimensions for node ${nodeId}:`, err);
      }
    },
    [supabase],
  );

  const saveNodeContent = useCallback(
    async (nodeId: string, content: string) => {
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
      } catch (err: unknown) {
        console.error(`Error saving content for node ${nodeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save content for node ${nodeId}.`;
        toast.error(message);
      }
    },
    [supabase],
  );

  const saveNodeProperties = useCallback(
    async (nodeId: string, changes: Partial<NodeData>) => {
      setIsLoading(true);

      try {
        const { data: updatedNode, error } = await supabase
          .from("nodes")
          .update({
            ...changes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId)
          .select("*")
          .single();
        if (error) throw error;
        console.log("Updated node:", updatedNode);
        if (!updatedNode) throw new Error("Failed to fetch updated node.");

        let finalNodes: Node<NodeData>[] = [];
        setNodes((nds) => {
          finalNodes = nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  ...updatedNode,
                  data: {
                    ...n.data,
                    ...updatedNode,
                    metadata: {
                      ...n.data.metadata,
                      ...updatedNode.metadata,
                    },
                    aiData: {
                      ...n.data.aiData,
                      ...updatedNode.aiData,
                    },
                  },
                }
              : n,
          );
          return finalNodes;
        });

        addStateToHistory("saveNodeProperties", {
          nodes: finalNodes,
          edges: edges,
        });
        toast.success("Node properties saved.");

        if (
          updatedNode?.node_type === "questionNode" &&
          updatedNode.content?.trim() !== "" &&
          updatedNode?.aiData?.requestAiAnswer === true &&
          !updatedNode?.aiData?.aiAnswer
        ) {
          // Ensure aiActions is accessible here
          aiActions?.generateAnswer(nodeId, updatedNode.content);
        }
      } catch (err: unknown) {
        console.error(`Error saving properties for node ${nodeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save properties for node ${nodeId}.`;
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setNodes, addStateToHistory, edges],
  );

  const addEdge = useCallback(
    async (
      sourceId: string,
      targetId: string,
      initialData: Partial<EdgeData> = {},
    ): Promise<AppEdge | null> => {
      if (!mapId) {
        toast.error("Cannot add connection: Map ID missing.");
        return null;
      }

      if (sourceId === targetId) {
        toast.error("Cannot connect a node to itself.");
        return null;
      }

      // Check for existing connection in either direction
      const existingEdge = edges.find(
        (e) =>
          (e.source === sourceId && e.target === targetId) ||
          (e.source === targetId && e.target === sourceId),
      );

      if (existingEdge) {
        toast.error("A connection between these nodes already exists.");
        return null;
      }

      setIsLoading(true);
      let newReactFlowEdge: AppEdge | null = null;

      try {
        const newEdgeId = generateUuid();

        const defaultEdgeProps = getDefaultEdgePropertiesForType(
          initialData.type || "floatingEdge", // Default to floatingEdge
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

          ...defaultEdgeProps,
          ...initialData,
          markerEnd: MarkerType.Arrow,
          metadata:
            initialData.metadata !== undefined
              ? initialData.metadata
              : defaultEdgeProps.metadata,
        };

        Object.keys(newEdgeDbData).forEach((key) =>
          newEdgeDbData[key] === undefined ||
          (newEdgeDbData[key] === null && !(key === "metadata"))
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
          user_id: finalEdgeData.user_id || "",
          type: finalEdgeData.type || "floatingEdge", // Ensure type is floatingEdge
          animated: finalEdgeData.animated ?? false,
          label: finalEdgeData.label,
          style: {
            stroke: finalEdgeData.style?.stroke || "#6c757d",
            strokeWidth: finalEdgeData.style?.strokeWidth || 2,
          },
          markerEnd: finalEdgeData.markerEnd,
          data: finalEdgeData,
        };

        let finalEdges: AppEdge[] = [];
        // This variable will hold the nodes array state intended for the history snapshot.
        // It starts as a copy of the nodes state *before* attempting the parent_id update.
        let nodesStateForHistory: Node<NodeData>[] = [...nodes];

        // Update parent_id of the target node in the database
        const { error: parentUpdateError } = await supabase
          .from("nodes")
          .update({ parent_id: sourceId, updated_at: new Date().toISOString() })
          .eq("id", targetId);

        if (parentUpdateError) {
          console.error(
            `Error updating parent_id for target node ${targetId}:`,
            parentUpdateError,
          );

          toast.warning(
            "Connection saved, but failed to set parent relationship in DB.",
          );
          // If DB update fails, nodesStateForHistory remains the original snapshot.
        } else {
          // DB update for parent_id was successful.
          // 1. Update the live local state. This call will trigger React Flow re-renders
          // and any useEffects in MindMapProvider that depend on `nodes`.
          setNodes((currentNodesValue) =>
            currentNodesValue.map((n) =>
              n.id === targetId
                ? { ...n, data: { ...n.data, parent_id: sourceId } }
                : n,
            ),
          );

          // 2. For the history snapshot, explicitly create the version of nodes
          // that reflects this successful parent_id update.
          // We base this on the `nodes` array as it was at the beginning of this `addEdge` call's scope.
          nodesStateForHistory = nodes.map((n) =>
            n.id === targetId
              ? { ...n, data: { ...n.data, parent_id: sourceId } }
              : n,
          );
        }

        // Add the new edge to the live local state
        setEdges((eds) => {
          finalEdges = [...eds, newReactFlowEdge!]; // finalEdges is captured here for history
          return finalEdges;
        });

        // Add to history using the correctly constructed nodes snapshot and the final edges.
        addStateToHistory("addEdge", {
          nodes: nodesStateForHistory,
          edges: finalEdges,
        });
        toast.success("Connection saved.");
        return newReactFlowEdge;
      } catch (err: unknown) {
        console.error(`Error saving connection ${sourceId}->${targetId}:`, err);
        const message =
          err instanceof Error ? err.message : "Failed to save connection.";
        toast.error(message);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, nodes, edges, supabase, setEdges, addStateToHistory],
  );

  const deleteEdge = useCallback(
    async (edgeId: string, skipHistory: boolean = false): Promise<void> => {
      setIsLoading(true);

      try {
        const nextEdges = edges.filter((edge) => edge.id !== edgeId);

        const { error } = await supabase
          .from("edges")
          .delete()
          .eq("id", edgeId);

        if (error) {
          throw new Error(
            error?.message || "Failed to delete connection from database.",
          );
        }

        setEdges(nextEdges);

        if (!skipHistory) {
          addStateToHistory("deleteEdge", { edges: nextEdges });
        }

        toast.success("Connection deleted.");
      } catch (err: unknown) {
        console.error(`Error deleting connection ${edgeId}:`, err);
        const message =
          err instanceof Error ? err.message : "Failed to delete connection.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [nodes, edges, supabase, setEdges, addStateToHistory],
  );

  const saveEdgeProperties = useCallback(
    async (edgeId: string, changes: Partial<EdgeData>): Promise<void> => {
      const validUpdates: Partial<EdgeData> = {};
      const editableKeys: (keyof EdgeData)[] = [
        "label",
        "animated",
        "style",
        "markerEnd",
        "markerStart",
        "metadata",
      ];

      editableKeys.forEach((key) => {
        if (changes.hasOwnProperty(key)) {
          if (key === "label") {
            if (
              typeof changes[key] === "string" &&
              (changes[key] as string).trim() === ""
            ) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else if (key === "style") {
            if (
              typeof changes.style === "object" &&
              changes.style !== null &&
              Object.keys(changes.style).length > 0
            ) {
              validUpdates.style = changes.style;
            } else {
              validUpdates.style = null;
            }
          } else if (key === "metadata") {
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
            if (key === "markerEnd" && changes[key] === "none") {
              validUpdates[key] = "none";
            } else {
              validUpdates[key] = changes[key];
            }
          }
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        return;
      }

      setIsLoading(true);

      try {
        const { error } = await supabase
          .from("edges")
          .update({
            ...validUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", edgeId);
        if (error) throw error;

        let finalEdges: AppEdge[] = [];
        setEdges((prev) => {
          finalEdges = prev.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  label:
                    validUpdates.label !== undefined
                      ? validUpdates.label
                      : edge.label,
                  animated:
                    validUpdates.animated !== undefined
                      ? validUpdates.animated
                      : edge.animated,
                  style: {
                    stroke:
                      validUpdates.style?.stroke ??
                      edge.style?.stroke ??
                      "#6c757d",
                    strokeWidth:
                      validUpdates.style?.strokeWidth ??
                      edge.style?.strokeWidth ??
                      2,
                  },
                  markerEnd:
                    validUpdates.markerEnd !== undefined
                      ? validUpdates.markerEnd
                      : edge.markerEnd,
                  markerStart:
                    validUpdates.markerStart !== undefined
                      ? validUpdates.markerStart
                      : edge.markerStart,
                  data: {
                    ...edge.data!,
                    ...validUpdates,
                    label:
                      validUpdates.label !== undefined
                        ? validUpdates.label
                        : edge.data?.label,
                    animated:
                      validUpdates.animated !== undefined
                        ? validUpdates.animated
                        : edge.data?.animated,
                    style: {
                      stroke:
                        validUpdates.style?.stroke ??
                        edge.data?.style?.stroke ??
                        "#6c757d",
                      strokeWidth:
                        validUpdates.style?.strokeWidth ??
                        edge.data?.style?.strokeWidth ??
                        2,
                    },
                    markerEnd:
                      validUpdates.markerEnd !== undefined
                        ? validUpdates.markerEnd
                        : edge.data?.markerEnd,
                    markerStart:
                      validUpdates.markerStart !== undefined
                        ? validUpdates.markerStart
                        : edge.data?.markerStart,
                    metadata: {
                      ...(edge.data?.metadata || {}),
                      ...(validUpdates.metadata || {}),
                      isParentLink:
                        validUpdates.metadata?.isParentLink ??
                        edge.data?.metadata?.isParentLink ??
                        false,
                    },
                  },
                }
              : edge,
          );
          return finalEdges;
        });

        addStateToHistory("saveEdgeProperties", {
          nodes: nodes,
          edges: finalEdges,
        });
        toast.success("Connection properties saved.");
      } catch (err: unknown) {
        console.error(`Error saving properties for edge ${edgeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save properties for edge ${edgeId}.`;
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, nodes, edges, setEdges, addStateToHistory],
  );

  const restoreNode = useCallback(
    async (node: Node<NodeData>) => {
      if (!node || !node.id || !node.data) {
        console.error("Attempted to restore invalid node:", node);
        return;
      }

      console.log("Restoring node:", node.id);
      setIsLoading(true);

      try {
        const nodeToUpsert: Partial<NodeData> = {
          ...node.data,
          id: node.id,
          map_id: mapId,
          user_id:
            node.data.user_id || (await supabase.auth.getUser()).data.user?.id,
          position_x: node.position.x,
          position_y: node.position.y,
          width: node.width,
          height: node.height,
          node_type: node.type || node.data.node_type || "defaultNode",
          updated_at: new Date().toISOString(),
        };

        delete nodeToUpsert.label;

        const { error } = await supabase
          .from("nodes")
          .upsert(nodeToUpsert, { onConflict: "id" });

        if (error) {
          throw new Error(
            error.message || `Failed to restore node ${node.id} in database.`,
          );
        }

        console.log("Node restored in DB:", node.id);
      } catch (err: unknown) {
        console.error(`Error restoring node ${node.id}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to restore node ${node.id}.`;
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, supabase],
  );

  const restoreEdge = useCallback(
    async (edge: AppEdge) => {
      if (!edge || !edge.id || !edge.source || !edge.target) {
        console.error("Attempted to restore invalid edge:", edge);
        return;
      }

      console.log("Restoring edge:", edge.id);
      setIsLoading(true);

      try {
        const edgeToUpsert: Partial<EdgeData> = {
          ...edge.data,
          id: edge.id,
          map_id: mapId,
          user_id:
            edge.user_id || (await supabase.auth.getUser()).data.user?.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || edge.data?.type || "defaultEdge",
          label: edge.data?.label,
          animated: edge.animated ?? edge.data?.animated ?? false,
          style: {
            stroke: edge.style?.stroke || edge.data?.style?.stroke || "#6c757d",
            strokeWidth:
              edge.style?.strokeWidth || edge.data?.style?.strokeWidth || 2,
          },
          markerEnd: edge.data?.markerEnd,
          metadata: edge.data?.metadata,
          updated_at: new Date().toISOString(),
        };

        Object.keys(edgeToUpsert).forEach((key) => {
          if (edgeToUpsert[key as keyof EdgeData] === undefined) {
            delete edgeToUpsert[key as keyof EdgeData];
          }
        });

        const { error } = await supabase
          .from("edges")
          .upsert(edgeToUpsert, { onConflict: "id" });

        if (error) {
          throw new Error(
            error.message || `Failed to restore edge ${edge.id} in database.`,
          );
        }

        console.log("Edge restored in DB:", edge.id);
      } catch (err: unknown) {
        console.error(`Error restoring edge ${edge.id}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to restore edge ${edge.id}.`;
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, supabase],
  );

  const triggerNodeSave = useCallback(
    (change: NodeChange) => {
      switch (change.type) {
        case "position": {
          if (change.dragging === false && change.position) {
            debounceSave(
              change.id,
              "position",
              saveNodePosition,
              change.id,
              change.position,
            );
          }

          break;
        }

        case "dimensions": {
          if (change.dimensions && change.resizing === false) {
            debounceSave(
              change.id,
              "dimensions",
              saveNodeDimensions,
              change.id,
              change.dimensions,
            );
          }

          break;
        }
      }
    },
    [debounceSave, saveNodePosition, saveNodeDimensions],
  );

  const setNodeParent = useCallback(
    async (edgeId: string, nodeId: string, parentId: string | null) => {
      setIsLoading(true);

      try {
        const edgeToUpdate = edges.find((edge) => edge.id === edgeId);
        const targetNode = nodes.find((node) => node.id === nodeId);

        if (!edgeToUpdate || !targetNode) {
          toast.error(
            "Error setting parent link: Edge or target node not found.",
          );
          return;
        }

        // Find the old parent edge if it exists and is marked as parent link
        const oldParentEdge = edges.find(
          (edge) =>
            edge.target === nodeId &&
            edge.data?.metadata?.isParentLink === true,
        );

        // 1. Update target node's parent_id in DB
        const { error: nodeUpdateError } = await supabase
          .from("nodes")
          .update({ parent_id: parentId, updated_at: new Date().toISOString() })
          .eq("id", nodeId);

        if (nodeUpdateError) {
          throw new Error(
            nodeUpdateError.message ||
              "Failed to update node parent in database.",
          );
        }

        // 2. Update the selected edge's metadata/style in DB to be the new parent link
        const parentLinkStyle = {
          stroke: edgeToUpdate.data?.style?.stroke ?? "#88aaff",
          strokeWidth: 4,
        }; // Define parent link style
        const defaultStyle = {
          stroke: edgeToUpdate.data?.style?.stroke ?? "#6c757d",
          strokeWidth: 2,
        }; // Define default style

        const { error: edgeUpdateError } = await supabase
          .from("edges")
          .update({
            metadata: { ...edgeToUpdate.data?.metadata, isParentLink: true },
            style: parentLinkStyle,
            updated_at: new Date().toISOString(),
          })
          .eq("id", edgeId);

        if (edgeUpdateError) {
          console.error(
            "Warning: Failed to update edge as parent link in DB.",
            edgeUpdateError,
          );
          toast.warning(
            "Parent node updated, but failed to update edge style in DB.",
          );
        }

        // 3. If an old parent edge exists, update its metadata/style in DB to be non-parent link
        if (oldParentEdge && oldParentEdge.id !== edgeId) {
          const { error: oldEdgeUpdateError } = await supabase
            .from("edges")
            .update({
              metadata: {
                ...oldParentEdge.data?.metadata,
                isParentLink: false,
              },
              style: defaultStyle,
              updated_at: new Date().toISOString(),
            })
            .eq("id", oldParentEdge.id);

          if (oldEdgeUpdateError) {
            console.error(
              "Warning: Failed to update old parent edge style in DB.",
              oldEdgeUpdateError,
            );
            toast.warning(
              "Parent node updated, but failed to update old edge style in DB.",
            );
          }
        }

        // 4. Update local state for nodes (specifically the target node's parent_id)
        const nextNodes = nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, parent_id: parentId } }
            : node,
        );
        setNodes(nextNodes);

        // 5. Update local state for edges (selected edge and old parent edge)
        const nextEdges = edges.map((edge) => {
          if (edge.id === edgeId) {
            // The new parent edge
            return {
              ...edge,
              id: edge.id,
              data: {
                ...edge.data,
                id: edge.data!.id,
                metadata: { ...edge.data?.metadata, isParentLink: true },
              },
              style: parentLinkStyle,
            };
          } else if (oldParentEdge && edge.id === oldParentEdge.id) {
            // The old parent edge
            return {
              ...edge,
              data: {
                ...edge.data,
                id: edge.data!.id,
                metadata: { ...edge.data?.metadata, isParentLink: false },
              },
              style: defaultStyle,
            };
          }

          return edge;
        }) as AppEdge[];
        setEdges(nextEdges);

        addStateToHistory("setNodeParent", {
          nodes: nextNodes,
          edges: nextEdges,
        });
        toast.success("Parent link updated.");
      } catch (err: unknown) {
        console.error("Error setting parent link:", err);
        const message =
          err instanceof Error ? err.message : "Failed to set parent link.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [nodes, edges, supabase, setNodes, setEdges, addStateToHistory],
  );

  const triggerEdgeSave = useCallback(
    (change: EdgeChange) => {
      if (change.type === "remove") {
        deleteEdge(change.id);
      }
    },
    [deleteEdge],
  );

  return {
    crudActions: {
      addNode,
      deleteNode,
      saveNodePosition,
      saveNodeContent,
      saveNodeDimensions,
      saveNodeProperties,
      saveNodeMetadata,
      saveNodeAiData,
      addEdge,
      triggerEdgeSave,
      triggerNodeSave,
      deleteEdge,
      saveEdgeProperties,
      setNodeParent,
      groupNodes,
      restoreNode,
      restoreEdge,
    },
    isLoading,
  };
}
