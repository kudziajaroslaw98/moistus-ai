import { STORE_SAVE_DEBOUNCE_MS } from "@/constants/store-save-debounce-ms";
import generateUuid from "@/helpers/generate-uuid";
import withLoadingAndToast from "@/helpers/with-loading-and-toast";
import type { AppNode } from "@/types/app-node";
import { AvailableNodeTypes } from "@/types/available-node-types";
import type { NodeData } from "@/types/node-data";
import { NodesTableType } from "@/types/nodes-table-type";
import { debouncePerKey } from "@/utils/debounce-per-key";
import { applyNodeChanges, type OnNodesChange } from "@xyflow/react";
import { toast } from "sonner";
import type { StateCreator } from "zustand";
import type { AppState } from "../app-state";

export interface NodesSlice {
  // Node state
  nodes: AppNode[];
  selectedNodes: AppNode[];
  lastSavedNodeTimestamps: Record<string, number>;

  // Node handlers
  onNodesChange: OnNodesChange<AppNode>;

  // Node setters
  setNodes: (nodes: AppNode[]) => void;
  setSelectedNodes: (selectedNodes: AppNode[]) => void;

  // Node getters
  getNode: (id: string) => AppNode | undefined;

  // Node actions
  addNode: ({
    parentNode,
    content,
    nodeType,
    data,
    position,
    toastId,
  }: {
    parentNode: Partial<AppNode> | null;
    content?: string;
    nodeType?: AvailableNodeTypes;
    data?: Partial<NodeData>;
    position?: { x: number; y: number };
    toastId?: string;
  }) => Promise<void>;
  updateNode: (props: {
    nodeId: string;
    data: Partial<NodeData>;
  }) => Promise<void>;
  deleteNodes: (nodesToDelete: AppNode[]) => Promise<void>;
  triggerNodeSave: (nodeId: string) => void;

  // Node hierarchy actions
  getDirectChildrenCount: (nodeId: string) => number;
  getDescendantNodeIds: (nodeId: string) => string[];
  getVisibleNodes: () => AppNode[];
  toggleNodeCollapse: (nodeId: string) => Promise<void>;
}

export const createNodeSlice: StateCreator<AppState, [], [], NodesSlice> = (
  set,
  get,
) => ({
  nodes: [],
  selectedNodes: [],
  lastSavedNodeTimestamps: {},

  onNodesChange: (changes) => {
    // Apply changes as before
    const updatedNodes = applyNodeChanges(changes, get().nodes);

    // Handle group movement synchronization
    const finalNodes = [...updatedNodes];
    const processedGroupIds = new Set<string>();

    changes.forEach((change) => {
      if (change.type === "position" && change.position) {
        const movedNode = finalNodes.find((n) => n.id === change.id);

        // If a group is moved, move its children (during dragging and after)
        if (
          movedNode?.data.metadata?.isGroup &&
          !processedGroupIds.has(change.id)
        ) {
          processedGroupIds.add(change.id);
          const groupChildren =
            (movedNode.data.metadata.groupChildren as string[]) || [];
          const oldPosition = get().nodes.find(
            (n) => n.id === change.id,
          )?.position;

          if (oldPosition && groupChildren.length > 0) {
            const deltaX = change.position.x - oldPosition.x;
            const deltaY = change.position.y - oldPosition.y;

            groupChildren.forEach((childId) => {
              const childIndex = finalNodes.findIndex((n) => n.id === childId);

              if (childIndex !== -1) {
                finalNodes[childIndex] = {
                  ...finalNodes[childIndex],
                  position: {
                    x: finalNodes[childIndex].position.x + deltaX,
                    y: finalNodes[childIndex].position.y + deltaY,
                  },
                };
              }
            });
          }
        }
      }
    });

    set({ nodes: finalNodes });

    // Trigger debounced saves for relevant node changes
    changes.forEach((change) => {
      // Only save when changes are complete (not during dragging/resizing)
      if (
        change.type === "position" &&
        change.position &&
        change.dragging === false
      ) {
        get().triggerNodeSave(change.id);

        // Also save moved children when group is moved
        const movedNode = finalNodes.find((n) => n.id === change.id);

        if (movedNode?.data.metadata?.isGroup) {
          const groupChildren =
            (movedNode.data.metadata.groupChildren as string[]) || [];
          groupChildren.forEach((childId) => {
            get().triggerNodeSave(childId);
          });
        }
      } else if (
        change.type === "dimensions" &&
        change.dimensions &&
        change.resizing === false
      ) {
        get().triggerNodeSave(change.id);
      } else if (change.type === "select" || change.type === "remove") {
        // No need to save for these change types
        return;
      } else if (change.type === "add") {
        // New nodes are handled elsewhere
        return;
      } else if (change.type === "replace") {
        // Data changes should trigger a save
        get().triggerNodeSave(change.id);
      }
    });
  },

  setNodes: (nodes) => {
    set({ nodes });
  },
  setSelectedNodes: (selectedNodes) => {
    set({ selectedNodes });

    // Update selectedNodeId for comments panel
    if (selectedNodes.length === 1) {
      set({ selectedNodeId: selectedNodes[0].id });
    } else {
      set({ selectedNodeId: null });
    }
  },

  getNode: (id: string) => {
    const nodes = get().nodes;
    return nodes.find((node) => node.id === id);
  },

  addNode: withLoadingAndToast(
    async (props: {
      parentNode: Partial<AppNode> | null;
      content?: string;
      nodeType?: AvailableNodeTypes;
      data?: Partial<NodeData>;
      position?: { x: number; y: number };
      toastId?: string;
    }) => {
      let { nodeType = "defaultNode" } = props;
      const { parentNode, position, data = {}, content = "New node" } = props;
      const { mapId, supabase, nodes, edges, addStateToHistory } = get();

      if (!mapId) {
        toast.loading(
          "Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.",
          { id: props.toastId },
        );
        nodeType = "defaultNode";
      }

      const newNodeId = generateUuid();
      let newNode: AppNode | null = null;
      let newNodePosition = position;

      if (position) {
        newNodePosition = position;
      } else if (parentNode && parentNode.position) {
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

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const newNodeDbData: Omit<NodeData, "created_at" | "updated_at"> & {
        created_at?: string;
        updated_at?: string;
      } = {
        id: newNodeId,
        user_id: user.data.user.id,
        map_id: mapId,
        parent_id: parentNode?.id,
        content: content,
        position_x: newNodePosition.x,
        position_y: newNodePosition.y,
        node_type: nodeType,
        ...data,
      };

      const { data: insertedNodeData, error: nodeInsertError } = await supabase
        .from("nodes")
        .insert([newNodeDbData])
        .select("*")
        .single();

      if (nodeInsertError || !insertedNodeData) {
        throw new Error(
          nodeInsertError?.message || "Failed to save new node to database.",
        );
      }

      newNode = {
        id: insertedNodeData.id,
        position: {
          x: insertedNodeData.position_x,
          y: insertedNodeData.position_y,
        },

        data: insertedNodeData,
        type: insertedNodeData.node_type || "defaultNode",

        width: insertedNodeData.width || undefined,
        height: insertedNodeData.height || undefined,
      };

      const finalNodes = [...nodes, newNode];
      const finalEdges = [...edges];

      const addEdge = get().addEdge;

      if (parentNode && parentNode.id) {
        const newEdge = await addEdge(
          parentNode.id,
          newNode.id,
          {
            source: parentNode.id,
            target: newNode.id,
          },
          props.toastId,
        );

        finalEdges.push(newEdge);
      }

      addStateToHistory("addNode", { nodes: finalNodes, edges: finalEdges });

      set({
        nodes: finalNodes,
        edges: finalEdges,
      });
    },
    "isAddingContent",
    {
      initialMessage: "Adding node...",
      errorMessage: "Failed to add node.",
      successMessage: "Node added successfully.",
    },
  ),
  updateNode: withLoadingAndToast(
    async (props: { nodeId: string; data: Partial<NodeData> }) => {
      const { nodeId, data } = props;
      let updatedNode: AppNode | null = null;

      // First update the local state
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === nodeId) {
            updatedNode = {
              ...node,
              type: data.node_type || node.type,
              width: data.width || node.width,
              height: data.height || node.height,
              position: {
                x: data.position_x || node.position.x,
                y: data.position_y || node.position.y,
              },
              data: {
                ...node.data,
                ...data,
                metadata: {
                  ...node.data.metadata,
                  ...data.metadata,
                },
                aiData: {
                  ...node.data.aiData,
                  ...data.aiData,
                },
              },
            };

            return updatedNode;
          }

          return node;
        }),
        nodeInfo: updatedNode,
      }));

      // Trigger debounced save to persist changes
      get().triggerNodeSave(nodeId);
    },
    "isAddingContent",
    {
      initialMessage: "Updating node...",
      errorMessage: "Failed to update node.",
      successMessage: "Node updated successfully.",
    },
  ),
  deleteNodes: withLoadingAndToast(
    async (nodesToDelete: AppNode[]) => {
      const {
        mapId,
        supabase,
        edges,
        nodes: allNodes,
        addStateToHistory,
      } = get();

      if (!mapId || !nodesToDelete) return;

      const edgesToDelete = edges.filter((edge) =>
        nodesToDelete.some(
          (node) => edge.source === node.id || edge.target === node.id,
        ),
      );

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const { error: deleteError } = await supabase
        .from("nodes")
        .delete()
        .in(
          "id",
          nodesToDelete.map((node) => node.id),
        )
        .eq("user_id", user.data.user.id);

      const { error: deleteEdgesError } = await supabase
        .from("edges")
        .delete()
        .in(
          "id",
          edgesToDelete.map((edge) => edge.id),
        )
        .eq("user_id", user.data.user.id);

      if (deleteError) {
        throw new Error(deleteError.message || "Failed to delete nodes.");
      }

      if (deleteEdgesError) {
        throw new Error(deleteEdgesError.message || "Failed to delete edges.");
      }

      const finalNodes = allNodes.filter((n) => !nodesToDelete.includes(n));
      const finalEdges = edges.filter((e) => !edgesToDelete.includes(e));

      addStateToHistory("deleteNode", { nodes: finalNodes, edges: finalEdges });

      set({
        nodes: finalNodes,
        edges: finalEdges,
      });
    },
    "isAddingContent",
    {
      initialMessage: "Deleting nodes...",
      errorMessage: "Failed to delete nodes.",
      successMessage: "Nodes deleted successfully.",
    },
  ),

  triggerNodeSave: debouncePerKey(
    withLoadingAndToast(
      async (nodeId: string) => {
        const { nodes, supabase, mapId } = get();
        const node = nodes.find((n) => n.id === nodeId);

        if (!node || !node.data) {
          console.error(`Node with id ${nodeId} not found or has invalid data`);
          throw new Error(
            `Node with id ${nodeId} not found or has invalid data`,
          );
        }

        set((state) => ({
          lastSavedNodeTimestamps: {
            ...state.lastSavedNodeTimestamps,
            [nodeId]: Date.now(),
          },
        }));

        if (!mapId) {
          console.error("Cannot save node: No mapId defined");
          throw new Error("Cannot save node: No mapId defined");
        }

        const user_id = (await supabase.auth.getUser()).data.user?.id;

        if (!user_id) {
          throw new Error("Not authenticated");
        }

        // Prepare node data for saving, ensuring type safety
        const nodeData: NodesTableType = {
          id: nodeId,
          map_id: mapId,
          user_id: user_id,
          content: node.data.content || "",
          metadata: node.data.metadata || {},
          aiData: node.data.aiData || {},
          position_x: node.position.x,
          position_y: node.position.y,
          width: node.width,
          height: node.height,
          node_type: node.type || "defaultNode",
          updated_at: new Date().toISOString(),
          created_at: node.data.created_at,
          parent_id: node.parentId || node.data.parent_id || null,
        };

        // Save node data to Supabase
        supabase
          .from("nodes")
          .update(nodeData)
          .eq("id", nodeId)
          .eq("map_id", mapId)
          .then(({ error }) => {
            if (error) {
              console.error("Error saving node:", error);
              throw new Error("Failed to save node changes");
            }
          });
      },
      "isSavingNode",
      {
        initialMessage: "Saving node changes...",
        errorMessage: "Failed to save node chanes.",
        successMessage: "Saved node successfully.",
      },
    ),
    STORE_SAVE_DEBOUNCE_MS,
    (nodeId: string) => nodeId, // getKey function for triggerNodeSave
  ),
  getDirectChildrenCount: (nodeId: string): number => {
    const { edges } = get();
    return edges.filter((edge) => edge.source === nodeId).length;
  },

  getDescendantNodeIds: (nodeId: string): string[] => {
    const { edges } = get();
    const descendants: string[] = [];
    const visited = new Set<string>();

    const findDescendants = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const childEdges = edges.filter((edge) => edge.source === currentNodeId);

      for (const edge of childEdges) {
        if (!visited.has(edge.target)) {
          descendants.push(edge.target);
          findDescendants(edge.target);
        }
      }
    };

    findDescendants(nodeId);
    return descendants;
  },

  getVisibleNodes: (): AppNode[] => {
    const { nodes } = get();
    const collapsedNodes = nodes.filter(
      (node) => node.data.metadata?.isCollapsed,
    );
    const hiddenNodeIds = new Set<string>();

    // Collect all descendant IDs of collapsed nodes
    for (const collapsedNode of collapsedNodes) {
      const descendants = get().getDescendantNodeIds(collapsedNode.id);
      descendants.forEach((id) => hiddenNodeIds.add(id));
    }

    // Filter out hidden nodes first
    const visibleNodes = nodes.filter((node) => !hiddenNodeIds.has(node.id));

    // Now handle groups - hide groups if all their children are hidden
    const groupNodes = visibleNodes.filter(
      (node) => node.data.metadata?.isGroup,
    );
    const finalHiddenNodeIds = new Set(hiddenNodeIds);

    for (const groupNode of groupNodes) {
      const groupChildren =
        (groupNode.data.metadata?.groupChildren as string[]) || [];

      // If all group children are hidden, hide the group too
      if (
        groupChildren.length > 0 &&
        groupChildren.every((childId) => hiddenNodeIds.has(childId))
      ) {
        finalHiddenNodeIds.add(groupNode.id);
      }
    }

    // Return only visible nodes (excluding groups with all hidden children)
    return nodes.filter((node) => !finalHiddenNodeIds.has(node.id));
  },

  toggleNodeCollapse: async (nodeId: string): Promise<void> => {
    const { nodes, updateNode, addStateToHistory } = get();
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      console.error(`Node with id ${nodeId} not found`);
      return;
    }

    const currentCollapsedState = node.data.metadata?.isCollapsed ?? false;
    const newCollapsedState = !currentCollapsedState;

    // Update the node's collapse state
    await updateNode({
      nodeId,
      data: {
        metadata: {
          ...node.data.metadata,
          isCollapsed: newCollapsedState,
        },
      },
    });

    // Add to history for undo/redo
    addStateToHistory(newCollapsedState ? "collapseNode" : "expandNode", {
      nodes: get().nodes,
      edges: get().edges,
    });
  },
});
