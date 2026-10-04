'use client';

import { overlaySurfaceClassName } from '@/components/ui/overlay-surface';
import { useContributions } from '@/hooks/extensions/use-contributions';
import useAppStore from '@/store/mind-map-store';
import {
	resolveContributionDescription,
	selectContributions,
} from '@/lib/extensions/select-contributions';
import type { Contribution } from '@/types/extensions';
import { cn } from '@/utils/cn';
import { Loader2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';

export interface AIActionsPopoverProps {
	/** Whether actions are scoped to a single node or the entire map */
	scope: 'node' | 'map';
	/** The source node ID when scope is 'node' */
	sourceNodeId?: string;
	/** Callback when the popover should close */
	onClose: () => void;
	/** Optional className for the container */
	className?: string;
}

/**
 * AIActionsPopover - Shared popover menu for AI actions
 *
 * Lists contributions placed in 'aiMenu': built-in AI actions, then recipes under a
 * "Recipes" heading. Used on:
 * - Node selection (scope='node')
 * - Toolbar (scope='map')
 */
export function AIActionsPopover({
	scope,
	sourceNodeId,
	onClose,
	className,
}: AIActionsPopoverProps) {
	const { contributions, createContext, runContribution } = useContributions();

	const ctx = useMemo(
		() => createContext(scope, sourceNodeId ?? null),
		[createContext, scope, sourceNodeId]
	);
	const visibleActions = useMemo(
		() => selectContributions(contributions, 'aiMenu', ctx),
		[contributions, ctx]
	);
	const builtinActions = visibleActions.filter((action) => !action.group);
	const recipeActions = visibleActions.filter(
		(action) => action.group === 'recipes'
	);

	// Recipes are saved per account: guests and viewers only see what they can run.
	const canManageRecipes = useAppStore(
		(state) => state.currentUser?.is_anonymous === false
	) && ctx.canEdit;
	const openRecipesPanel = useAppStore((state) => state.openRecipesPanel);
	const openPanel = (view?: Parameters<typeof openRecipesPanel>[0]) => {
		openRecipesPanel(view);
		onClose();
	};

	const handleRun = (contribution: Contribution) => {
		runContribution(contribution, ctx);
		onClose();
	};

	const renderAction = (action: Contribution) => {
		const ActionIcon = action.icon;
		const isBusy = action.isBusy?.(ctx) ?? false;
		return (
			<button
				type='button'
				key={action.id}
				onClick={() => handleRun(action)}
				disabled={isBusy}
				className={cn(
					'group w-full px-3 py-2.5 flex items-center gap-3 text-left',
					'hover:bg-elevated focus:bg-elevated data-[highlighted]:bg-elevated active:bg-elevated/80',
					'transition-all duration-200 ease',
					'disabled:opacity-50 disabled:cursor-not-allowed',
					'focus:outline-none'
				)}
			>
				<span
					className={cn(
						'text-text-secondary transition-colors duration-200',
						'group-hover:text-primary-400'
					)}
				>
					{isBusy ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<ActionIcon className='size-4' />
					)}
				</span>

				<div className='flex flex-col'>
					<span
						className={cn(
							'text-sm font-medium text-text-primary transition-colors duration-200',
							'group-hover:text-primary-400'
						)}
					>
						{action.title}
					</span>

					<span className='text-xs text-text-tertiary'>
						{resolveContributionDescription(action, ctx)}
					</span>
				</div>
			</button>
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{
				duration: 0.15,
				type: 'spring',
				stiffness: 500,
				damping: 30,
			}}
			className={cn(
				overlaySurfaceClassName,
				'rounded-md overflow-hidden min-w-[200px]',
				className
			)}
		>
			<div className='py-1'>{builtinActions.map(renderAction)}</div>

			{(recipeActions.length > 0 || canManageRecipes) && (
				<>
					<div className='flex items-center gap-2.5 px-3 pt-2 pb-1'>
						<span className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
							Recipes
						</span>

						<span aria-hidden className='h-px flex-1 bg-white/8' />

						{canManageRecipes && (
							<button
								className='rounded-sm text-xs text-text-tertiary transition-colors duration-200 ease hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
								onClick={() => openPanel()}
								type='button'
							>
								Manage
							</button>
						)}
					</div>

					<div className='pb-1'>{recipeActions.map(renderAction)}</div>

					{canManageRecipes && (
						<div className='border-t border-border-default py-1'>
							<button
								type='button'
								onClick={() =>
									openPanel({ mode: 'edit', recipeId: null, initial: null })
								}
								className={cn(
									'group w-full px-3 py-2.5 flex items-center gap-3 text-left',
									'hover:bg-elevated focus:bg-elevated active:bg-elevated/80',
									'transition-all duration-200 ease focus:outline-none'
								)}
							>
								<span className='text-text-secondary transition-colors duration-200 group-hover:text-primary-400'>
									<Plus className='size-4' />
								</span>

								<span className='text-sm font-medium text-text-primary transition-colors duration-200 group-hover:text-primary-400'>
									New recipe…
								</span>
							</button>
						</div>
					)}
				</>
			)}
		</motion.div>
	);
}
