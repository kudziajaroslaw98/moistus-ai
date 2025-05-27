import generateUuid from "@/helpers/generate-uuid";
import withLoadingAndToast from "@/helpers/with-loading-and-toast";
import {
  calculateGroupBounds,
  generateGroupName,
} from "@/utils/group/group-utils";
import { StateCreator } from "zustand";
import { AppState } from "../app-state";

export interface GroupsSlice {
  // Group actions
  createGroupFromSelected: (label?: string) => Promise<void>;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => Promise<void>;
  removeNodesFromGroup: (nodeIds: string[]) => Promise<void>;
  deleteGroup: (groupId: string, preserveChildren?: boolean) => Promise<void>;
  ungroupNodes: (groupId: string) => Promise<void>;
}

export const createGroupsSlice: StateCreator<AppState, [], [], GroupsSlice> = (
  set,
  get,
) => ({
  createGroupFromSelected: withLoadingAndToast(
    async (label?: string): Promise<void> => {
      const { selectedNodes, nodes, addNode, updateNode } = get();

      if (selectedNodes.length < 2) {
        throw new Error("At least 2 nodes must be selected to create a group");
      }

      // Calculate bounds for the group using utilities
      const padding = 40;
      const bounds = calculateGroupBounds(selectedNodes, padding);
      const groupLabel = label || generateGroupName(nodes);
      const groupId = generateUuid();

      // Create the group node
      await addNode({
        parentNode: null,
        content: groupLabel,
        nodeType: "groupNode",
        position: { x: bounds.x, y: bounds.y },
        data: {
          id: groupId,
          width: bounds.width,
          height: bounds.height,
          metadata: {
            isGroup: true,
            groupChildren: selectedNodes.map((n) => n.id),
            label: groupLabel,
            backgroundColor: "rgba(113, 113, 122, 0.1)",
            borderColor: "#52525b",
            groupPadding: padding,
          },
        },
      });

      // Update selected nodes to reference this group
      for (const node of selectedNodes) {
        await updateNode({
          nodeId: node.id,
          data: {
            metadata: {
              ...node.data.metadata,
              groupId: groupId,
            },
          },
        });
      }
    },
    "isAddingContent",
    {
      initialMessage: "Creating group...",
      successMessage: "Group created successfully",
      errorMessage: "Failed to create group",
    },
  ),

  addNodesToGroup: withLoadingAndToast(
    async (groupId: string, nodeIds: string[]): Promise<void> => {
      const { nodes, updateNode } = get();

      const groupNode = nodes.find((n) => n.id === groupId);

      if (!groupNode || !groupNode.data.metadata?.isGroup) {
        throw new Error("Invalid group node");
      }

      const currentChildren =
        (groupNode.data.metadata.groupChildren as string[]) || [];
      const newChildren = [...new Set([...currentChildren, ...nodeIds])];

      // Update group node with new children
      await updateNode({
        nodeId: groupId,
        data: {
          metadata: {
            ...groupNode.data.metadata,
            groupChildren: newChildren,
          },
        },
      });

      // Update target nodes to reference this group
      for (const nodeId of nodeIds) {
        await updateNode({
          nodeId,
          data: {
            metadata: {
              groupId: groupId,
            },
          },
        });
      }
    },
    "isAddingContent",
    {
      initialMessage: "Adding nodes to group...",
      successMessage: "Nodes added to group",
      errorMessage: "Failed to add nodes to group",
    },
  ),

  removeNodesFromGroup: withLoadingAndToast(
    async (nodeIds: string[]): Promise<void> => {
      const { nodes, updateNode } = get();

      for (const nodeId of nodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node?.data.metadata?.groupId) continue;

        const groupId = node.data.metadata.groupId;
        const groupNode = nodes.find((n) => n.id === groupId);

        if (groupNode?.data.metadata?.isGroup) {
          const currentChildren =
            (groupNode.data.metadata.groupChildren as string[]) || [];
          const newChildren = currentChildren.filter((id) => id !== nodeId);

          // Update group node
          await updateNode({
            nodeId: groupId,
            data: {
              metadata: {
                ...groupNode.data.metadata,
                groupChildren: newChildren,
              },
            },
          });
        }

        // Remove group reference from node
        await updateNode({
          nodeId,
          data: {
            metadata: {
              ...node.data.metadata,
              groupId: undefined,
            },
          },
        });
      }
    },
    "isAddingContent",
    {
      initialMessage: "Removing nodes from group...",
      successMessage: "Nodes removed from group",
      errorMessage: "Failed to remove nodes from group",
    },
  ),

  deleteGroup: withLoadingAndToast(
    async (
      groupId: string,
      preserveChildren: boolean = true,
    ): Promise<void> => {
      const { nodes, deleteNodes, updateNode } = get();

      const groupNode = nodes.find((n) => n.id === groupId);

      if (!groupNode?.data.metadata?.isGroup) {
        throw new Error("Invalid group node");
      }

      const childNodeIds =
        (groupNode.data.metadata.groupChildren as string[]) || [];

      if (preserveChildren) {
        // Remove group reference from child nodes
        for (const nodeId of childNodeIds) {
          await updateNode({
            nodeId,
            data: {
              metadata: {
                groupId: undefined,
              },
            },
          });
        }
      } else {
        // Delete child nodes
        const childNodes = nodes.filter((n) => childNodeIds.includes(n.id));

        if (childNodes.length > 0) {
          await deleteNodes(childNodes);
        }
      }

      // Delete the group node
      await deleteNodes([groupNode]);
    },
    "isAddingContent",
    {
      initialMessage: "Deleting group...",
      successMessage: "Group deleted successfully",
      errorMessage: "Failed to delete group",
    },
  ),

  ungroupNodes: withLoadingAndToast(
    async (groupId: string): Promise<void> => {
      const { nodes, updateNode, deleteNodes } = get();

      const groupNode = nodes.find((n) => n.id === groupId);

      if (!groupNode?.data.metadata?.isGroup) {
        throw new Error("Invalid group node");
      }

      const childNodeIds =
        (groupNode.data.metadata.groupChildren as string[]) || [];

      // Remove group reference from all child nodes
      for (const nodeId of childNodeIds) {
        await updateNode({
          nodeId,
          data: {
            metadata: {
              groupId: undefined,
            },
          },
        });
      }

      // Delete the group node
      await deleteNodes([groupNode]);
    },
    "isAddingContent",
    {
      initialMessage: "Ungrouping nodes...",
      successMessage: "Nodes ungrouped successfully",
      errorMessage: "Failed to ungroup nodes",
    },
  ),
});
