'use client';

import {
	CARD_MENU_TRIGGER_CLASS,
	CardMenuIcon,
	CatalogCard,
	CatalogCardSkeleton,
	CatalogGrid,
	OFF_HUE,
	type CatalogChip,
} from '@/components/dashboard/catalog-card';
import { CreateTile } from '@/components/dashboard/create-tile';
import {
	CARD_BUTTON_CLASS,
	PRIMARY_BUTTON_CLASS,
} from '@/components/dashboard/dashboard-page';
import { useDeveloperMode } from '@/components/plugins/developer-mode-switch';
import {
	PluginDraftsSection,
	playgroundHref,
} from '@/components/plugins/playground/plugin-drafts-section';
import { PluginStartDialog } from '@/components/plugins/playground/plugin-start-dialog';
import { QUIET_BUTTON_CLASS } from '@/components/plugins/playground/playground-styles';
import { PluginSubmitSheet } from '@/components/plugins/plugin-submit-sheet';
import { PluginVersionsSheet } from '@/components/plugins/plugin-versions-sheet';
import { PluginsSlot } from '@/components/plugins/plugins-page-tabs';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { compareVersions, isLocalDevPluginUrl } from '@/lib/plugins/catalog';
import { createDraftFromPublished } from '@/lib/plugins/drafts-client';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	describePowerKind,
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { MyPlugin } from '@/types/plugin-library';
import { Code2, History, Plus, Puzzle, Send } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

const MINE_KEY = '/api/plugins/mine';

async function fetchMine(url: string): Promise<MyPlugin[]> {
	const response = await fetch(url);
	const body = (await response.json().catch(() => null)) as {
		data?: { plugins: MyPlugin[] };
		error?: string;
	} | null;
	if (!response.ok || !body?.data)
		throw new Error(body?.error ?? 'Could not load your plugins');
	return body.data.plugins;
}

/** Status chips on the cover: what is live, what is waiting, what needs changes. */
function statusChips(plugin: MyPlugin): CatalogChip[] {
	const live = plugin.versions.find(
		(version) => version.status === 'published'
	);
	const waiting = plugin.versions.find(
		(version) => version.status === 'in_review'
	);
	const changes = plugin.versions.find(
		(version) => version.status === 'changes_requested'
	);
	// A request for changes only matters while nothing newer is in review.
	const showChanges =
		changes &&
		(!waiting || compareVersions(changes.version, waiting.version) > 0)
			? changes
			: null;
	return [
		...(plugin.disabledReason
			? [{ label: 'Turned off', tone: 'red' as const }]
			: []),
		...(live
			? [{ label: `Published ${live.version}`, tone: 'green' as const }]
			: []),
		...(waiting
			? [{ label: `${waiting.version} in review`, tone: 'amber' as const }]
			: []),
		...(showChanges
			? [{ label: 'Changes requested', tone: 'red' as const }]
			: []),
	];
}

/** Shiko's message when changes were requested, else the plugin's own description. */
function cardDescription(plugin: MyPlugin): string {
	const newest = plugin.versions[0];
	if (newest?.status === 'changes_requested' && newest.reviewMessage)
		return `Shiko: “${newest.reviewMessage}”`;
	return plugin.description || 'Not published yet.';
}

/** Asks for the developer plugin's localhost manifest URL, then shows the submit sheet. */
function SubmitDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [url, setUrl] = useState('');
	const [chosen, setChosen] = useState<string | null>(null);
	const valid = isLocalDevPluginUrl(url.trim());

	const close = (next: boolean) => {
		if (!next) {
			setChosen(null);
			setUrl('');
		}
		onOpenChange(next);
	};

	return (
		<Dialog onOpenChange={close} open={open}>
			<DialogContent className='max-h-[85dvh] overflow-y-auto border border-zinc-800 bg-zinc-950 p-5 sm:max-w-[480px]'>
				<DialogHeader>
					<DialogTitle>Submit a version</DialogTitle>

					<DialogDescription>
						Load it from where you&apos;re building it, the same address you use
						in Developer mode.
					</DialogDescription>
				</DialogHeader>

				{chosen ? (
					<PluginSubmitSheet
						manifestUrl={chosen}
						onClose={() => close(false)}
					/>
				) : (
					<form
						className='flex flex-col gap-3'
						onSubmit={(event) => {
							event.preventDefault();
							if (valid) setChosen(url.trim());
						}}
					>
						<label
							className='flex flex-col gap-1 text-xs text-text-secondary'
							htmlFor='submit-url'
						>
							Plugin manifest URL
							<Input
								id='submit-url'
								onChange={(event) => setUrl(event.target.value)}
								placeholder='http://localhost:5173/manifest.json'
								value={url}
							/>
						</label>

						<Button className='self-end' disabled={!valid} type='submit'>
							Check it
						</Button>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Dashboard › Plugins › My plugins: your plugins as cards, and their versions in a side sheet. */
export function MyPluginsContent() {
	const {
		data: plugins,
		error,
		isLoading,
		mutate,
	} = useSWR(MINE_KEY, fetchMine);
	const [submitOpen, setSubmitOpen] = useState(false);
	const [openId, setOpenId] = useState<string | null>(null);
	const openPlugin = plugins?.find((plugin) => plugin.id === openId) ?? null;
	const router = useRouter();
	const searchParams = useSearchParams();
	const { enabled: developerMode } = useDeveloperMode();
	// `?write=1` opens "Write a plugin" (the map's Plugins panel and ⌘K link here).
	const [writeOpen, setWriteOpen] = useState(
		() => searchParams?.get('write') === '1'
	);

	const closeWrite = () => {
		setWriteOpen(false);
		if (searchParams?.has('write')) router.replace('/dashboard/plugins/mine');
	};

	const editAsDraft = async (version: string) => {
		if (!openPlugin) return;
		try {
			const draft = await createDraftFromPublished(openPlugin.id, version);
			router.push(playgroundHref(draft.id));
		} catch (reason) {
			toast.error(
				reason instanceof Error ? reason.message : 'Could not start the draft'
			);
		}
	};

	// Title, tabs and the page width come from the plugins layout (PluginsPageFrame).
	return (
		<>
			<PluginsSlot slot='heading'>
				<div className='flex flex-wrap gap-2'>
					<button
						className={QUIET_BUTTON_CLASS}
						onClick={() => setSubmitOpen(true)}
						type='button'
					>
						<Send aria-hidden className='size-3.5' />
						Submit a version
					</button>

					<button
						className={PRIMARY_BUTTON_CLASS}
						onClick={() => setWriteOpen(true)}
						type='button'
					>
						<Code2 aria-hidden className='size-3.5' />
						Write a plugin
					</button>
				</div>
			</PluginsSlot>

			<PluginDraftsSection onWrite={() => setWriteOpen(true)} />

			{developerMode && (
				<div className='mt-8 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
					<h2 className='text-[15px] font-semibold text-white'>Submitted</h2>

					<span className='font-mono text-xs text-zinc-500'>
						{plugins?.length ?? 0}
					</span>

					<span className='text-[13px] text-zinc-500'>
						Versions in the library, or waiting on review.
					</span>
				</div>
			)}

			{error && (
				<div
					className='mt-6 flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
					role='alert'
				>
					Couldn&apos;t load your plugins.
					<Button onClick={() => void mutate()} size='sm' variant='outline'>
						Try again
					</Button>
				</div>
			)}

			<CatalogGrid className={developerMode ? 'mt-3.5' : 'mt-6'} viewMode='grid'>
				{isLoading && <CatalogCardSkeleton count={3} viewMode='grid' />}

				{plugins?.map((plugin) => {
					const published = plugin.versions.some(
						(version) => version.status === 'published'
					);
					return (
						<CatalogCard
							chips={statusChips(plugin)}
							description={cardDescription(plugin)}
							icon={
								PLUGIN_ICONS[plugin.icon as keyof typeof PLUGIN_ICONS] ?? Puzzle
							}
							key={plugin.id}
							onOpen={() => setOpenId(plugin.id)}
							title={plugin.name}
							viewMode='grid'
							detail={
								<span className='truncate font-mono text-[11.5px]'>
									{plugin.id}
								</span>
							}
							hue={
								plugin.disabledReason
									? OFF_HUE
									: PLUGIN_POWER_HUES[
											powerKindOfPermissions(plugin.permissions)
										]
							}
							meta={
								published
									? `On in ${plugin.mapCount} ${plugin.mapCount === 1 ? 'map' : 'maps'} · ${plugin.openReports} ${plugin.openReports === 1 ? 'report' : 'reports'}`
									: `Not published yet · ${describePowerKind(plugin.permissions)}`
							}
							action={
								<button
									className={CARD_BUTTON_CLASS}
									onClick={() => setOpenId(plugin.id)}
									type='button'
								>
									Versions
								</button>
							}
							menu={
								<DropdownMenu>
									<DropdownMenuTrigger
										aria-label={`Options for ${plugin.name}`}
										className={CARD_MENU_TRIGGER_CLASS}
									>
										<CardMenuIcon />
									</DropdownMenuTrigger>

									<DropdownMenuContent align='end'>
										<DropdownMenuItem onClick={() => setOpenId(plugin.id)}>
											<History />
											Versions
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => setSubmitOpen(true)}>
											<Plus />
											Submit a version
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							}
						/>
					);
				})}

				{!isLoading && (
					<CreateTile
						hint='Load it from localhost, then submit it for review.'
						onClick={() => setSubmitOpen(true)}
						title='Submit a new plugin'
						viewMode='grid'
					/>
				)}
			</CatalogGrid>

			{plugins && plugins.length === 0 && (
				<p className='mt-4 text-sm text-zinc-400'>
					You haven&apos;t submitted a plugin yet. Build one, load it in
					Developer mode, then submit it here.
				</p>
			)}

			<PluginVersionsSheet
				onEditAsDraft={editAsDraft}
				onOpenChange={(open) => !open && setOpenId(null)}
				onSubmitVersion={() => setSubmitOpen(true)}
				plugin={openPlugin}
			/>

			{writeOpen && (
				<PluginStartDialog open onOpenChange={(open) => !open && closeWrite()} />
			)}

			<SubmitDialog
				onOpenChange={(open) => {
					setSubmitOpen(open);
					if (!open) void mutate();
				}}
				open={submitOpen}
			/>
		</>
	);
}
