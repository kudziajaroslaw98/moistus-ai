import { NodeData } from "@/types/node-data";
import { Node, Position, XYPosition, type InternalNode } from "@xyflow/react";

// Helper function to calculate the intersection point of a line and a rectangle
function getNodeIntersection(
  intersectionNode: InternalNode<Node<NodeData>>,
  targetNode: InternalNode<Node<NodeData>>,
): XYPosition {
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
    intersectionNode.measured;

  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;

  const w = intersectionNodeWidth! / 2;
  const h = intersectionNodeHeight! / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.measured.width! / 2;
  const y1 = targetPosition.y + targetNode.measured.height! / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

function getEdgePosition(
  node: InternalNode<Node<NodeData>>,
  intersectionPoint: XYPosition,
) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }

  if (px >= nx + n.measured.width! - 1) {
    return Position.Right;
  }

  if (py <= ny + 1) {
    return Position.Top;
  }

  if (py >= n.y + n.measured.height! - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

/**
 * Returns a point on the line from (x1, y1) to (x2, y2) at distance 'd' from (x2, y2) towards (x1, y1)
 */
function movePointBack(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  d: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: x2, y: y2 };
  const ratio = (len - d) / len;
  return {
    x: x1 + dx * ratio,
    y: y1 + dy * ratio,
  };
}

// Returns the new source and target positions for a floating edge
export function getFloatingEdgePath(
  sourceNode: InternalNode<Node<NodeData>>,
  targetNode: InternalNode<Node<NodeData>>,
  offset = 12,
) {
  const sourcePoint = getNodeIntersection(sourceNode, targetNode);
  const targetPoint = getNodeIntersection(targetNode, sourceNode);

  const sourcePos = getEdgePosition(sourceNode, sourcePoint);
  const targetPos = getEdgePosition(targetNode, targetPoint);

  // Move the target point back by MARKER_PADDING px so the edge doesn't touch the node
  const adjustedTarget = movePointBack(
    sourcePoint.x,
    sourcePoint.y,
    targetPoint.x,
    targetPoint.y,
    offset,
  );

  return {
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: adjustedTarget.x,
    targetY: adjustedTarget.y,
    sourcePos,
    targetPos,
  };
}
