/**
 * Navigation utilities for spatial keyboard navigation in the mind map
 */

import type { AppNode } from '@/types/app-node';
import type {
  NavigationDirection,
  Point,
  NodeWithCenter,
  DirectionalSearchResult,
  NavigationConfig,
} from '@/types/navigation-types';
import { DEFAULT_NAVIGATION_CONFIG } from '@/types/navigation-types';

/**
 * Get the center point of a node
 */
export function getNodeCenter(node: AppNode): Point {
  const width = node.measured?.width ?? node.width ?? 320;
  const height = node.measured?.height ?? node.height ?? 100;

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

/**
 * Calculate Euclidean distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle in degrees from p1 to p2
 * 0° = right, 90° = down, 180° = left, 270° = up
 * Follows canvas coordinate system (y increases downward)
 */
export function calculateAngle(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dy, dx);
  const degrees = (radians * 180) / Math.PI;
  // Normalize to 0-360
  return (degrees + 360) % 360;
}

/**
 * Get the target angle range for a direction
 * Returns [minAngle, maxAngle] in degrees (0-360)
 */
export function getDirectionAngleRange(
  direction: NavigationDirection
): number {
  switch (direction) {
    case 'right':
      return 0; // 0° ±tolerance
    case 'down':
      return 90; // 90° ±tolerance
    case 'left':
      return 180; // 180° ±tolerance
    case 'up':
      return 270; // 270° ±tolerance
  }
}

/**
 * Check if an angle is within a direction cone
 * Handles wraparound at 0°/360°
 */
export function isInDirectionCone(
  angle: number,
  targetAngle: number,
  tolerance: number
): boolean {
  // Normalize angles to 0-360
  const normalizedAngle = (angle + 360) % 360;
  const normalizedTarget = (targetAngle + 360) % 360;

  // Calculate minimum angular distance considering wraparound
  let diff = Math.abs(normalizedAngle - normalizedTarget);
  if (diff > 180) {
    diff = 360 - diff;
  }

  return diff <= tolerance;
}

/**
 * Find the closest node in a given direction using spatial navigation
 */
export function getClosestNodeInDirection(
  currentNode: AppNode,
  direction: NavigationDirection,
  allNodes: AppNode[],
  config: NavigationConfig = DEFAULT_NAVIGATION_CONFIG
): AppNode | null {
  // Get current node center
  const currentCenter = getNodeCenter(currentNode);

  // Filter out current node and calculate centers
  const candidatesWithCenter: NodeWithCenter[] = allNodes
    .filter((node) => node.id !== currentNode.id)
    .map((node) => ({
      node,
      center: getNodeCenter(node),
    }));

  // Get target angle for direction
  const targetAngle = getDirectionAngleRange(direction);

  // Find nodes within angle cone
  let nodesInDirection = candidatesWithCenter.filter(({ center }) => {
    const angle = calculateAngle(currentCenter, center);
    return isInDirectionCone(angle, targetAngle, config.angleTolerance);
  });

  // If no nodes found and widening is enabled, try with wider angle
  if (
    nodesInDirection.length === 0 &&
    config.widenAngleOnEmpty &&
    config.maxWideAngle > config.angleTolerance
  ) {
    nodesInDirection = candidatesWithCenter.filter(({ center }) => {
      const angle = calculateAngle(currentCenter, center);
      return isInDirectionCone(angle, targetAngle, config.maxWideAngle);
    });
  }

  // If still no nodes, return null
  if (nodesInDirection.length === 0) {
    return null;
  }

  // Find closest node by distance
  const results: DirectionalSearchResult[] = nodesInDirection.map(
    ({ node, center }) => ({
      node,
      distance: calculateDistance(currentCenter, center),
      angle: calculateAngle(currentCenter, center),
    })
  );

  // Sort by distance and return closest
  results.sort((a, b) => a.distance - b.distance);

  return results[0]?.node ?? null;
}

/**
 * Calculate position for a new node in a given direction
 */
export function calculateNewNodePosition(
  sourceNode: AppNode,
  direction: NavigationDirection,
  offset: number = DEFAULT_NAVIGATION_CONFIG.createNodeOffset
): Point {
  const sourceCenter = getNodeCenter(sourceNode);
  const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 320;
  const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 100;

  // Default new node dimensions (will be adjusted by NodeEditor)
  const newNodeWidth = 320;
  const newNodeHeight = 100;

  switch (direction) {
    case 'right':
      return {
        x: sourceNode.position.x + sourceWidth + offset,
        y: sourceNode.position.y + (sourceHeight - newNodeHeight) / 2,
      };
    case 'left':
      return {
        x: sourceNode.position.x - offset - newNodeWidth,
        y: sourceNode.position.y + (sourceHeight - newNodeHeight) / 2,
      };
    case 'down':
      return {
        x: sourceNode.position.x + (sourceWidth - newNodeWidth) / 2,
        y: sourceNode.position.y + sourceHeight + offset,
      };
    case 'up':
      return {
        x: sourceNode.position.x + (sourceWidth - newNodeWidth) / 2,
        y: sourceNode.position.y - offset - newNodeHeight,
      };
  }
}

/**
 * Check if a point is within the viewport bounds
 * @param point Point to check
 * @param viewport Viewport bounds { x, y, width, height, zoom }
 */
export function isPointInViewport(
  point: Point,
  viewport: { x: number; y: number; width: number; height: number; zoom: number }
): boolean {
  // Convert flow coordinates to screen coordinates
  const screenX = point.x * viewport.zoom + viewport.x;
  const screenY = point.y * viewport.zoom + viewport.y;

  return (
    screenX >= 0 &&
    screenX <= viewport.width &&
    screenY >= 0 &&
    screenY <= viewport.height
  );
}
