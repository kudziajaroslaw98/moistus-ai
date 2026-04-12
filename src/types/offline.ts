export type OfflineMutationAction = 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';

export interface OfflineTablePayload {
	table: string;
	values?: Record<string, unknown> | Array<Record<string, unknown>>;
	match?: Record<string, string | number | boolean | null>;
	select?: string | null;
}

export interface OfflineRpcPayload {
	rpc: string;
	args?: Record<string, unknown>;
}

export type OfflineMutationPayload = OfflineTablePayload | OfflineRpcPayload;

export interface OfflineQueuedOp {
	opId: string;
	entity: string;
	action: OfflineMutationAction;
	payload: OfflineMutationPayload;
	baseVersion: string | null;
	queuedAt: string;
	attempts: number;
	status: 'queued' | 'processing' | 'dead_letter';
	lastError: string | null;
}

export interface OfflineConflictLogItem {
	id: string;
	opId: string;
	entity: string;
	action: OfflineMutationAction;
	baseVersion: string | null;
	serverVersion: string | null;
	details: Record<string, unknown>;
	createdAt: string;
}

export interface OfflineBatchOpResult {
	opId: string;
	status: 'applied' | 'duplicate' | 'conflict' | 'failed';
	message?: string;
	serverVersion?: string | null;
	details?: Record<string, unknown>;
}

export interface OfflineBatchResponse {
	results: OfflineBatchOpResult[];
	appliedCount: number;
	conflictCount: number;
	failedCount: number;
}

