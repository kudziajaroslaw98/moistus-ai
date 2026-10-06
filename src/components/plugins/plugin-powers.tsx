'use client';

import { Button } from '@/components/ui/button';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { listHosts, pluginPowers } from '@/lib/plugins/powers';
import { Globe, ListTree, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { PluginSiteName, PluginSitesSentence } from './plugin-site-note';

/** One line on a plugin card: what the plugin can reach beyond its own nodes. */
export function PluginPowersLine({ manifest }: { manifest: PluginManifest }) {
	const powers = pluginPowers(manifest);

	if (powers.kind === 'network') {
		const operators = [
			...new Set(powers.sites.map((site) => site.operator)),
		].join(' or ');
		return (
			<p
				className='flex items-start gap-2 text-xs leading-[17px] text-text-secondary'
				data-testid='plugin-powers'
			>
				<Globe aria-hidden className='mt-px size-3.5 shrink-0 text-sky-300' />

				<span>
					{powers.sites.map((site, index) => (
						<span key={site.host}>
							{index > 0 ? ' ' : ''}

							{`Sends ${site.sends} to `}

							<PluginSiteName site={site} />

							{index === powers.sites.length - 1 ? '' : '.'}
						</span>
					))}

					{`, only when an editor adds or refreshes one. Viewing the map never contacts ${operators}.`}
				</span>
			</p>
		);
	}

	if (powers.kind === 'branch') {
		return (
			<p
				className='flex items-start gap-2 text-xs leading-[17px] text-text-secondary'
				data-testid='plugin-powers'
			>
				<ListTree
					aria-hidden
					className='mt-px size-3.5 shrink-0 text-violet-300'
				/>
				Reads the nodes under its nodes to draw them. Nothing leaves your
				browser.
			</p>
		);
	}

	return (
		<p
			className='flex items-start gap-2 text-xs text-text-secondary'
			data-testid='plugin-powers'
		>
			<ShieldCheck
				aria-hidden
				className='size-3.5 shrink-0 text-emerald-400/90'
			/>
			Sees and changes only its own nodes. No internet access.
		</p>
	);
}

/** Whether turning this plugin on needs the owner's explicit yes first. */
export function needsPowerApproval(manifest: PluginManifest): boolean {
	return pluginPowers(manifest).kind !== 'own';
}

interface PluginPowersConfirmProps {
	manifest: PluginManifest;
	/** The plugin's own author isn't Shiko's reviewer: say they don't receive the data. */
	fromCatalog: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

/**
 * The owner's approval before a plugin with powers is turned on: what it reads or sends,
 * to whom, and when. Nothing about it runs until they press Turn on.
 */
export function PluginPowersConfirm({
	manifest,
	fromCatalog,
	onCancel,
	onConfirm,
}: PluginPowersConfirmProps) {
	const reduceMotion = useReducedMotion();
	const powers = pluginPowers(manifest);
	const operators =
		powers.kind === 'network'
			? [...new Set(powers.sites.map((site) => site.operator))].join(' or ')
			: '';

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			aria-label={`Turn on ${manifest.name}?`}
			className='space-y-2.5 rounded-lg border border-sky-300/25 bg-sky-300/[0.06] p-3'
			data-testid='plugin-powers-confirm'
			exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
			initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
			role='group'
			transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
		>
			<p className='text-[13px] font-medium text-text-primary'>
				{`Turn on ${manifest.name}?`}
			</p>

			{powers.kind === 'network' ? (
				<>
					<p className='text-[13px] leading-[18px] text-zinc-200'>
						<PluginSitesSentence
							lead='It sends'
							scope='typed into its nodes'
							sites={powers.sites}
						/>

						{fromCatalog ? ' The plugin’s author doesn’t receive them,' : ''}

						{fromCatalog ? ' and it' : ' It'}

						{' can’t read the rest of the map.'}
					</p>

					<p className='text-xs leading-[17px] text-text-secondary'>
						{`It contacts ${listHosts(powers.sites)} only when someone editing the map adds one or presses Refresh. Everyone else sees the saved result, and viewing the map never contacts ${operators}. You can turn it off any time.`}
					</p>
				</>
			) : (
				<p className='text-[13px] leading-[18px] text-zinc-200'>
					It reads the nodes under each of its nodes (their text, tasks, people,
					dates and tags) to draw its view. It can’t reach any site, so nothing
					leaves the browser. You can turn it off any time.
				</p>
			)}

			<div className='flex justify-end gap-2'>
				<Button onClick={onCancel} variant='outline'>
					Cancel
				</Button>

				<Button onClick={onConfirm}>Turn on</Button>
			</div>
		</motion.div>
	);
}
