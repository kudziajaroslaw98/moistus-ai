/**
 * Render-time z-index for group container nodes.
 *
 * xyflow computes node z as `zIndex + (selected ? 1000 : 0)` when
 * `elevateNodesOnSelect` is on (default). -1001 keeps even a selected group
 * at -1, below member nodes (default z 0), so members stay clickable/editable.
 */
export const GROUP_NODE_Z_INDEX = -1001;

/** How long a dragged node must hover a group boundary before membership arms. */
export const GROUP_DRAG_DWELL_MS = 600;
