// src/components/ui/streaming-toast.tsx

'use client';

import { cn } from '@/lib/utils';
import useAppStore from '@/store/mind-map-store';
import { ToastStep } from '@/types/streaming-toast-state';
import { AlertCircle, CheckCircle, Circle, Info, Loader, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

/**
 * Headless component that manages the lifecycle of a custom streaming toast.
 * It subscribes to the Zustand store and uses `sonner` to show, update, or dismiss the toast.
 */
export function StreamingToast() {
	const { streamingToast } = useAppStore(
		useShallow((state) => ({
			streamingToast: state.streamingToast,
			hideStreamingToast: state.hideStreamingToast,
		}))
	);
	const { toastId, isOpen } = streamingToast;

	useEffect(() => {
		if (isOpen && toastId) {
			toast(<ToastUI {...streamingToast} />, {
				id: toastId,
				duration: Infinity,
				classNames: {
					toast: '!h-auto !p-0',
					title: 'w-full h-auto',
					content: 'w-full h-auto',
				},
			});
		}
	}, [isOpen, toastId, streamingToast]);

	return null;
}

const stepIcons = {
	pending: <Circle className='w-4 h-4 text-zinc-500' />,
	active: <Loader className='w-4 h-4 text-zinc-300 animate-spin' />,
	completed: <CheckCircle className='w-4 h-4 text-green-500' />,
	error: <AlertCircle className='w-4 h-4 text-red-500' />,
};

function StepItem({ step }: { step: ToastStep }) {
	const { name, status } = step;
	const isCompleted = status === 'completed';

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='flex items-center gap-3 text-sm'
			exit={{ opacity: 0 }}
			initial={{ opacity: 0, y: 5 }}
			transition={{ duration: 0.3, ease: 'easeOut' as const }}
		>
			<div className='flex-shrink-0 w-4 h-4 flex items-center justify-center'>
				{stepIcons[status]}
			</div>

			<div className='relative flex-grow'>
				<span
					className={cn(
						'relative',
						'transition-colors duration-300',
						isCompleted ? 'text-zinc-700' : 'text-zinc-300',
						status === 'active' && 'text-white font-medium'
					)}
				>
					{name}

					{isCompleted && (
						<motion.div
							animate={{ width: '100%' }}
							className='absolute top-1/2 left-0 h-px bg-zinc-700'
							initial={{ width: '0%' }}
							transition={{ duration: 0.4, ease: 'easeOut' as const }}
						/>
					)}
				</span>
			</div>
		</motion.div>
	);
}

/**
 * The actual UI for the toast, rendered by `sonner`.
 */
function ToastUI({
	header,
	message,
	error,
	steps,
}: {
	header: string;
	message: string;
	error: string | null;
	steps: ToastStep[];
}) {
	const [isHovered, setIsHovered] = useState(false);
	const [isStopping, setIsStopping] = useState(false);
	const stopStream = useAppStore((state) => state.stopStream);

	const isError = !!error;
	const isProcessComplete =
		!isError && steps.every((s) => s.status === 'completed');
	const isStreaming = !isError && !isProcessComplete;

	const handleStop = () => {
		setIsStopping(true);
		stopStream();
	};

	return (
		<motion.div
			layout
			className='flex items-start gap-4 h-auto p-4'
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className='flex-shrink-0 pt-1'>
				{isError ? (
					<AlertCircle className='w-5 h-5 text-red-500' />
				) : isProcessComplete ? (
					<CheckCircle className='w-5 h-5 text-green-500' />
				) : (
					<Loader className='w-5 h-5 text-zinc-300 animate-spin' />
				)}
			</div>

			<div className='flex-1 h-auto'>
				<p className='font-semibold text-white'>{header}</p>

				{/* This div creates a fixed-height container for the animated messages */}
				<div className='relative h-5 mt-1'>
					<AnimatePresence mode='popLayout'>
						<motion.p
							animate={{ opacity: 1, y: 0 }}
							className='text-sm text-zinc-400'
							exit={{ opacity: 0, y: -10 }}
							initial={{ opacity: 0, y: 10 }}
							key={message || error} // Change key to trigger animation
							transition={{ duration: 0.3, ease: 'easeOut' as const }}
						>
							{isError ? error : message}
						</motion.p>
					</AnimatePresence>
				</div>

				<AnimatePresence>
					{isHovered && steps && steps.length > 0 && (
						<motion.div
							key='steps-container'
							transition={{ duration: 0.3, ease: 'easeOut' as const }}
							animate={{
								opacity: 1,
								maxHeight: '400px',
								filter: 'blur(0px)',
								marginTop: 16,
							}}
							exit={{
								opacity: 0,
								maxHeight: 0,
								filter: 'blur(3px)',
								marginTop: 0,
							}}
							initial={{
								opacity: 0,
								maxHeight: 0,
								filter: 'blur(3px)',
								marginTop: 0,
							}}
						>
							{steps.map((s: ToastStep) => (
								<StepItem key={s.id} step={s} />
							))}
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{!isError && !isProcessComplete && steps?.length > 0 && (
						<motion.div
							animate={{ opacity: 1 }}
							className='flex items-center gap-1.5 text-xs text-zinc-500 mt-2'
							exit={{ opacity: 0, height: 0, overflowY: 'clip', y: -10 }}
							initial={{ opacity: 0 }}
							key='hover-hint'
						>
							<Info className='w-3 h-3' />

							<span>Hover for details</span>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<AnimatePresence>
				{isStreaming && (
					<motion.button
						animate={{ opacity: 1, scale: 1 }}
						className={cn(
							'flex-shrink-0 p-1.5 rounded-md',
							'text-zinc-400 hover:text-white hover:bg-zinc-800',
							'transition-colors duration-200',
							'focus:outline-none focus:ring-2 focus:ring-zinc-600',
							isStopping && 'opacity-50 cursor-not-allowed'
						)}
						disabled={isStopping}
						exit={{ opacity: 0, scale: 0.9 }}
						initial={{ opacity: 0, scale: 0.9 }}
						onClick={handleStop}
						transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
						type='button'
					>
						<X className='w-4 h-4' />
						<span className='sr-only'>Stop generation</span>
					</motion.button>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
