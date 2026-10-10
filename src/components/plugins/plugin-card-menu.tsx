'use client';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Flag, Info, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PluginReportDialog } from './plugin-report-dialog';

interface PluginCardMenuProps {
	pluginId: string;
	pluginName: string;
	version?: string;
	mapId?: string;
	nodeData?: Record<string, unknown> | null;
	isOwner?: boolean;
	/** Links to the plugin's card on the dashboard Plugins page (off there). */
	showAbout?: boolean;
	/** Replaces the compact "…" button look, e.g. for the dashboard card cover. */
	triggerClassName?: string;
}

/** "…" on a plugin card: About this plugin and Report…, for everyone. */
export function PluginCardMenu({
	pluginId,
	pluginName,
	version,
	mapId,
	nodeData,
	isOwner,
	showAbout = true,
	triggerClassName,
}: PluginCardMenuProps) {
	const router = useRouter();
	const [reporting, setReporting] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label={`More for ${pluginName}`}
					className={
						triggerClassName ??
						'nodrag flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-200 ease hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
					}
				>
					<MoreHorizontal aria-hidden className='size-4' />
				</DropdownMenuTrigger>

				<DropdownMenuContent align='end' className='min-w-44'>
					{showAbout && (
						<DropdownMenuItem
							onClick={() =>
								router.push(`/dashboard/plugins#plugin-${pluginId}`)
							}
						>
							<Info aria-hidden />
							About this plugin
						</DropdownMenuItem>
					)}

					<DropdownMenuItem onClick={() => setReporting(true)}>
						<Flag aria-hidden />
						Report…
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<PluginReportDialog
				isOwner={isOwner}
				mapId={mapId}
				nodeData={nodeData}
				onOpenChange={setReporting}
				open={reporting}
				pluginId={pluginId}
				pluginName={pluginName}
				version={version}
			/>
		</>
	);
}
