'use client';

import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { Puzzle } from 'lucide-react';
import { motion, type MotionProps } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';

const listFormat = new Intl.ListFormat('en', {
	style: 'long',
	type: 'conjunction',
});

interface PluginsSettingsLinkProps {
	motionProps: Pick<MotionProps, 'initial' | 'animate' | 'transition'>;
	/** Opens the Plugins panel (Map Settings closes first, keeping its discard guard). */
	onManage: () => void;
}

/** Map Settings row for the owner: which plugins are on, and a way to the Plugins panel. */
export function PluginsSettingsLink({
	motionProps,
	onManage,
}: PluginsSettingsLinkProps) {
	// Select raw state only: a derived array here would be new on every read and loop.
	const { isOwner, mapPlugins, loadedPlugins } = useAppStore(
		useShallow((state) => ({
			isOwner: Boolean(
				state.mindMap &&
				state.currentUser &&
				!state.currentUser.is_anonymous &&
				state.mindMap.user_id === state.currentUser.id
			),
			mapPlugins: state.mapPlugins,
			loadedPlugins: state.loadedPlugins,
		}))
	);

	if (!isOwner) return null;

	const pluginNames = mapPlugins.map(
		(record) => loadedPlugins[record.pluginId]?.manifest?.name ?? record.pluginId
	);
	const summary =
		pluginNames.length === 0
			? 'No plugins on yet'
			: `${listFormat.format(pluginNames)} ${pluginNames.length === 1 ? 'is' : 'are'} on`;

	return (
		<motion.section
			{...motionProps}
			className='space-y-3 rounded-lg border border-border-subtle bg-base/60 p-4'
			data-testid='plugins-settings-link'
		>
			<div className='space-y-1'>
				<h3 className='text-lg font-semibold text-text-primary'>Plugins</h3>

				<p className='text-xs text-text-secondary'>
					New kinds of nodes for this map.
				</p>
			</div>

			<div className='flex items-center gap-3'>
				<span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400'>
					<Puzzle aria-hidden className='size-4' />
				</span>

				<span className='min-w-0 flex-1 truncate text-sm text-zinc-300'>
					{summary}
				</span>

				<Button onClick={onManage} variant='outline'>
					Manage plugins
				</Button>
			</div>
		</motion.section>
	);
}
