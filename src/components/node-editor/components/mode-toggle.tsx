'use client';

import { cn } from '@/utils/cn';
import { List, Sparkles, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ModeToggleProps } from '../types';

const theme = {
	container: 'flex items-center gap-1 p-1 bg-zinc-900 rounded-md',
	button: 'relative px-3 py-1.5 text-xs font-medium transition-colors rounded',
	inactive: 'text-zinc-500 hover:text-zinc-300',
	active: 'text-zinc-100',
	indicator: 'absolute inset-0 bg-zinc-800 rounded',
	icon: 'w-3 h-3',
};

export const ModeToggle: React.FC<ModeToggleProps> = ({ 
	mode, 
	onToggle, 
	onShowTypePicker,
	selectedCommand 
}) => {
	return (
		<div className='p-4 border-b border-zinc-800'>
			<div className='flex items-center justify-between'>
				<div className='flex flex-col gap-1'>
					<div className='flex items-center justify-between'>
						<span className='text-xs text-zinc-300'>Input Mode</span>

						{onShowTypePicker && selectedCommand && (
							<button
								className='flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors'
								title='Change node type (Ctrl+T)'
								onClick={onShowTypePicker}
							>
								<RefreshCw className='w-3 h-3' />
								Change Type
							</button>
						)}
					</div>

					<p className='text-xs text-zinc-500'>
						<AnimatePresence mode='popLayout'>
							{mode === 'quick' ? (
								<motion.span
									animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
									exit={{ opacity: 0, x: 10 }}
									initial={{ opacity: 0, x: -10 }}
									key='quick'
								>
									Type naturally with smart parsing
								</motion.span>
							) : (
								<motion.span
									animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
									exit={{ opacity: 0, x: 10 }}
									initial={{ opacity: 0, x: -10 }}
									key='structured'
								>
									Fill in structured field
								</motion.span>
							)}
						</AnimatePresence>
					</p>
				</div>

				<div className={theme.container}>
					<button
						type='button'
						className={cn(
							theme.button,
							mode === 'quick' ? theme.active : theme.inactive
						)}
						onClick={() => onToggle('quick')}
					>
						{mode === 'quick' && (
							<motion.div
								className={theme.indicator}
								layoutId='mode-indicator'
								transition={{
									type: 'spring',
									bounce: 0.2,
									duration: 0.6,
								}}
							/>
						)}

						<span className='relative z-10 flex items-center gap-1.5'>
							<Sparkles className={theme.icon} />
							Quick
						</span>
					</button>

					<button
						type='button'
						className={cn(
							theme.button,
							mode === 'structured' ? theme.active : theme.inactive
						)}
						onClick={() => onToggle('structured')}
					>
						{mode === 'structured' && (
							<motion.div
								className={theme.indicator}
								layoutId='mode-indicator'
								transition={{
									type: 'spring',
									bounce: 0.2,
									duration: 0.6,
								}}
							/>
						)}

						<span className='relative z-10 flex items-center gap-1.5'>
							<List className={theme.icon} />
							Form
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};