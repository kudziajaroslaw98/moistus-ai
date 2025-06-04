import { AppNode } from "@/types/app-node";

export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate the bounds for a group of nodes
 */
export function calculateGroupBounds(
  nodes: AppNode[],
  padding: number = 40,
): GroupBounds {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 320, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const nodeWidth = node.width || 320;
    const nodeHeight = node.height || 100;

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  });

  // Calculate total width and height
  const contentWidth = Math.max(maxX - minX, 0);
  const contentHeight = Math.max(maxY - minY, 0);

  return {
    x: minX - padding,
    y: minY - padding,
    width: contentWidth + padding * 2,
    height: contentHeight + padding * 2,
  };
}

/**
 * Check if a node is inside a group bounds
 */
export function isNodeInGroupBounds(
  node: AppNode,
  groupBounds: GroupBounds,
): boolean {
  const nodeWidth = node.width || 320;
  const nodeHeight = node.height || 100;
  const nodeRight = node.position.x + nodeWidth;
  const nodeBottom = node.position.y + nodeHeight;
  const groupRight = groupBounds.x + groupBounds.width;
  const groupBottom = groupBounds.y + groupBounds.height;

  // Add small tolerance to prevent edge cases
  const tolerance = 5;

  return (
    node.position.x >= groupBounds.x - tolerance &&
    node.position.y >= groupBounds.y - tolerance &&
    nodeRight <= groupRight + tolerance &&
    nodeBottom <= groupBottom + tolerance
  );
}

/**
 * Find nodes that are visually contained within a group
 */
export function findNodesInGroup(
  allNodes: AppNode[],
  groupNode: AppNode,
): AppNode[] {
  if (!groupNode.data.metadata?.isGroup) return [];

  const groupBounds = {
    x: groupNode.position.x,
    y: groupNode.position.y,
    width: groupNode.width || 320,
    height: groupNode.height || 100,
  };

  return allNodes.filter(
    (node) =>
      node.id !== groupNode.id &&
      !node.data.metadata?.isGroup &&
      isNodeInGroupBounds(node, groupBounds),
  );
}

/**
 * Get all nodes that belong to a specific group
 */
export function getGroupChildren(
  allNodes: AppNode[],
  groupId: string,
): AppNode[] {
  return allNodes.filter((node) => node.data.metadata?.groupId === groupId);
}

/**
 * Get the group node that contains a specific node
 */
export function getParentGroup(
  allNodes: AppNode[],
  nodeId: string,
): AppNode | null {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node?.data.metadata?.groupId) return null;

  return allNodes.find((n) => n.id === node.data.metadata?.groupId) || null;
}

/**
 * Check if two nodes belong to the same group
 */
export function areNodesInSameGroup(
  allNodes: AppNode[],
  nodeId1: string,
  nodeId2: string,
): boolean {
  const node1 = allNodes.find((n) => n.id === nodeId1);
  const node2 = allNodes.find((n) => n.id === nodeId2);

  if (!node1 || !node2) return false;

  const group1 = node1.data.metadata?.groupId;
  const group2 = node2.data.metadata?.groupId;

  return group1 !== undefined && group2 !== undefined && group1 === group2;
}

/**
 * Generate a default group name based on the number of existing groups
 */
export function generateGroupName(allNodes: AppNode[]): string {
  const groupCount = allNodes.filter(
    (node) => node.data.metadata?.isGroup,
  ).length;
  return `Group ${groupCount + 1}`;
}

/**
 * Calculate the center point of a group of nodes
 */
export function calculateGroupCenter(nodes: AppNode[]): {
  x: number;
  y: number;
} {
  if (nodes.length === 0) return { x: 0, y: 0 };

  const bounds = calculateGroupBounds(nodes, 0);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/**
 * Sort nodes by their group membership for better organization
 */
export function sortNodesByGroup(nodes: AppNode[]): AppNode[] {
  return [...nodes].sort((a, b) => {
    const aGroupId = a.data.metadata?.groupId || "";
    const bGroupId = b.data.metadata?.groupId || "";

    // Groups come first
    if (a.data.metadata?.isGroup && !b.data.metadata?.isGroup) return -1;
    if (!a.data.metadata?.isGroup && b.data.metadata?.isGroup) return 1;

    // Then sort by group membership
    if (aGroupId !== bGroupId) {
      return aGroupId.localeCompare(bGroupId);
    }

    // Finally by creation date
    return (
      new Date(a.data.created_at).getTime() -
      new Date(b.data.created_at).getTime()
    );
  });
}
