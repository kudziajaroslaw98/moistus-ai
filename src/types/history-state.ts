import { Node } from '@xyflow/react';
import { AppEdge } from './app-edge';
import { NodeData } from './node-data';

// NOTE: This is the existing in-memory history state used across the app today.
// We are keeping it intact for backward-compatibility while we introduce new
// types to support DB-backed history. Existing UI and store logic will continue
// to use this interface until we migrate them.
export interface HistoryState {
	nodes: Node<NodeData>[];
	edges: AppEdge[];
	actionName?: string; // Optional name of the action that created this state
	timestamp: number; // Timestamp when the state was created
}

// ===== New types for DB-backed history (non-breaking additions) =====

// Bidirectional patch structure (supports undo/redo)
export interface HistoryPatchOp {
	id: string;
	type: 'node' | 'edge';
	op: 'add' | 'remove' | 'patch';
	value?: Partial<Node<NodeData> | AppEdge>; // for add (forward)
	removedValue?: Partial<Node<NodeData> | AppEdge>; // for remove (backward - what was removed)
	patch?: Record<string, any>; // for patch (dotted paths - forward: old -> new)
	reversePatch?: Record<string, any>; // for patch (backward: new -> old, enables undo)
}

export interface HistoryDelta {
	operation: 'add' | 'update' | 'delete' | 'batch'; // top-level label
	entityType: 'node' | 'edge' | 'mixed';
	changes: HistoryPatchOp[];
}

// Delta with attribution for collaborative history
export interface AttributedHistoryDelta extends HistoryDelta {
	userId: string;
	userName: string;
	userAvatar?: string;
	actionName: string;
	timestamp: number;
}

export interface HistoryDbItem {
	id: string;
	snapshot_id: string;
	event_index: number;
	action_name: string;
	operation_type: string;
	entity_type: string;
	created_at: string;
}

// API response types for listing history
export interface HistoryItem {
	id: string;
	type: 'snapshot' | 'event';
	snapshotIndex?: number;
	snapshotId?: string;
	eventIndex?: number;
	actionName: string;
	nodeCount?: number;
	edgeCount?: number;
	operationType?: string;
	entityType?: string;
	isMajor?: boolean;
	timestamp: number;
}

export interface HistoryListResponse {
	items: HistoryItem[];
	total: number;
	hasMore: boolean;
	snapshots: number;
	events: number;
}

// Retention policy types and constants (free/pro)
export interface RetentionPolicy {
	maxAge: number; // milliseconds
	maxSnapshots: number;
	maxEventsPerSnapshot: number;
	inMemoryCache: number;
	storageQuota: number; // bytes
	cleanupInterval: number; // milliseconds
	snapshotFrequency: {
		byActions: number;
		byTime: number; // milliseconds
	};
	allowManualCheckpoints?: boolean;
}

export const RETENTION_POLICIES: Record<'free' | 'pro', RetentionPolicy> = {
	free: {
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		maxSnapshots: 20,
		maxEventsPerSnapshot: 5,
		inMemoryCache: 10,
		storageQuota: 5 * 1024 * 1024, // 5MB
		cleanupInterval: 60 * 60 * 1000, // 1 hour
		snapshotFrequency: {
			byActions: 10,
			byTime: 30 * 60 * 1000, // 30 minutes
		},
	},
	pro: {
		maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
		maxSnapshots: 100,
		maxEventsPerSnapshot: 20,
		inMemoryCache: 20,
		storageQuota: 50 * 1024 * 1024, // 50MB
		cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
		snapshotFrequency: {
			byActions: 10,
			byTime: 15 * 60 * 1000, // 15 minutes
		},
		allowManualCheckpoints: true,
	},
};
