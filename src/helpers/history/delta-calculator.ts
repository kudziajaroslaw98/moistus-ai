import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { HistoryDelta, HistoryPatchOp } from '@/types/history-state';

const SKIP_KEYS = new Set(['selected', 'dragging', 'measured']);

/**
 * Calculates the delta (difference) between two states using patch-only ops.
 * - add: carries the full minimal entity value
 * - remove: removes the entity by id
 * - patch: dotted path -> new value map of only changed fields
 */
export function calculateDelta(
  oldState: { nodes: AppNode[]; edges: AppEdge[] },
  newState: { nodes: AppNode[]; edges: AppEdge[] }
): HistoryDelta | null {
  const changes: HistoryDelta['changes'] = [];

  // Process nodes
  const oldNodeMap = new Map(oldState.nodes.map((n) => [n.id, n]));
  const newNodeMap = new Map(newState.nodes.map((n) => [n.id, n]));

  // Added nodes
  for (const [id, node] of newNodeMap) {
    if (!oldNodeMap.has(id)) {
      changes.push({ id, type: 'node', op: 'add', value: minimizeNode(node) });
    }
  }

  // Removed nodes
  for (const [id] of oldNodeMap) {
    if (!newNodeMap.has(id)) {
      changes.push({ id, type: 'node', op: 'remove' });
    }
  }

  // Patched nodes
  for (const [id, newNode] of newNodeMap) {
    const oldNode = oldNodeMap.get(id);
    if (oldNode) {
      const patch = diffToDottedPatch(oldNode, newNode);
      if (Object.keys(patch).length > 0) {
        changes.push({ id, type: 'node', op: 'patch', patch });
      }
    }
  }

  // Process edges
  const oldEdgeMap = new Map(oldState.edges.map((e) => [e.id, e]));
  const newEdgeMap = new Map(newState.edges.map((e) => [e.id, e]));

  for (const [id, edge] of newEdgeMap) {
    if (!oldEdgeMap.has(id)) {
      changes.push({ id, type: 'edge', op: 'add', value: minimizeEdge(edge) });
    }
  }

  for (const [id] of oldEdgeMap) {
    if (!newEdgeMap.has(id)) {
      changes.push({ id, type: 'edge', op: 'remove' });
    }
  }

  for (const [id, newEdge] of newEdgeMap) {
    const oldEdge = oldEdgeMap.get(id);
    if (oldEdge) {
      const patch = diffToDottedPatch(oldEdge, newEdge);
      if (Object.keys(patch).length > 0) {
        changes.push({ id, type: 'edge', op: 'patch', patch });
      }
    }
  }

  if (changes.length === 0) return null;

  const operation: HistoryDelta['operation'] =
    changes.length === 1
      ? changes[0].op === 'patch'
        ? 'update'
        : changes[0].op === 'remove'
        ? 'delete'
        : 'add'
      : 'batch';

  const entityType: HistoryDelta['entityType'] = changes.every((c) => c.type === 'node')
    ? 'node'
    : changes.every((c) => c.type === 'edge')
    ? 'edge'
    : 'mixed';

  return { operation, entityType, changes };
}

/**
 * Applies a delta (or array of ops) to a base state.
 * Accepts:
 * - full HistoryDelta
 * - { changes: HistoryPatchOp[] }
 * - HistoryPatchOp[] (array)
 * Also supports legacy before/after deltas for backward compatibility during transition.
 */
export function applyDelta(
  baseState: { nodes: AppNode[]; edges: AppEdge[] },
  deltaOrChanges: HistoryDelta | { changes: any[] } | any[]
): { nodes: AppNode[]; edges: AppEdge[] } {
  let nodes = [...baseState.nodes];
  let edges = [...baseState.edges];

  const changes = normalizeChanges(deltaOrChanges);

  for (const ch of changes) {
    const change = toPatchOp(ch);
    if (change.type === 'node') {
      if (change.op === 'remove') {
        nodes = nodes.filter((n) => n.id !== change.id);
      } else if (change.op === 'add') {
        const idx = nodes.findIndex((n) => n.id === change.id);
        if (idx === -1) nodes.push({ ...(change.value as AppNode), id: change.id } as AppNode);
        else nodes[idx] = { ...nodes[idx], ...(change.value as AppNode) };
      } else if (change.op === 'patch' && change.patch) {
        const idx = nodes.findIndex((n) => n.id === change.id);
        if (idx !== -1) nodes[idx] = applyDottedPatch(nodes[idx], change.patch) as AppNode;
      }
    } else if (change.type === 'edge') {
      if (change.op === 'remove') {
        edges = edges.filter((e) => e.id !== change.id);
      } else if (change.op === 'add') {
        const idx = edges.findIndex((e) => e.id === change.id);
        if (idx === -1) edges.push({ ...(change.value as AppEdge), id: change.id } as AppEdge);
        else edges[idx] = { ...edges[idx], ...(change.value as AppEdge) };
      } else if (change.op === 'patch' && change.patch) {
        const idx = edges.findIndex((e) => e.id === change.id);
        if (idx !== -1) edges[idx] = applyDottedPatch(edges[idx], change.patch) as AppEdge;
      }
    }
  }

  return { nodes, edges };
}

// ---- helpers ----
function normalizeChanges(deltaOrChanges: HistoryDelta | { changes: any[] } | any[]): any[] {
  if (Array.isArray(deltaOrChanges)) return deltaOrChanges;
  if ((deltaOrChanges as any)?.changes) return (deltaOrChanges as any).changes;
  return [];
}

function toPatchOp(change: any): HistoryPatchOp {
  if (change.op) return change as HistoryPatchOp;
  // legacy: before/after
  const { id, type, before, after } = change || {};
  if (before && !after) return { id, type, op: 'remove' };
  if (!before && after) return { id, type, op: 'add', value: after };
  if (before && after) return { id, type, op: 'patch', patch: flattenDotted(after) };
  return { id, type, op: 'patch', patch: {} };
}

function minimizeNode(node: AppNode): Partial<AppNode> {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    // retain measured dims and parent if present
    ...(node as any).measured?.width ? { width: (node as any).measured.width } : {},
    ...(node as any).measured?.height ? { height: (node as any).measured.height } : {},
    ...(node as any).parentId ? { parentId: (node as any).parentId } : {},
  } as Partial<AppNode>;
}

function minimizeEdge(edge: AppEdge): Partial<AppEdge> {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    data: edge.data,
    ...(edge as any).label ? { label: (edge as any).label } : {},
  } as Partial<AppEdge>;
}

function diffToDottedPatch(oldObj: any, newObj: any): Record<string, any> {
  const patch: Record<string, any> = {};
  collectDiff('', oldObj, newObj, patch);
  // do not allow id updates via patch
  delete patch['id'];
  return patch;
}

function collectDiff(base: string, a: any, b: any, out: Record<string, any>) {
  if (deepEqual(a, b)) return;

  if (isPrimitive(a) || isPrimitive(b) || typeof a !== 'object' || typeof b !== 'object') {
    out[base || ''] = b;
    return;
  }

  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    if (SKIP_KEYS.has(key)) continue;
    const path = base ? `${base}.${key}` : key;
    if (!(key in b)) {
      // removed
      out[path] = undefined;
    } else if (!(key in a)) {
      // added
      out[path] = b[key];
    } else {
      collectDiff(path, a[key], b[key], out);
    }
  }
}

function flattenDotted(obj: any, base = ''): Record<string, any> {
  const out: Record<string, any> = {};
  if (obj == null || isPrimitive(obj)) {
    if (base) out[base] = obj;
    return out;
  }
  for (const key of Object.keys(obj)) {
    if (SKIP_KEYS.has(key)) continue;
    const path = base ? `${base}.${key}` : key;
    if (obj[key] != null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(out, flattenDotted(obj[key], path));
    } else {
      out[path] = obj[key];
    }
  }
  return out;
}

function applyDottedPatch<T extends object>(obj: T, patch: Record<string, any>): T {
  const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  for (const [path, value] of Object.entries(patch)) {
    if (!path) continue;
    setByPath(clone, path, value);
  }
  return clone as T;
}

function setByPath(target: any, path: string, value: any) {
  const parts = path.split('.');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    const nextIsIndex = isIndex(parts[i + 1]);
    if (!(seg in cur) || cur[seg] == null) {
      cur[seg] = nextIsIndex ? [] : {};
    }
    cur = cur[seg];
  }
  const last = parts[parts.length - 1];
  if (value === undefined) {
    if (Array.isArray(cur) && isIndex(last)) {
      delete cur[Number(last)];
    } else {
      delete cur[last];
    }
  } else {
    if (Array.isArray(cur) && isIndex(last)) {
      cur[Number(last)] = value;
    } else {
      cur[last] = value;
    }
  }
}

function isIndex(s: string): boolean {
  return /^\d+$/.test(s);
}

function isPrimitive(v: any): boolean {
  return v === null || (typeof v !== 'object' && typeof v !== 'function');
}

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compress a snapshot by removing redundant data (optional pre-storage step).
 */
export function compressSnapshot(state: { nodes: AppNode[]; edges: AppEdge[] }) {
  const nodes = state.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    width: (node as any).measured?.width,
    height: (node as any).measured?.height,
    parentId: (node as any).parentId,
  }));
  const edges = state.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    data: edge.data,
    label: (edge as any).label,
  }));
  return { nodes, edges };
}
