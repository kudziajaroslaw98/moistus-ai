'use client';

import type { PluginCheck } from '@/lib/plugins/plugin-checks';
import type { PluginDraftCheckSummary } from '@/types/plugin-drafts';
import { cn } from '@/utils/cn';
import { Check, X } from 'lucide-react';
import {
	PANEL_CLASS,
	PANEL_HEADER_CLASS,
	PANEL_TITLE_CLASS,
} from './playground-styles';

/** The submit sheet's automatic checks, kept up to date while the author types. */
export function ChecksPanel({
	checks,
	summary,
}: {
	checks: PluginCheck[];
	/** null until the first run has finished. */
	summary: PluginDraftCheckSummary | null;
}) {
	const allPass =
		summary !== null && summary.passed === summary.total && summary.total > 0;

	return (
		<section aria-label='Checks' className={PANEL_CLASS}>
			<div className={PANEL_HEADER_CLASS}>
				<h2 className={PANEL_TITLE_CLASS}>Checks</h2>

				<span
					role='status'
					className={cn(
						'rounded-full border bg-[#0e0f12] px-2 py-0.5 text-[11px] leading-4',
						summary === null && 'border-[#2a2c33] text-zinc-400',
						allPass && 'border-emerald-400/35 text-emerald-300',
						summary !== null && !allPass && 'border-red-500/35 text-red-300'
					)}
				>
					{summary === null
						? 'Checking…'
						: allPass
							? `All ${summary.total} pass`
							: `${summary.passed} of ${summary.total} pass`}
				</span>
			</div>

			<ul>
				{checks.map((check) => (
					<li
						className='flex items-start gap-3 border-b border-[#16171b] px-4 py-2.5 last:border-b-0'
						key={check.label}
					>
						<span
							aria-hidden
							className={cn(
								'flex size-5 shrink-0 items-center justify-center rounded-full',
								check.ok
									? 'bg-emerald-400/12 text-emerald-300'
									: 'bg-red-500/12 text-red-300'
							)}
						>
							{check.ok ? (
								<Check className='size-3' />
							) : (
								<X className='size-3' />
							)}
						</span>

						<span className='min-w-0 flex-1'>
							<span className='block text-[13px] leading-5 text-zinc-200'>
								<span className='sr-only'>
									{check.ok ? 'Passed: ' : 'Failed: '}
								</span>

								{check.label}
							</span>

							{!check.ok && check.detail && (
								<span className='block text-xs leading-[17px] text-red-300'>
									{check.detail}
								</span>
							)}
						</span>

						{check.ok && check.detail && (
							<span className='max-w-[40%] shrink-0 truncate font-mono text-xs text-zinc-500'>
								{check.detail}
							</span>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
