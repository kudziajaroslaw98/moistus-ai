import {
	deleteOfflineOp,
	enqueueOfflineOp,
	updateOfflineOp,
} from '@/lib/offline/indexed-db';
import { enqueueSyncKick } from '@/lib/offline/offline-sync';
import type {
	OfflineMutationAction,
	OfflineMutationPayload,
	OfflineQueuedOp,
} from '@/types/offline';

export interface QueueMutationInput<T> {
	entity: string;
	action: OfflineMutationAction;
	payload: OfflineMutationPayload;
	baseVersion?: string | null;
	executeOnline: () => Promise<T>;
}

export interface QueueMutationResult<T> {
	status: 'applied' | 'queued';
	opId: string;
	data?: T;
}

const isLikelyOfflineError = (error: unknown): boolean => {
	if (typeof window !== 'undefined' && window.navigator.onLine === false) {
		return true;
	}

	if (error instanceof TypeError) {
		return true;
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes('network') ||
			message.includes('fetch') ||
			message.includes('offline') ||
			message.includes('failed to fetch')
		);
	}

	return false;
};

export const queueMutation = async <T>(
	input: QueueMutationInput<T>
): Promise<QueueMutationResult<T>> => {
	const opId = crypto.randomUUID();
	const operation: OfflineQueuedOp = {
		opId,
		entity: input.entity,
		action: input.action,
		payload: input.payload,
		baseVersion: input.baseVersion ?? null,
		queuedAt: new Date().toISOString(),
		attempts: 0,
		status: 'queued',
		lastError: null,
	};

	await enqueueOfflineOp(operation);

	if (typeof window !== 'undefined' && window.navigator.onLine === false) {
		await enqueueSyncKick();
		return {
			status: 'queued',
			opId,
		};
	}

	try {
		const data = await input.executeOnline();
		await deleteOfflineOp(opId);

		return {
			status: 'applied',
			opId,
			data,
		};
	} catch (error) {
		if (!isLikelyOfflineError(error)) {
			await updateOfflineOp(opId, {
				status: 'dead_letter',
				lastError: error instanceof Error ? error.message : 'Mutation failed',
				attempts: 1,
			});
			throw error;
		}

		await updateOfflineOp(opId, {
			status: 'queued',
			lastError: error instanceof Error ? error.message : 'Queued due to network error',
		});
		await enqueueSyncKick();

		return {
			status: 'queued',
			opId,
		};
	}
};

