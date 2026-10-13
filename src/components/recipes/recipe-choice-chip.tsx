'use client';

import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface RecipeChoiceChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	selected: boolean;
	/** `radio` for one-of groups (role="radio"), `toggle` for multi-select (aria-pressed). */
	mode: 'radio' | 'toggle';
	icon?: LucideIcon;
}

/** Pill choice styled like the history filter chips. */
export function RecipeChoiceChip({
	selected,
	mode,
	icon: Icon,
	className,
	children,
	...props
}: RecipeChoiceChipProps) {
	return (
		<button
			type='button'
			{...(mode === 'radio'
				? { role: 'radio', 'aria-checked': selected }
				: { 'aria-pressed': selected })}
			className={cn(
				'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-200 ease',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
				'disabled:pointer-events-none disabled:opacity-50',
				selected
					? 'border-primary-400/45 bg-primary-400/15 text-primary-100'
					: 'border-white/[0.08] text-white/65 hover:border-white/15 hover:text-white/90',
				className
			)}
			{...props}
		>
			{Icon && <Icon aria-hidden className='size-3.5' />}

			{children}
		</button>
	);
}
