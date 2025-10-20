'use client';

import { cn } from '@/utils/cn';
import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';

interface BinaryResponseProps {
	value?: boolean;
	onChange: (val: boolean) => void;
	disabled?: boolean;
}

export const BinaryResponse = ({
	value,
	onChange,
	disabled = false,
}: BinaryResponseProps) => {
	return (
		<div className='flex gap-2'>
			<motion.button
				disabled={disabled}
				whileHover={!disabled ? { scale: 1.05 } : {}}
				whileTap={!disabled ? { scale: 0.95 } : {}}
				className={cn(
					'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all',
					value === true
						? 'bg-green-500/20 border-2 border-green-500/50'
						: 'bg-white/5 border border-white/10 hover:bg-white/10',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
				onClick={() => onChange(true)}
			>
				<Check
					className={cn(
						'w-4 h-4',
						value === true ? 'text-green-500' : 'text-text-medium'
					)}
				/>

				<span
					className={cn(
						value === true
							? 'text-green-500 font-semibold'
							: 'text-text-medium font-normal'
					)}
				>
					Yes
				</span>
			</motion.button>

			<motion.button
				disabled={disabled}
				whileHover={!disabled ? { scale: 1.05 } : {}}
				whileTap={!disabled ? { scale: 0.95 } : {}}
				className={cn(
					'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all',
					value === false
						? 'bg-red-500/20 border-2 border-red-500/50'
						: 'bg-white/5 border border-white/10 hover:bg-white/10',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
				onClick={() => onChange(false)}
			>
				<X
					className={cn(
						'w-4 h-4',
						value === false ? 'text-red-500' : 'text-text-medium'
					)}
				/>

				<span
					className={cn(
						value === false
							? 'text-red-500 font-semibold'
							: 'text-text-medium font-normal'
					)}
				>
					No
				</span>
			</motion.button>
		</div>
	);
};
