import { nodeTypes } from "@/constants/node-types";
import { deleteNodeById } from "@/helpers/delete-node-and-descendants";
import { createClient } from "@/helpers/supabase/client";
import uuid from "@/helpers/uuid";
import { NotificationType } from "@/hooks/use-notifications";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  EdgeChange,
  getIncomers,
  getNodesBounds,
  Node,
  NodeChange,
  XYPosition,
} from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

interface UseMindMapCRUDProps {
  mapId: string;
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  addStateToHistory: (sourceAction?: string) => void;
  showNotification: (message: string, type: NotificationType) => void;
}

export interface CrudActions {
  addNode: (
    parentNodeId?: string | null,
    content?: string,
    nodeType?: string,
    position?: XYPosition,
    initialData?: Partial<NodeData>,
  ) => Promise<Node<NodeData> | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  saveNodePosition: (nodeId: string, position: XYPosition) => Promise<void>;
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

  deleteEdge: (edgeId: string) => Promise<void>;
  saveEdgeProperties: (
    edgeId: string,
    changes: Partial<EdgeData>,
  ) => Promise<void>;
  groupNodes: (nodeIds: string[]) => Promise<void>;
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
  showNotification,
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
      color: "#6c757d",
      strokeWidth: 2,
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
        showNotification("Cannot add node: Map ID missing.", "error");
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

        const newNodeId = uuid();
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

        Object.keys(newNodeDbData).forEach((key) =>
          newNodeDbData[key] === undefined ||
          (newNodeDbData[key] === null &&
            !(key === "parent_id" || key === "metadata"))
            ? delete newNodeDbData[key]
            : {},
        );

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
          const newEdgeId = uuid();
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
            color: defaultEdgeProps.color,
            strokeWidth: defaultEdgeProps.strokeWidth,
            markerEnd: defaultEdgeProps.markerEnd,
            style: defaultEdgeProps.style,
            metadata: defaultEdgeProps.metadata,
          };

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
                strokeWidth: finalEdgeData.strokeWidth || 2,
              },
              markerEnd: finalEdgeData.markerEnd,
              data: finalEdgeData,
            };
            setEdges((eds) => [...eds, newEdgeReactFlowEdge!]);
          }
        }

        setNodes((nds) => [...nds, newNodeReactFlowNode!]);

        addStateToHistory("addNode");
        showNotification("Node added.", "success");
        return newNodeReactFlowNode;
      } catch (err: unknown) {
        console.error("Error adding node:", err);
        const message =
          err instanceof Error ? err.message : "Failed to add node.";
        showNotification(message, "error");

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      mapId,
      nodes,
      edges,
      supabase,
      setNodes,
      setEdges,
      addStateToHistory,
      showNotification,
    ],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
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
          showNotification("Cannot delete the last root node.", "error");
          return;
        }
      }

      setIsLoading(true);

      try {
        await deleteNodeById(nodeId, supabase as SupabaseClient);

        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) =>
          eds.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId,
          ),
        );

        addStateToHistory("deleteNode");
        showNotification("Node(s) deleted.", "success");
      } catch (err: unknown) {
        console.error("Error deleting node:", err);
        const message =
          err instanceof Error ? err.message : "Failed to delete node(s).";
        showNotification(message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [
      mapId,
      nodes,
      edges,
      supabase,
      setNodes,
      setEdges,
      addStateToHistory,
      showNotification,
    ],
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

  const groupNodes = useCallback(
    async (nodeIds: string[]) => {
      if (nodeIds.length < 2) {
        showNotification("Select at least two nodes to group.", "error");
        return;
      }

      if (!mapId) {
        showNotification("Cannot group nodes: Map ID missing.", "error");
        return;
      }

      setIsLoading(true);
      const groupNodeId = uuid();
      const user = await supabase.auth.getUser();

      if (!user.data.user) {
        showNotification("User not authenticated.", "error");
        setIsLoading(false);
        return;
      }

      const nodesToGroup = nodes.filter((n) => nodeIds.includes(n.id));

      if (nodesToGroup.length !== nodeIds.length) {
        showNotification("Error: Some selected nodes not found.", "error");
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
          showNotification(
            "Error assigning nodes to the group in DB.",
            "error",
          );
        }

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

          return [...updatedNodes, newGroupNode];
        });

        addStateToHistory("groupNodes");
        showNotification("Nodes grouped successfully.", "success");
      } catch (err: unknown) {
        console.error("Error grouping nodes:", err);
        const message =
          err instanceof Error ? err.message : "Failed to group nodes.";
        showNotification(message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, nodes, supabase, setNodes, addStateToHistory, showNotification],
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
        showNotification(message, "error");
      }
    },
    [supabase, showNotification],
  );

  const saveNodeProperties = useCallback(
    async (nodeId: string, changes: Partial<NodeData>) => {
      const validUpdates: Partial<NodeData> = {};
      const editableKeys: (keyof NodeData)[] = [
        "content",
        "tags",
        "status",
        "importance",
        "sourceUrl",
        "node_type",
        "metadata",
        "width",
        "height",
      ];

      editableKeys.forEach((key) => {
        if (changes.hasOwnProperty(key)) {
          if (key === "content" || key === "sourceUrl") {
            if (
              typeof changes[key] === "string" &&
              (changes[key] as string).trim() === ""
            ) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else if (key === "tags") {
            if (Array.isArray(changes[key]) && changes[key]?.length === 0) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
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
          } else if (
            key === "importance" ||
            key === "width" ||
            key === "height"
          ) {
            if (
              changes[key] === undefined ||
              changes[key] === null ||
              changes[key].toString() === ""
            ) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
            }
          } else {
            validUpdates[key] = changes[key];
          }
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        return;
      }

      setIsLoading(true);

      try {
        const { error } = await supabase
          .from("nodes")
          .update({
            ...validUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nodeId);
        if (error) throw error;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,

                  data: {
                    ...n.data,
                    ...validUpdates,

                    metadata:
                      validUpdates.metadata !== undefined
                        ? validUpdates.metadata
                        : n.data?.metadata,
                  },

                  type: validUpdates.node_type ?? n.type,

                  width: validUpdates.width ?? n.width,
                  height: validUpdates.height ?? n.height,
                }
              : n,
          ),
        );

        addStateToHistory("saveNodeProperties");
        showNotification("Node properties saved.", "success");
      } catch (err: unknown) {
        console.error(`Error saving properties for node ${nodeId}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Failed to save properties for node ${nodeId}.`;
        showNotification(message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setNodes, addStateToHistory, showNotification],
  );

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

      if (sourceId === targetId) {
        showNotification("Cannot connect a node to itself.", "error");
        return null;
      }

      const existingEdge = edges.find(
        (e) => e.source === sourceId && e.target === targetId,
      );

      if (existingEdge) {
        showNotification("Connection already exists.", "error");
        return null;
      }

      setIsLoading(true);
      let newReactFlowEdge: AppEdge | null = null;

      try {
        const newEdgeId = uuid();

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

          ...defaultEdgeProps,
          ...initialData,

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
          type: finalEdgeData.type || "editableEdge",
          animated: finalEdgeData.animated ?? false,
          label: finalEdgeData.label,
          style: finalEdgeData.style || {
            stroke: finalEdgeData.color || "#6c757d",
            strokeWidth: finalEdgeData.strokeWidth || 2,
          },
          markerEnd: finalEdgeData.markerEnd,
          data: finalEdgeData,
        };

        setEdges((eds) => [...eds, newReactFlowEdge!]);

        addStateToHistory("addEdge");
        showNotification("Connection saved.", "success");
        return newReactFlowEdge;
      } catch (err: unknown) {
        console.error(`Error saving connection ${sourceId}->${targetId}:`, err);
        const message =
          err instanceof Error ? err.message : "Failed to save connection.";
        showNotification(message, "error");

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mapId, edges, supabase, setEdges, addStateToHistory, showNotification],
  );

  const deleteEdge = useCallback(
    async (edgeId: string): Promise<void> => {
      setIsLoading(true);

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

        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));

        addStateToHistory("deleteEdge");
        showNotification("Connection deleted.", "success");
      } catch (err: unknown) {
        console.error(`Error deleting connection ${edgeId}:`, err);
        const message =
          err instanceof Error ? err.message : "Failed to delete connection.";
        showNotification(message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setEdges, addStateToHistory, showNotification],
  );

  const saveEdgeProperties = useCallback(
    async (edgeId: string, changes: Partial<EdgeData>): Promise<void> => {
      const validUpdates: EdgeData = {} as EdgeData;
      const editableKeys: (keyof EdgeData)[] = [
        "type",
        "label",
        "animated",
        "color",
        "strokeWidth",
        "markerEnd",
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
          } else if (key === "strokeWidth") {
            if (
              changes[key] === undefined ||
              changes[key] === null ||
              changes[key].toString() === ""
            ) {
              validUpdates[key] = null;
            } else {
              validUpdates[key] = changes[key];
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

        setEdges((prev) =>
          prev.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  type: validUpdates.type ?? edge.type,
                  label: validUpdates.label ?? edge.label,
                  animated: validUpdates.animated ?? edge.animated,

                  style: {
                    ...edge.style,
                    stroke: validUpdates.color ?? edge.style?.stroke,
                    strokeWidth:
                      validUpdates.strokeWidth ?? edge.style?.strokeWidth,
                  },
                  markerEnd: validUpdates.markerEnd ?? edge.markerEnd,

                  data: {
                    ...edge.data,
                    ...validUpdates,
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
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setEdges, addStateToHistory, showNotification],
  );

  const triggerNodeSave = useCallback(
    (change: NodeChange) => {
      switch (change.type) {
        case "position": {
          // Only save when dragging stops
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
          // Only save when resizing stops
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
        // Handle other change types if they need saving (e.g., selection, removal handled separately)
      }
    },
    [debounceSave, saveNodePosition, saveNodeDimensions],
  );

  const triggerEdgeSave = useCallback(
    (change: EdgeChange) => {
      // Handle edge saves if needed, e.g., maybe type changes or label edits done directly
      // Removal is handled by deleteEdge
      if (change.type === "remove") {
        deleteEdge(change.id); // Keep delete logic if needed here or triggered elsewhere
      }
      // Add other edge change saves if applicable
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
      addEdge,
      triggerEdgeSave,
      triggerNodeSave,

      deleteEdge,
      saveEdgeProperties,
      groupNodes,
    },
    isLoading,
  };
}
