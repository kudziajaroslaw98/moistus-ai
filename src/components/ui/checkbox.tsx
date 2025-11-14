'use client';

import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { forwardRef } from 'react';

interface CheckboxProps {
	checked?: boolean;
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
	size?: 'sm' | 'md' | 'lg';
	variant?: 'default' | 'card';
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
	(
		{
			checked = false,
			onChange,
			disabled = false,
			className,
			size = 'md',
			variant = 'default',
		},
		ref
	) => {
		const sizeClasses = {
			sm: 'h-4 w-4',
			md: 'h-5 w-5',
			lg: 'h-6 w-6',
		};

		const handleClick = () => {
			if (!disabled && onChange) {
				onChange(!checked);
			}
		};

		return (
			<button
				aria-checked={checked}
				disabled={disabled}
				onClick={handleClick}
				ref={ref}
				role='checkbox'
				type='button'
				className={cn(
					'relative flex items-center justify-center rounded border-2 transition-all',
					'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 focus:ring-offset-app-primary-muted',
					sizeClasses[size],
					// Default variant styling
					variant === 'default' && [
						'border-zinc-600 bg-zinc-800',
						checked &&
							'border-app-primary/60 bg-app-primary! accent-primary-500',
						!checked && 'hover:border-zinc-500 hover:bg-zinc-700',
						disabled && 'opacity-50 cursor-not-allowed',
					],
					// Card variant styling (for overlay on images)
					variant === 'card' && [
						'border-white/30 bg-black/30 backdrop-blur-sm',
						checked &&
							'border-app-primary/60 bg-app-primary! accent-primary-500',
						!checked && 'hover:border-white/50 hover:bg-black/40',
						disabled && 'opacity-50 cursor-not-allowed',
					],
					className
				)}
			>
				{/* Checkmark */}
				<motion.div
					className='flex items-center justify-center'
					initial={false}
					animate={{
						scale: checked ? 1 : 0,
						opacity: checked ? 1 : 0,
					}}
					transition={{
						type: 'spring',
						stiffness: 500,
						damping: 30,
					}}
				>
					<Check
						className={cn(
							size === 'sm' && 'h-2.5 w-2.5',
							size === 'md' && 'h-3 w-3',
							size === 'lg' && 'h-4 w-4',
							'text-white'
						)}
					/>
				</motion.div>
			</button>
		);
	}
);

Checkbox.displayName = 'Checkbox';
