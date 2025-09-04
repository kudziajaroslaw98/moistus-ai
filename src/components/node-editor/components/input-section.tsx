'use client';

import React, { useRef } from 'react';
import { EnhancedInput } from '../enhanced-input/enhanced-input';
import { cn } from '@/utils/cn';

interface InputSectionProps {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onSelectionChange: () => void;
	placeholder: string;
	disabled: boolean;
	className?: string;
	// Command system integration props
	enableCommands?: boolean;
	currentNodeType?: string;
	onNodeTypeChange?: (nodeType: string) => void;
	onCommandExecuted?: (command: any) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
	value,
	onChange,
	onKeyDown,
	onSelectionChange,
	placeholder,
	disabled,
	className,
	// Command system props
	enableCommands,
	currentNodeType,
	onNodeTypeChange,
	onCommandExecuted,
}) => {
	const inputRef = useRef<HTMLTextAreaElement>(null);

	return (
		<EnhancedInput
			ref={inputRef}
			value={value}
			onChange={onChange}
			onKeyDown={onKeyDown}
			onSelectionChange={onSelectionChange}
			placeholder={placeholder}
			disabled={disabled}
			className={cn('flex-1 min-w-0', className)}
			initial={{ opacity: 1, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
			whileFocus={{
				scale: 1.01,
				transition: { duration: 0.2 },
			}}
			enableCommands={enableCommands}
			currentNodeType={currentNodeType}
			onNodeTypeChange={onNodeTypeChange}
			onCommandExecuted={onCommandExecuted}
		/>
	);
};