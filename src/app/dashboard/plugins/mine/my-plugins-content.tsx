'use client';

import {
	CARD_MENU_TRIGGER_CLASS,
	CardMenuIcon,
	CatalogCard,
	CatalogCardSkeleton,
	CatalogEmptyState,
	CatalogGrid,
	OFF_HUE,
} from '@/components/dashboard/catalog-card';
import {
	CARD_BUTTON_CLASS,
	PRIMARY_BUTTON_CLASS,
} from '@/components/dashboard/dashboard-page';
import { useDashboardSearch } from '@/components/dashboard/dashboard-shell-context';
import { ViewToggle } from '@/components/dashboard/view-toggle';
import { useDeveloperMode } from '@/components/plugins/developer-mode-switch';
import {
	buildMyPluginRows,
	countPluginFilters,
	matchesPluginFilter,
	matchesPluginQuery,
	MY_PLUGIN_FILTERS,
	type MyPluginFilter,
} from '@/components/plugins/my-plugin-rows';
import { QUIET_BUTTON_CLASS } from '@/components/plugins/playground/playground-styles';
import { PluginSubmitSheet } from '@/components/plugins/plugin-submit-sheet';
import { PluginVersionsSheet } from '@/components/plugins/plugin-versions-sheet';
import { PluginsSlot } from '@/components/plugins/plugins-page-tabs';
import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
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
import { isLocalDevPluginUrl } from '@/lib/plugins/catalog';
import {
	createDraftFromPublished,
	deleteDraft,
	listDrafts,
	playgroundHref,
	PLUGIN_DRAFTS_KEY,
} from '@/lib/plugins/drafts-client';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { PluginDraftSummary } from '@/types/plugin-drafts';
import type { MyPlugin } from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { Code2, History, Pencil, Plus, Puzzle, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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

/** The filter chips: counts per filter, empty ones hidden unless picked. */
function FilterChips({
	counts,
	filter,
	onChange,
}: {
	counts: Record<MyPluginFilter, number>;
	filter: MyPluginFilter;
	onChange: (filter: MyPluginFilter) => void;
}) {
	return (
		<div
			aria-label='Filter your plugins'
			className='-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0'
			role='group'
		>
			{MY_PLUGIN_FILTERS.filter(
				({ id }) => id === 'all' || id === filter || counts[id] > 0
			).map(({ id, label }) => (
				<button
					aria-pressed={filter === id}
					key={id}
					onClick={() => onChange(id)}
					type='button'
					className={cn(
						'inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
						filter === id
							? 'border-[#3a3d46] bg-[#1c1d22] text-white'
							: 'border-[#1d1f24] bg-[#0e0f12] text-zinc-400 [@media(hover:hover)]:hover:text-white'
					)}
				>
					{id === 'attention' && (
						<span aria-hidden className='size-1.5 rounded-full bg-amber-400' />
					)}

					{label}

					<span className='font-mono text-xs text-zinc-500'>{counts[id]}</span>
				</button>
			))}
		</div>
	);
}

/** Nothing written or submitted yet: the way in is the Write a plugin tab. */
function NothingYet() {
	return (
		<div className='flex flex-col items-center px-4 py-16 text-center'>
			<span className='flex size-11 items-center justify-center rounded-full border border-[#2a2c33] bg-[#0e0f12]'>
				<Code2 aria-hidden className='size-[18px] text-zinc-400' />
			</span>

			<h2 className='mt-4 text-base font-semibold text-white'>
				You haven&apos;t written a plugin yet
			</h2>

			<p className='mt-1 max-w-md text-sm leading-5 text-zinc-400'>
				Start from a template, watch the node draw, then submit it to the
				library. Your drafts and submitted plugins will show up here.
			</p>

			<Link
				className={cn(PRIMARY_BUTTON_CLASS, 'mt-5')}
				href='/dashboard/plugins/build'
			>
				Write a plugin
			</Link>

			<p className='mt-5 max-w-md text-xs leading-[18px] text-zinc-500'>
				Built it in your own editor? Use Submit a version at the top of the page.
			</p>
		</div>
	);
}

/**
 * Dashboard › Plugins › My plugins: one row per plugin, whether it's a draft, in review,
 * published or all three, with filters, and its drafts and versions in a side sheet.
 */
export function MyPluginsContent() {
	const router = useRouter();
	const { enabled: developerMode } = useDeveloperMode();
	const {
		data: plugins,
		error,
		isLoading,
		mutate,
	} = useSWR(MINE_KEY, fetchMine);
	// Drafts need Developer mode, so nothing is asked for while it's off.
	const {
		data: drafts,
		error: draftsError,
		isLoading: draftsLoading,
		mutate: mutateDrafts,
	} = useSWR(developerMode ? PLUGIN_DRAFTS_KEY : null, listDrafts, {
		revalidateOnFocus: false,
	});
	const { query, setQuery } = useDashboardSearch();
	const [viewMode, setViewMode] = useState<DashboardViewMode>('list');
	const [filter, setFilter] = useState<MyPluginFilter>('all');
	const [submitOpen, setSubmitOpen] = useState(false);
	const [openId, setOpenId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<PluginDraftSummary | null>(null);

	const loading = isLoading || (developerMode && draftsLoading);
	const rows = useMemo(
		() => buildMyPluginRows(plugins ?? [], drafts ?? []),
		[plugins, drafts]
	);
	const counts = useMemo(() => countPluginFilters(rows), [rows]);
	const shown = rows.filter(
		(row) => matchesPluginFilter(row, filter) && matchesPluginQuery(row, query)
	);
	const openRow = rows.find((row) => row.pluginId === openId) ?? null;

	const editAsDraft = async (version: string) => {
		if (!openRow?.plugin) return;
		try {
			const draft = await createDraftFromPublished(openRow.plugin.id, version);
			router.push(playgroundHref(draft.id));
		} catch (reason) {
			toast.error(
				reason instanceof Error ? reason.message : 'Could not start the draft'
			);
		}
	};

	const confirmDelete = async () => {
		const draft = deleting;
		setDeleting(null);
		if (!draft) return;
		try {
			await deleteDraft(draft.id);
			await mutateDrafts();
			toast.success('Draft deleted');
		} catch (reason) {
			toast.error(
				reason instanceof Error ? reason.message : 'Could not delete the draft'
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

					<Link
						className={PRIMARY_BUTTON_CLASS}
						href='/dashboard/plugins/build'
					>
						<Code2 aria-hidden className='size-3.5' />
						Write a plugin
					</Link>
				</div>
			</PluginsSlot>

			<PluginsSlot slot='controls'>
				<ViewToggle onChange={setViewMode} value={viewMode} />
			</PluginsSlot>

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

			{draftsError && (
				<div
					className='mt-6 flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
					role='alert'
				>
					Couldn&apos;t load your drafts.
					<Button
						onClick={() => void mutateDrafts()}
						size='sm'
						variant='outline'
					>
						Try again
					</Button>
				</div>
			)}

			{!loading && !error && rows.length > 0 && (
				<FilterChips counts={counts} filter={filter} onChange={setFilter} />
			)}

			{loading && (
				<CatalogGrid className='mt-6' viewMode={viewMode}>
					<CatalogCardSkeleton count={4} viewMode={viewMode} />
				</CatalogGrid>
			)}

			{!loading && !error && rows.length === 0 && <NothingYet />}

			{!loading && rows.length > 0 && shown.length === 0 && (
				<CatalogEmptyState
					actionLabel='Show all plugins'
					hint='Try another filter or search term.'
					title='No plugins match'
					onAction={() => {
						setFilter('all');
						setQuery('');
					}}
				/>
			)}

			{!loading && shown.length > 0 && (
				<CatalogGrid
					className={rows.length > 0 ? 'mt-4' : 'mt-6'}
					viewMode={viewMode}
				>
					{shown.map((row) => (
						<CatalogCard
							wrapChips
							chips={row.chips}
							description={row.description}
							key={row.pluginId}
							meta={row.meta}
							onOpen={() => setOpenId(row.pluginId)}
							title={row.name}
							viewMode={viewMode}
							action={
								<button
									className={CARD_BUTTON_CLASS}
									onClick={() => setOpenId(row.pluginId)}
									type='button'
								>
									Open
								</button>
							}
							detail={
								<span className='truncate font-mono text-[11.5px]'>
									{row.pluginId}
								</span>
							}
							hue={
								row.plugin?.disabledReason
									? OFF_HUE
									: PLUGIN_POWER_HUES[
											row.plugin
												? powerKindOfPermissions(row.plugin.permissions)
												: 'own'
										]
							}
							icon={
								PLUGIN_ICONS[row.icon as keyof typeof PLUGIN_ICONS] ?? Puzzle
							}
							menu={
								<div className='hidden sm:block'>
									<DropdownMenu>
										<DropdownMenuTrigger
											aria-label={`Options for ${row.name}`}
											className={CARD_MENU_TRIGGER_CLASS}
										>
											<CardMenuIcon />
										</DropdownMenuTrigger>

										<DropdownMenuContent align='end'>
											<DropdownMenuItem onClick={() => setOpenId(row.pluginId)}>
												<History />
												Open
											</DropdownMenuItem>

											{row.drafts[0] && (
												<DropdownMenuItem
													onClick={() =>
														router.push(playgroundHref(row.drafts[0].id))
													}
												>
													<Pencil />
													Edit newest draft
												</DropdownMenuItem>
											)}

											{row.plugin && (
												<DropdownMenuItem onClick={() => setSubmitOpen(true)}>
													<Plus />
													Submit a version
												</DropdownMenuItem>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							}
						/>
					))}
				</CatalogGrid>
			)}

			{!loading && !developerMode && rows.length > 0 && (
				<p className='mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[19px] text-zinc-500'>
					<Code2 aria-hidden className='size-3.5 shrink-0' />
					Drafts are hidden while Developer mode is off.

					<Link
						className='text-zinc-300 underline underline-offset-[3px] transition-colors duration-200 ease [@media(hover:hover)]:hover:text-white'
						href='/dashboard/plugins/build'
					>
						Turn it on
					</Link>
				</p>
			)}

			<PluginVersionsSheet
				onDeleteDraft={developerMode ? setDeleting : undefined}
				onEditAsDraft={editAsDraft}
				onOpenChange={(open) => !open && setOpenId(null)}
				onSubmitVersion={() => setSubmitOpen(true)}
				row={openRow}
			/>

			<RecipeConfirmDialog
				confirmLabel='Delete draft'
				description={`This deletes this draft of “${deleting?.name || 'your plugin'}” and its code. Plugins you already submitted aren’t affected. It can’t be undone.`}
				onCancel={() => setDeleting(null)}
				onConfirm={() => void confirmDelete()}
				open={deleting !== null}
				title='Delete this draft?'
			/>

			<SubmitDialog
				open={submitOpen}
				onOpenChange={(open) => {
					setSubmitOpen(open);
					if (!open) void mutate();
				}}
			/>
		</>
	);
}
