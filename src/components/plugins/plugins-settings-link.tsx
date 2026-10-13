'use client';

import { PanelRow, PanelSection } from '@/components/ui/panel';
import { availableCatalogUpdate } from '@/lib/plugins/catalog';
import useAppStore from '@/store/mind-map-store';
import { Puzzle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

const listFormat = new Intl.ListFormat('en', {
	style: 'long',
	type: 'conjunction',
});

interface PluginsSettingsLinkProps {
	/** Opens the Plugins panel (Map Settings closes first, keeping its discard guard). */
	onManage: () => void;
}

/** Map Settings row for the owner: which plugins are on, and a way to the Plugins panel. */
export function PluginsSettingsLink({ onManage }: PluginsSettingsLinkProps) {
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
	const updateCount = mapPlugins.filter((record) =>
		availableCatalogUpdate(record.pluginId, record.version)
	).length;

	return (
		<PanelSection
			data-testid='plugins-settings-link'
			description='New kinds of nodes for this map.'
			label='Plugins'
		>
			<PanelRow
				chevron
				icon={<Puzzle />}
				onClick={onManage}
				title='Manage plugins'
				description={
					<>
						<span className='block truncate'>{summary}</span>

						{updateCount > 0 && (
							<span className='mt-0.5 flex items-center gap-1.5 text-xs text-primary-300'>
								<span aria-hidden className='size-1.5 rounded-full bg-primary-500' />

								{updateCount === 1
									? '1 update available'
									: `${updateCount} updates available`}
							</span>
						)}
					</>
				}
			/>
		</PanelSection>
	);
}
