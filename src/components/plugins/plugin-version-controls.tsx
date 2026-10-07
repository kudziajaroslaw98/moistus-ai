'use client';

import { Button } from '@/components/ui/button';
import {
	availableCatalogUpdate,
	compareVersions,
	findCatalogVersion,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { countNodesNotFitting } from '@/lib/plugins/version-fit';
import type { NodeExtensionData } from '@/types/extensions';
import type { MapPluginRecord } from '@/types/plugins';
import { Loader2, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { formatTimeAgo, PluginUpdateDetails } from './plugin-update-details';
import { useCatalogVersionManifest } from './use-catalog-manifests';

function NotFittingNote({
	count,
	name,
	version,
}: {
	count: number;
	name: string;
	version: string;
}) {
	if (count === 0) return null;
	const one = count === 1;
	return (
		<p className='flex items-start gap-1.5 text-xs leading-[17px] text-amber-200'>
			<TriangleAlert aria-hidden className='mt-0.5 size-3 shrink-0' />

			{`${count} ${name} ${one ? 'node has' : 'nodes have'} data ${version} doesn’t accept. ${one ? 'It keeps its' : 'They keep their'} last saved view until someone edits ${one ? 'it' : 'them'}.`}
		</p>
	);
}

const fitCount = (
	extensions: readonly NodeExtensionData[],
	manifest: PluginManifest | null | undefined
) => (manifest ? countNodesNotFitting(extensions, manifest) : 0);

interface PluginVersionControlsProps {
	entry: PluginCatalogEntry;
	record: MapPluginRecord;
	name: string;
	/** This plugin's nodes on the map, checked against the version being moved to. */
	extensions: readonly NodeExtensionData[];
	/** The owner chose Later for this update; show a one-line reminder instead. */
	isUpdateDismissed: boolean;
	onChangeVersion: (version: string) => Promise<boolean>;
	onLater: (version: string) => void;
	onReview: () => void;
}

/**
 * Owner-only part of a plugin card: "Update available" with the notes, power changes
 * and how many nodes won't fit, and "Roll back to <version>" after an update.
 */
export function PluginVersionControls({
	entry,
	record,
	name,
	extensions,
	isUpdateDismissed,
	onChangeVersion,
	onLater,
	onReview,
}: PluginVersionControlsProps) {
	const shouldReduceMotion = useReducedMotion();
	const [pending, setPending] = useState<'update' | 'rollBack' | null>(null);
	const [isConfirmingRollBack, setIsConfirmingRollBack] = useState(false);

	const update = availableCatalogUpdate(entry.id, record.version);
	const rollBackTo =
		record.previousVersion &&
		compareVersions(record.previousVersion, record.version) < 0 &&
		findCatalogVersion(entry.id, record.previousVersion)
			? record.previousVersion
			: null;
	const showUpdate = Boolean(update) && !isUpdateDismissed;
	const updateManifest = useCatalogVersionManifest(
		entry.id,
		showUpdate && update ? update.version : null
	);
	const rollBackManifest = useCatalogVersionManifest(entry.id, rollBackTo);

	const moveTo = async (version: string, kind: 'update' | 'rollBack') => {
		setPending(kind);
		const ok = await onChangeVersion(version);
		setPending(null);
		if (ok) setIsConfirmingRollBack(false);
	};

	const requestRollBack = () => {
		if (!rollBackTo) return;
		if (fitCount(extensions, rollBackManifest) > 0) setIsConfirmingRollBack(true);
		else void moveTo(rollBackTo, 'rollBack');
	};

	const motionProps = {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' as const },
	};

	return (
		<AnimatePresence initial={false} mode='popLayout'>
			{update && showUpdate && (
				<motion.div
					key='update'
					{...motionProps}
					className='space-y-2 rounded-lg border border-primary-500/30 bg-primary-500/[0.07] p-3'
					data-testid='plugin-update'
				>
					<p className='flex items-center gap-2 text-[13px] font-semibold text-text-primary'>
						<span aria-hidden className='size-1.5 rounded-full bg-primary-500' />

						{`Update available · ${update.version}`}
					</p>

					<PluginUpdateDetails entry={entry} fromVersion={record.version} />

					<NotFittingNote
						count={fitCount(extensions, updateManifest)}
						name={name}
						version={update.version}
					/>

					<div className='flex justify-end gap-2'>
						<Button
							disabled={pending !== null}
							onClick={() => onLater(update.version)}
							variant='outline'
						>
							Later
						</Button>

						<Button
							disabled={pending !== null}
							onClick={() => void moveTo(update.version, 'update')}
						>
							{pending === 'update' ? (
								<Loader2 aria-label='Updating' className='size-4 animate-spin' />
							) : (
								'Update'
							)}
						</Button>
					</div>
				</motion.div>
			)}

			{update && !showUpdate && (
				<motion.div
					key='update-later'
					{...motionProps}
					className='flex items-center justify-between gap-2 rounded-lg bg-white/[0.035] py-1 pl-2.5 pr-1'
				>
					<span className='flex items-center gap-2 text-xs text-zinc-300'>
						<span aria-hidden className='size-1.5 rounded-full bg-primary-500' />

						{`${update.version} available`}
					</span>

					<Button onClick={onReview} size='sm' variant='ghost'>
						Review
					</Button>
				</motion.div>
			)}

			{rollBackTo && !isConfirmingRollBack && (
				<motion.div
					key='roll-back'
					{...motionProps}
					className='flex items-center justify-between gap-2 rounded-lg bg-white/[0.035] py-1.5 pl-2.5 pr-1.5'
				>
					<span className='text-xs text-zinc-300'>
						{`Updated to ${record.version}${record.updatedAt ? ` ${formatTimeAgo(record.updatedAt)}` : ''}`}
					</span>

					<Button
						disabled={pending !== null}
						onClick={requestRollBack}
						size='sm'
						variant='outline'
					>
						{pending === 'rollBack' ? (
							<Loader2 aria-label='Rolling back' className='size-3.5 animate-spin' />
						) : (
							`Roll back to ${rollBackTo}`
						)}
					</Button>
				</motion.div>
			)}

			{rollBackTo && isConfirmingRollBack && (
				<motion.div
					key='roll-back-confirm'
					{...motionProps}
					className='space-y-2.5 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3'
				>
					<p className='text-[13px] font-semibold text-text-primary'>
						{`Roll back to ${rollBackTo}?`}
					</p>

					<NotFittingNote
						count={fitCount(extensions, rollBackManifest)}
						name={name}
						version={rollBackTo}
					/>

					<div className='flex justify-end gap-2'>
						<Button
							disabled={pending !== null}
							onClick={() => setIsConfirmingRollBack(false)}
							variant='outline'
						>
							Cancel
						</Button>

						<Button
							disabled={pending !== null}
							onClick={() => void moveTo(rollBackTo, 'rollBack')}
						>
							{pending === 'rollBack' ? (
								<Loader2 aria-label='Rolling back' className='size-4 animate-spin' />
							) : (
								'Roll back'
							)}
						</Button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
