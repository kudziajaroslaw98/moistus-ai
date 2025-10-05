'use client';

import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

interface BinaryResponseProps {
	value?: boolean;
	onChange: (val: boolean) => void;
	disabled?: boolean;
}

export const BinaryResponse = ({
	value,
	onChange,
	disabled = false
}: BinaryResponseProps) => {
	return (
		<div className='flex gap-2'>
			<motion.button
				whileHover={!disabled ? { scale: 1.05 } : {}}
				whileTap={!disabled ? { scale: 0.95 } : {}}
				onClick={() => onChange(true)}
				disabled={disabled}
				className={cn(
					'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all',
					value === true
						? 'bg-green-500/20 border-2 border-green-500/50'
						: 'bg-white/5 border border-white/10 hover:bg-white/10',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
			>
				<Check className='w-4 h-4' style={{ color: value === true ? '#10b981' : GlassmorphismTheme.text.medium }} />

				<span style={{
					color: value === true ? '#10b981' : GlassmorphismTheme.text.medium,
					fontWeight: value === true ? 600 : 400
				}}>
					Yes
				</span>
			</motion.button>

			<motion.button
				whileHover={!disabled ? { scale: 1.05 } : {}}
				whileTap={!disabled ? { scale: 0.95 } : {}}
				onClick={() => onChange(false)}
				disabled={disabled}
				className={cn(
					'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all',
					value === false
						? 'bg-red-500/20 border-2 border-red-500/50'
						: 'bg-white/5 border border-white/10 hover:bg-white/10',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
			>
				<X className='w-4 h-4' style={{ color: value === false ? '#ef4444' : GlassmorphismTheme.text.medium }} />

				<span style={{
					color: value === false ? '#ef4444' : GlassmorphismTheme.text.medium,
					fontWeight: value === false ? 600 : 400
				}}>
					No
				</span>
			</motion.button>
		</div>
	);
};