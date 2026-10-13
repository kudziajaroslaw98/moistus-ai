'use client';

import { RECIPE_ICONS } from '@/lib/extensions/recipe-icons';
import { RECIPE_ICON_KEYS, type RecipeIconKey } from '@/lib/extensions/recipe-schema';
import { cn } from '@/utils/cn';

interface RecipeIconPickerProps {
	value: RecipeIconKey;
	onChange: (icon: RecipeIconKey) => void;
	labelledBy: string;
	disabled?: boolean;
}

export function RecipeIconPicker({
	value,
	onChange,
	labelledBy,
	disabled,
}: RecipeIconPickerProps) {
	return (
		<div
			aria-labelledby={labelledBy}
			className='grid grid-cols-8 gap-1.5'
			role='radiogroup'
		>
			{RECIPE_ICON_KEYS.map((key) => {
				const { icon: Icon, label } = RECIPE_ICONS[key];
				const isSelected = key === value;
				return (
					<button
						aria-checked={isSelected}
						aria-label={label}
						disabled={disabled}
						key={key}
						onClick={() => onChange(key)}
						role='radio'
						title={label}
						type='button'
						className={cn(
							'flex h-9 items-center justify-center rounded-lg border transition-colors duration-200 ease',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
							'disabled:pointer-events-none disabled:opacity-50',
							isSelected
								? 'border-primary-400 bg-primary-400/15 text-primary-400'
								: 'border-zinc-700/50 bg-zinc-800/30 text-text-secondary hover:border-zinc-600/50 hover:text-text-primary'
						)}
					>
						<Icon aria-hidden className='size-4' />
					</button>
				);
			})}
		</div>
	);
}
