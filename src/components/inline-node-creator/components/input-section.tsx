'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface InputSectionProps {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onSelectionChange: () => void;
	placeholder: string;
	disabled: boolean;
	className?: string;
}

const theme = {
	input:
		'bg-zinc-900 text-zinc-100 placeholder-zinc-500 border-0 focus:ring-1 focus:ring-teal-500',
};

export const InputSection: React.FC<InputSectionProps> = ({
	value,
	onChange,
	onKeyDown,
	onSelectionChange,
	placeholder,
	disabled,
	className,
}) => {
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div className={cn('flex-1', className)}>
			<motion.textarea
				ref={inputRef}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={onKeyDown}
				onSelect={onSelectionChange}
				placeholder={placeholder}
				className={cn(
					theme.input,
					'w-full px-3 py-2 text-sm rounded-md resize-none',
					'min-h-[120px] max-h-[200px]'
				)}
				disabled={disabled}
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
				whileFocus={{
					scale: 1.01,
					transition: { duration: 0.2 },
				}}
			/>
		</div>
	);
};
