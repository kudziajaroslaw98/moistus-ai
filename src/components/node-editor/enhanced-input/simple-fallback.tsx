'use client';

import React, { forwardRef, useState, useMemo } from 'react';
import { motion, type MotionProps } from 'motion/react';
import { cn } from '@/utils/cn';
import { ValidationTooltip } from './validation-tooltip';
import { getValidationResults } from '../utils/validation';

interface SimpleFallbackProps {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onSelectionChange: () => void;
	placeholder: string;
	disabled: boolean;
	className?: string;
	// Motion props for compatibility with existing system
	initial?: MotionProps['initial'];
	animate?: MotionProps['animate'];
	transition?: MotionProps['transition'];
	whileFocus?: MotionProps['whileFocus'];
}

export const SimpleFallback = forwardRef<HTMLTextAreaElement, SimpleFallbackProps>(
	({
		value,
		onChange,
		onKeyDown,
		onSelectionChange,
		placeholder,
		disabled,
		className,
		initial,
		animate,
		transition,
		whileFocus,
		...rest
	}, ref) => {
		const [validationTooltipOpen, setValidationTooltipOpen] = useState(false);

		// Get validation results
		const validationErrors = useMemo(() => getValidationResults(value), [value]);
		const hasErrors = validationErrors.some(error => error.type === 'error');
		const hasWarnings = validationErrors.some(error => error.type === 'warning');

		return (
			<motion.div
				className={cn(
					'enhanced-input-container flex-1 relative', 
					hasErrors && 'has-validation-errors',
					hasWarnings && 'has-validation-warnings',
					className
				)}
				initial={initial}
				animate={animate}
				transition={transition}
				{...rest}
			>
				<ValidationTooltip
					errors={validationErrors}
					isOpen={validationTooltipOpen}
					onOpenChange={setValidationTooltipOpen}
				>
					<motion.div
						className="enhanced-input-wrapper"
						whileFocus={whileFocus}
					>
						<textarea
							ref={ref}
							value={value}
							onChange={(e) => onChange(e.target.value)}
							onKeyDown={onKeyDown}
							onSelect={onSelectionChange}
							placeholder={placeholder}
							disabled={disabled}
							className={cn(
								'w-full min-h-[60px] max-h-[216px] p-3 rounded-md border-0 outline-none resize-none',
								'bg-zinc-900 text-zinc-100 placeholder-zinc-500',
								'focus:ring-1 focus:ring-teal-500',
								'font-inherit leading-relaxed',
								disabled && 'opacity-50 cursor-not-allowed'
							)}
							style={{ fontSize: '16px' }} // Prevent iOS zoom
						/>
					</motion.div>
				</ValidationTooltip>
			</motion.div>
		);
	}
);

SimpleFallback.displayName = 'SimpleFallback';