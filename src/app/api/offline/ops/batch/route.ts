import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import type {
	OfflineBatchOpResult,
	OfflineBatchResponse,
	OfflineMutationAction,
	OfflineQueuedOp,
	OfflineTablePayload,
} from '@/types/offline';
import { z } from 'zod';

const primitiveValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
]);

const unknownRecordSchema = z.record(z.string(), z.unknown());
const primitiveRecordSchema = z.record(z.string(), primitiveValueSchema);

const tablePayloadSchema = z.object({
	table: z.string().min(1),
	values: z.union([unknownRecordSchema, z.array(unknownRecordSchema)]).optional(),
	match: primitiveRecordSchema.optional(),
	select: z.string().nullable().optional(),
});

const rpcPayloadSchema = z.object({
	rpc: z.string().min(1),
	args: unknownRecordSchema.optional(),
});

const operationSchema = z.object({
	opId: z.string().uuid(),
	entity: z.string().min(1),
	action: z.enum(['insert', 'update', 'delete', 'upsert', 'rpc']),
	payload: z.union([tablePayloadSchema, rpcPayloadSchema]),
	baseVersion: z.string().nullable().optional(),
	queuedAt: z.string(),
	attempts: z.number().optional(),
	status: z.enum(['queued', 'processing', 'dead_letter']).optional(),
	lastError: z.string().nullable().optional(),
});

const batchSchema = z.object({
	operations: z.array(operationSchema).min(1).max(100),
});

const applyMatchFilters = (
	query: any,
	match: Record<string, string | number | boolean | null> | undefined
) => {
	if (!match) {
		return query;
	}

	let current = query;
	for (const [key, value] of Object.entries(match)) {
		current = current.eq(key, value);
	}
	return current;
};

const tryResolveServerVersion = async (
	supabase: any,
	payload: OfflineTablePayload
): Promise<string | null> => {
	if (!payload.match) {
		return null;
	}

	let query = supabase.from(payload.table).select('updated_at').limit(1);
	query = applyMatchFilters(query, payload.match);
	const { data } = await query.maybeSingle();
	const updatedAt = data?.updated_at;
	return typeof updatedAt === 'string' ? updatedAt : null;
};

const persistReceipt = async (
	supabase: any,
	params: {
		userId: string;
		opId: string;
		entity: string;
		action: OfflineMutationAction;
		status: 'applied' | 'duplicate' | 'conflict';
		serverVersion?: string | null;
		details?: Record<string, unknown>;
	}
) => {
	await supabase.from('offline_op_receipts').upsert(
		{
			user_id: params.userId,
			op_id: params.opId,
			entity: params.entity,
			action: params.action,
			result_status: params.status,
			server_version: params.serverVersion ?? null,
			details: params.details ?? {},
			processed_at: new Date().toISOString(),
		},
		{ onConflict: 'user_id,op_id' }
	);
};

const persistConflict = async (
	supabase: any,
	params: {
		userId: string;
		opId: string;
		entity: string;
		action: OfflineMutationAction;
		baseVersion: string | null;
		serverVersion: string | null;
		details?: Record<string, unknown>;
	}
) => {
	await supabase.from('offline_sync_conflicts').insert({
		user_id: params.userId,
		op_id: params.opId,
		entity: params.entity,
		action: params.action,
		base_version: params.baseVersion,
		server_version: params.serverVersion,
		details: params.details ?? {},
		created_at: new Date().toISOString(),
	});
};

const persistFailure = async (
	supabase: any,
	params: {
		userId: string;
		opId: string;
		entity: string;
		action: OfflineMutationAction;
		errorMessage: string;
		details?: Record<string, unknown>;
	}
) => {
	await supabase.from('offline_sync_failures').insert({
		user_id: params.userId,
		op_id: params.opId,
		entity: params.entity,
		action: params.action,
		error_message: params.errorMessage,
		details: params.details ?? {},
		created_at: new Date().toISOString(),
	});
};

const executeOperation = async (
	supabase: any,
	operation: Pick<OfflineQueuedOp, 'action' | 'payload'>
): Promise<{ error: string | null }> => {
	if (operation.action === 'rpc') {
		if (!('rpc' in operation.payload)) {
			return { error: 'Invalid RPC payload' };
		}
		const { error } = await supabase.rpc(operation.payload.rpc, operation.payload.args ?? {});
		return { error: error?.message ?? null };
	}

	if (!('table' in operation.payload)) {
		return { error: 'Invalid table payload' };
	}

	const payload = operation.payload;
	switch (operation.action) {
		case 'insert': {
			let query = supabase.from(payload.table).insert(payload.values ?? {});
			query = applyMatchFilters(query, payload.match);
			if (payload.select) {
				query = query.select(payload.select);
			}
			const { error } = await query;
			return { error: error?.message ?? null };
		}
		case 'update': {
			let query = supabase.from(payload.table).update(payload.values ?? {});
			query = applyMatchFilters(query, payload.match);
			if (payload.select) {
				query = query.select(payload.select);
			}
			const { error } = await query;
			return { error: error?.message ?? null };
		}
		case 'delete': {
			let query = supabase.from(payload.table).delete();
			query = applyMatchFilters(query, payload.match);
			const candidateIds = (payload.values as { ids?: unknown } | undefined)?.ids;
			if (
				Array.isArray(candidateIds) &&
				candidateIds.length > 0 &&
				candidateIds.every((id) => typeof id === 'string' || typeof id === 'number')
			) {
				query = query.in('id', candidateIds);
			}
			if (payload.select) {
				query = query.select(payload.select);
			}
			const { error } = await query;
			return { error: error?.message ?? null };
		}
		case 'upsert': {
			let query = supabase.from(payload.table).upsert(payload.values ?? {});
			query = applyMatchFilters(query, payload.match);
			if (payload.select) {
				query = query.select(payload.select);
			}
			const { error } = await query;
			return { error: error?.message ?? null };
		}
		default:
			return { error: 'Unsupported operation type' };
	}
};

export const POST = withApiValidation<
	z.infer<typeof batchSchema>,
	OfflineBatchResponse
>(batchSchema, async (_req, body, supabase, user) => {
	const sortedOperations = [...body.operations].sort((a, b) =>
		a.queuedAt.localeCompare(b.queuedAt)
	);
	const results: OfflineBatchOpResult[] = [];

	for (const operation of sortedOperations) {
		const { data: existingReceipt } = await supabase
			.from('offline_op_receipts')
			.select('result_status, server_version, details')
			.eq('user_id', user.id)
			.eq('op_id', operation.opId)
			.maybeSingle();

		if (existingReceipt) {
			results.push({
				opId: operation.opId,
				status: 'duplicate',
				serverVersion: existingReceipt.server_version,
				details: (existingReceipt.details as Record<string, unknown>) ?? {},
				message: 'Operation already processed',
			});
			continue;
		}

		let serverVersion: string | null = null;
		let hasConflict = false;
		if (
			operation.baseVersion &&
			operation.action !== 'rpc' &&
			'table' in operation.payload &&
			(operation.action === 'update' ||
				operation.action === 'delete' ||
				operation.action === 'upsert')
		) {
			serverVersion = await tryResolveServerVersion(supabase, operation.payload);
			hasConflict =
				typeof serverVersion === 'string' &&
				serverVersion.localeCompare(operation.baseVersion) > 0;
		}

		const executionResult = await executeOperation(supabase, operation);
		if (executionResult.error) {
			await persistFailure(supabase, {
				userId: user.id,
				opId: operation.opId,
				entity: operation.entity,
				action: operation.action,
				errorMessage: executionResult.error,
				details: {
					payload: operation.payload,
				},
			});

			results.push({
				opId: operation.opId,
				status: 'failed',
				message: executionResult.error,
				serverVersion,
			});
			continue;
		}

		if (hasConflict) {
			await persistConflict(supabase, {
				userId: user.id,
				opId: operation.opId,
				entity: operation.entity,
				action: operation.action,
				baseVersion: operation.baseVersion ?? null,
				serverVersion,
				details: {
					payload: operation.payload,
				},
			});
			await persistReceipt(supabase, {
				userId: user.id,
				opId: operation.opId,
				entity: operation.entity,
				action: operation.action,
				status: 'conflict',
				serverVersion,
				details: {
					payload: operation.payload,
				},
			});
			results.push({
				opId: operation.opId,
				status: 'conflict',
				message: 'Applied using deterministic LWW policy',
				serverVersion,
				details: {
					policy: 'lww',
				},
			});
			continue;
		}

		await persistReceipt(supabase, {
			userId: user.id,
			opId: operation.opId,
			entity: operation.entity,
			action: operation.action,
			status: 'applied',
			serverVersion,
		});

		results.push({
			opId: operation.opId,
			status: 'applied',
			serverVersion,
		});
	}

	const response: OfflineBatchResponse = {
		results,
		appliedCount: results.filter((result) => result.status === 'applied').length,
		conflictCount: results.filter((result) => result.status === 'conflict').length,
		failedCount: results.filter((result) => result.status === 'failed').length,
	};

	return respondSuccess(response, 200, 'Offline operation batch processed');
});

export const dynamic = 'force-dynamic';
