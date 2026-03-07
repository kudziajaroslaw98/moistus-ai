'use client';

import useAppStore from '@/store/mind-map-store';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

type UpgradeTarget = 'owner' | 'requester';

interface UseMapNodeLimitOptions {
	enabled?: boolean;
}

interface UseMapNodeLimitResult {
	isAtLimit: boolean;
	isLoading: boolean;
	limitInfo: {
		current: number;
		max: number;
		upgradeTarget: UpgradeTarget;
	} | null;
	limitMessage: string | null;
}

// Subscription limits use -1 sentinel for unlimited.
const UNLIMITED_LIMIT = -1;

function normalizeUpgradeTarget(value: unknown): UpgradeTarget {
	return value === 'owner' ? 'owner' : 'requester';
}

function getLimitFromPayload(payload: unknown): number | null {
	if (!payload || typeof payload !== 'object') return null;
	const record = payload as { data?: { limit?: unknown } };
	const limit = record.data?.limit;
	return typeof limit === 'number' ? limit : null;
}

function getErrorMessage(payload: unknown): string | null {
	if (!payload || typeof payload !== 'object') return null;
	const record = payload as { error?: unknown };
	return typeof record.error === 'string' ? record.error : null;
}

function getUpgradeTarget(payload: unknown): UpgradeTarget {
	if (!payload || typeof payload !== 'object') return 'requester';
	const record = payload as { data?: { upgradeTarget?: unknown } };
	return normalizeUpgradeTarget(record.data?.upgradeTarget);
}

export function useMapNodeLimit(
	options: UseMapNodeLimitOptions = {}
): UseMapNodeLimitResult {
	const { enabled = true } = options;
	const { mapId, nodeCount } = useAppStore(
		useShallow((state) => ({
			mapId: state.mapId,
			nodeCount: state.nodes.length,
		}))
	);

	const [limit, setLimit] = useState<number | null>(null);
	const [upgradeTarget, setUpgradeTarget] = useState<UpgradeTarget>('requester');
	const [limitErrorMessage, setLimitErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!enabled || !mapId) {
			setLimit(null);
			setLimitErrorMessage(null);
			setUpgradeTarget('requester');
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();

		const checkLimit = async () => {
			setIsLoading(true);
			try {
				const response = await fetch('/api/nodes/check-limit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mapId }),
					signal: controller.signal,
				});
				const payload = await response.json().catch(() => null);
				const resolvedLimit = getLimitFromPayload(payload);

				if (response.status === 402) {
					setLimit(resolvedLimit);
					setUpgradeTarget(getUpgradeTarget(payload));
					setLimitErrorMessage(getErrorMessage(payload));
					return;
				}

				if (response.ok) {
					setLimit(resolvedLimit);
					setUpgradeTarget(getUpgradeTarget(payload));
					setLimitErrorMessage(null);
					return;
				}

				setLimit(null);
				setLimitErrorMessage(null);
				setUpgradeTarget('requester');
			} catch (error) {
				if ((error as Error).name === 'AbortError') {
					return;
				}
				setLimit(null);
				setLimitErrorMessage(null);
				setUpgradeTarget('requester');
			} finally {
				setIsLoading(false);
			}
		};

		void checkLimit();

		return () => {
			controller.abort();
		};
	}, [enabled, mapId]);

	const isAtLimit = useMemo(() => {
		if (limit === null || limit === UNLIMITED_LIMIT) return false;
		return nodeCount >= limit;
	}, [limit, nodeCount]);

	const limitInfo = useMemo(() => {
		if (!isAtLimit || limit === null || limit === UNLIMITED_LIMIT) {
			return null;
		}
		return {
			current: nodeCount,
			max: limit,
			upgradeTarget,
		};
	}, [isAtLimit, limit, nodeCount, upgradeTarget]);

	const limitMessage = useMemo(() => {
		if (!limitInfo) return null;
		if (limitErrorMessage) return limitErrorMessage;
		if (limitInfo.upgradeTarget === 'owner') {
			return `This shared map reached its owner limit (${limitInfo.current}/${limitInfo.max}). Ask the owner to upgrade or remove nodes.`;
		}
		return `Node limit reached (${limitInfo.current}/${limitInfo.max}). Upgrade to Pro for unlimited nodes.`;
	}, [limitInfo, limitErrorMessage]);

	return {
		isAtLimit,
		isLoading,
		limitInfo,
		limitMessage,
	};
}
