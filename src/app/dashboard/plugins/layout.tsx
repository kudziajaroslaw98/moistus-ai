import { PluginsPageFrame } from '@/components/plugins/plugins-page-tabs';
import type { ReactNode } from 'react';

/** Plugins title and tabs stay mounted while you switch Library / My plugins / Build. */
export default function PluginsLayout({ children }: { children: ReactNode }) {
	return <PluginsPageFrame>{children}</PluginsPageFrame>;
}
