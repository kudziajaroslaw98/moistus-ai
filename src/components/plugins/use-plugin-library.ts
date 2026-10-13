'use client';

import {
	getPluginLibrary,
	subscribePluginLibrary,
	type PluginLibrarySnapshot,
} from '@/lib/plugins/catalog';
import { refreshPluginLibrary } from '@/lib/plugins/plugin-library-client';
import { useEffect, useSyncExternalStore } from 'react';

/** Shiko's plugins plus the published library, refreshed when a component needs it. */
export function usePluginLibrary(enabled = true): PluginLibrarySnapshot {
	const library = useSyncExternalStore(
		subscribePluginLibrary,
		getPluginLibrary,
		getPluginLibrary
	);
	useEffect(() => {
		if (enabled) void refreshPluginLibrary();
	}, [enabled]);
	return library;
}
