'use client';

import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

interface MultipleChoiceResponseProps {
	value?: string | string[];
	onChange: (val: string | string[]) => void;
	options?: Array<{ id: string; label: string }>;
	allowMultiple?: boolean;
	disabled?: boolean;
}

export const MultipleChoiceResponse = ({
	value,
	onChange,
	options = [],
	allowMultiple = false,
	disabled = false
}: MultipleChoiceResponseProps) => {
	// Ensure options have valid structure
	const validOptions = options.filter(opt => opt && opt.id && opt.label);
	const handleSelect = (optionId: string) => {
		if (allowMultiple) {
			const currentValue = (value as string[]) || [];
			const newValue = currentValue.includes(optionId)
				? currentValue.filter(id => id !== optionId)
				: [...currentValue, optionId];
			onChange(newValue);
		} else {
			onChange(optionId);
		}
	};

	const isSelected = (optionId: string) => {
		if (allowMultiple) {
			return ((value as string[]) || []).includes(optionId);
		}
		return value === optionId;
	};

	// Don't render if no valid options
	if (validOptions.length === 0) {
		return (
			<div style={{
				color: GlassmorphismTheme.text.disabled,
				fontSize: '13px',
				fontStyle: 'italic',
				textAlign: 'center'
			}}>
				No options available
			</div>
		);
	}

	return (
		<div className='space-y-2'>
			{validOptions.map((option) => (
				<motion.button
					key={option.id}
					whileHover={!disabled ? { scale: 1.02 } : {}}
					whileTap={!disabled ? { scale: 0.98 } : {}}
					onClick={() => handleSelect(option.id)}
					disabled={disabled}
					className={cn(
						'w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3',
						isSelected(option.id)
							? 'bg-blue-500/20 border border-blue-500/50'
							: 'bg-white/5 border border-white/10 hover:bg-white/10',
						disabled && 'opacity-50 cursor-not-allowed'
					)}
				>
					<div className={cn(
						'w-4 h-4 flex items-center justify-center',
						allowMultiple ? 'rounded' : 'rounded-full',
						'border-2',
						isSelected(option.id)
							? 'border-blue-500 bg-blue-500/20'
							: 'border-white/30'
					)}>
						{isSelected(option.id) && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className={cn(
									allowMultiple ? 'w-2.5 h-2.5' : 'w-2 h-2',
									allowMultiple ? 'rounded-sm' : 'rounded-full',
									'bg-blue-500'
								)}
							/>
						)}
					</div>
					<span style={{
						color: isSelected(option.id) ? '#3b82f6' : GlassmorphismTheme.text.high,
						fontWeight: isSelected(option.id) ? 500 : 400,
						fontSize: '14px'
					}}>
						{option.label}
					</span>
				</motion.button>
			))}
		</div>
	);
};