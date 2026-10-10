'use client';

import {
	CARD_MENU_TRIGGER_CLASS,
	CardMenuIcon,
	CatalogCard,
	CatalogCardSkeleton,
	CatalogGrid,
	type CatalogChip,
} from '@/components/dashboard/catalog-card';
import { CreateTile } from '@/components/dashboard/create-tile';
import { CARD_BUTTON_CLASS } from '@/components/dashboard/dashboard-page';
import { useDeveloperMode } from '@/components/plugins/developer-mode-switch';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	deleteDraft,
	listDrafts,
	PLUGIN_DRAFTS_KEY,
} from '@/lib/plugins/drafts-client';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { PLUGIN_POWER_HUES } from '@/lib/plugins/powers';
import type { PluginDraftSummary } from '@/types/plugin-drafts';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

export const playgroundHref = (draftId: string) =>
	`/dashboard/plugins/playground/${draftId}`;

/** "All 5 pass" / "2 checks failing", from the checks the author's browser last ran. */
function checkChip(draft: PluginDraftSummary): CatalogChip | null {
	const summary = draft.checkSummary;
	if (!summary || summary.total === 0) return null;
	const failing = summary.total - summary.passed;
	return failing === 0
		? { label: `All ${summary.total} pass`, tone: 'green' }
		: {
				label: `${failing} ${failing === 1 ? 'check' : 'checks'} failing`,
				tone: 'red',
			};
}

function DraftsList({ onWrite }: { onWrite: () => void }) {
	const router = useRouter();
	const {
		data: drafts,
		error,
		isLoading,
		mutate,
	} = useSWR(PLUGIN_DRAFTS_KEY, listDrafts, { revalidateOnFocus: false });
	const [deleting, setDeleting] = useState<PluginDraftSummary | null>(null);

	const confirmDelete = async () => {
		const draft = deleting;
		setDeleting(null);
		if (!draft) return;
		try {
			await deleteDraft(draft.id);
			await mutate();
			toast.success('Draft deleted');
		} catch (reason) {
			toast.error(
				reason instanceof Error ? reason.message : 'Could not delete the draft'
			);
		}
	};

	return (
		<section aria-labelledby='plugin-drafts-title' className='mt-8'>
			<div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
				<h2
					className='text-[15px] font-semibold text-white'
					id='plugin-drafts-title'
				>
					Drafts
				</h2>

				<span className='font-mono text-xs text-zinc-500'>
					{drafts?.length ?? 0}
				</span>

				<span className='text-[13px] text-zinc-500'>Only you see these.</span>
			</div>

			{error && (
				<div
					className='mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
					role='alert'
				>
					Couldn&apos;t load your drafts.
					<Button onClick={() => void mutate()} size='sm' variant='outline'>
						Try again
					</Button>
				</div>
			)}

			<CatalogGrid className='mt-3.5' viewMode='grid'>
				{isLoading && <CatalogCardSkeleton count={3} viewMode='grid' />}

				{drafts?.map((draft) => {
					const href = playgroundHref(draft.id);
					const chip = checkChip(draft);
					return (
						<CatalogCard
							description={draft.description || 'No description yet.'}
							hue={PLUGIN_POWER_HUES.own}
							icon={PLUGIN_ICONS[draft.icon] ?? PLUGIN_ICONS.puzzle}
							key={draft.id}
							meta={`Edited ${formatTimeAgo(draft.updatedAt)}`}
							onOpen={() => router.push(href)}
							title={draft.name || 'Untitled plugin'}
							viewMode='grid'
							action={
								<Link className={CARD_BUTTON_CLASS} href={href}>
									Open
								</Link>
							}
							chips={[
								{ label: 'Draft', tone: 'neutral' },
								...(chip ? [chip] : []),
							]}
							detail={
								<span className='truncate font-mono text-[11.5px]'>
									{draft.pluginId}
								</span>
							}
							menu={
								<DropdownMenu>
									<DropdownMenuTrigger
										aria-label={`Options for ${draft.name || 'this draft'}`}
										className={CARD_MENU_TRIGGER_CLASS}
									>
										<CardMenuIcon />
									</DropdownMenuTrigger>

									<DropdownMenuContent align='end'>
										<DropdownMenuItem onClick={() => router.push(href)}>
											<Pencil />
											Open
										</DropdownMenuItem>

										<DropdownMenuItem onClick={() => setDeleting(draft)}>
											<Trash2 />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							}
						/>
					);
				})}

				{!isLoading && (
					<CreateTile
						hint='Start from a template, watch the node draw, then submit it to Shiko.'
						onClick={onWrite}
						title='Write a plugin'
						viewMode='grid'
					/>
				)}
			</CatalogGrid>

			<RecipeConfirmDialog
				confirmLabel='Delete draft'
				description={`This deletes “${deleting?.name || 'this draft'}” and its code. Plugins you already submitted aren’t affected. It can’t be undone.`}
				onCancel={() => setDeleting(null)}
				onConfirm={() => void confirmDelete()}
				open={deleting !== null}
				title='Delete this draft?'
			/>
		</section>
	);
}

/**
 * Your drafts on My plugins: cards like the submitted plugins, a "Write a plugin" tile at
 * the end. Only with Developer mode on, since that's what drafts need; the page's
 * "Write a plugin" button is how someone with it off finds out.
 */
export function PluginDraftsSection({ onWrite }: { onWrite: () => void }) {
	const { enabled } = useDeveloperMode();
	return enabled ? <DraftsList onWrite={onWrite} /> : null;
}
