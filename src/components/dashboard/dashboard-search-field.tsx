'use client';

import { cn } from '@/utils/cn';
import { Search, X } from 'lucide-react';
import { forwardRef } from 'react';

interface DashboardSearchFieldProps {
	id: string;
	/** Accessible label, also the placeholder. */
	label: string;
	value: string;
	onChange: (value: string) => void;
	/** Keyboard hint shown while the field is empty, like "Ctrl F". */
	shortcut?: string;
}

/** Top-bar search field for dashboard pages that filter a list. */
export const DashboardSearchField = forwardRef<
	HTMLInputElement,
	DashboardSearchFieldProps
>(function DashboardSearchField({ id, label, value, onChange, shortcut }, ref) {
	return (
		<div className='relative'>
			<label className='sr-only' htmlFor={id}>
				{label}
			</label>

			<Search
				aria-hidden='true'
				className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500'
			/>

			<input
				autoComplete='off'
				id={id}
				onChange={(e) => onChange(e.target.value)}
				placeholder={label}
				ref={ref}
				type='search'
				value={value}
				className={cn(
					'h-10 w-full rounded-[10px] border border-[#1d1f24] bg-[#0e0f12] pl-[38px] text-sm text-white placeholder:text-zinc-500 transition-colors duration-200 ease focus:border-[#2f3139] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 [&::-webkit-search-cancel-button]:hidden',
					shortcut ? 'pr-16' : 'pr-10'
				)}
			/>

			{value ? (
				<button
					aria-label='Clear search'
					className='absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
					onClick={() => onChange('')}
					type='button'
				>
					<X aria-hidden='true' className='size-3.5' />
				</button>
			) : (
				shortcut && (
					<kbd className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[5px] border border-[#2a2c33] px-1.5 py-px font-mono text-[11px] text-zinc-400'>
						{shortcut}
					</kbd>
				)
			)}
		</div>
	);
});
