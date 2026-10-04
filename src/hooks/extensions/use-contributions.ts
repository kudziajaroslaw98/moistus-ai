'use client';

import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import type {
	Contribution,
	ContributionContext,
	ContributionScope,
} from '@/types/extensions';
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Shared environment for every surface that lists contributions (AI popover, context
 * menu, command palette): the registry, a context builder, and a guarded runner.
 */
export function useContributions() {
	const contributions = useAppStore((state) => state.contributions);
	// Subscribed so isBusy() results re-render when streaming starts/stops.
	const isStreaming = useAppStore((state) => state.isStreaming);
	const isMapReady = useAppStore(
		(state) => Boolean(state.mapId) && state.mindMap?.id === state.mapId
	);
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
	const { canEdit } = usePermissions();
	const { isAtLimit } = useSubscriptionLimits();

	const createContext = useCallback(
		(
			scope: ContributionScope,
			nodeId: string | null = null
		): ContributionContext => ({
			getState: useAppStore.getState,
			scope,
			nodeId: scope === 'node' ? nodeId : null,
			canEdit,
			isMapReady,
		}),
		[canEdit, isMapReady]
	);

	/** Runs an entry after the AI quota check. Returns false when it was blocked. */
	const runContribution = useCallback(
		(contribution: Contribution, ctx: ContributionContext): boolean => {
			if (contribution.requiresAIQuota && isAtLimit('aiSuggestions')) {
				toast.error('AI feature limit reached', {
					description: 'Upgrade to Pro for unlimited AI features.',
					action: {
						label: 'Upgrade',
						onClick: () => setPopoverOpen({ upgradeUser: true }),
					},
					duration: 8000,
				});
				return false;
			}

			const reportFailure = (error: unknown) => {
				console.error(`[contributions] "${contribution.id}" failed:`, error);
				toast.error(`${contribution.title} failed`);
			};
			try {
				const result = contribution.run(ctx);
				if (result instanceof Promise) result.catch(reportFailure);
			} catch (error) {
				reportFailure(error);
			}
			return true;
		},
		[isAtLimit, setPopoverOpen]
	);

	return { contributions, isStreaming, createContext, runContribution };
}
