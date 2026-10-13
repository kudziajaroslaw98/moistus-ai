'use client';

import type { PluginCheck } from '@/lib/plugins/plugin-checks';
import { Check, X } from 'lucide-react';

/** The automatic checks, passed or failed with why (submit sheet and review). */
export function PluginChecksList({
	checks,
	title = 'Checks',
}: {
	checks: PluginCheck[];
	title?: string;
}) {
	return (
		<section aria-label={title} className='flex flex-col gap-1.5'>
			<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
				{title}
			</h3>

			<ul className='flex flex-col gap-1.5'>
				{checks.map((check) => (
					<li
						className='flex items-start gap-2 text-[13px] leading-[18px]'
						key={check.label}
					>
						{check.ok ? (
							<Check
								aria-label='Passed'
								className='mt-0.5 size-3.5 shrink-0 text-emerald-400'
							/>
						) : (
							<X
								aria-label='Failed'
								className='mt-0.5 size-3.5 shrink-0 text-error-500'
							/>
						)}

						<span className={check.ok ? 'text-zinc-200' : 'text-error-200'}>
							{check.label}

							{check.detail && (
								<span className='block text-xs text-text-secondary'>
									{check.detail}
								</span>
							)}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
