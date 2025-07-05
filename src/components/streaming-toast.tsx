// src/components/ui/streaming-toast.tsx

'use client';

import useAppStore from '@/store/mind-map-store';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

/**
 * Headless component that manages the lifecycle of a custom streaming toast.
 * It subscribes to the Zustand store and uses `sonner` to show, update, or dismiss the toast.
 */
export function StreamingToast() {
	const { streamingToast, hideStreamingToast } = useAppStore(
		useShallow((state) => ({
			streamingToast: state.streamingToast,
			hideStreamingToast: state.hideStreamingToast,
		}))
	);
	const { toastId, isOpen } = streamingToast;

	useEffect(() => {
		if (isOpen && toastId) {
			// Use toast.custom to render a React component inside the toast.
			// We give it an infinite duration because we control its dismissal manually.
			toast.custom((t) => <ToastUI {...streamingToast} />, {
				id: toastId,
				duration: Infinity,
			});
		} else if (toastId) {
			// If the toast is no longer "open" in our state, we dismiss it.
			toast.dismiss(toastId);
		}
	}, [isOpen, toastId, streamingToast]); // Re-render the toast whenever its content changes.

	// This component does not render any direct UI.
	return null;
}

/**
 * The actual UI for the toast, rendered by `sonner`.
 */
function ToastUI({ header, message, step, totalSteps, error }: any) {
	const isError = !!error;
	const isComplete = !isError && step >= totalSteps;

	return (
		<div className='w-80 p-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg flex items-start gap-4'>
			<div className='flex-shrink-0 pt-1'>
				{isError ? (
					<AlertCircle className='w-5 h-5 text-red-500' />
				) : isComplete ? (
					<CheckCircle className='w-5 h-5 text-green-500' />
				) : (
					<Loader2 className='w-5 h-5 text-blue-500 animate-spin' />
				)}
			</div>

			<div className='flex-grow overflow-hidden'>
				<p className='font-semibold text-white'>{header}</p>

				{/* This div creates a fixed-height container for the animated messages */}
				<div className='relative h-5 mt-1'>
					<AnimatePresence mode='popLayout'>
						<motion.p
							key={message || error} // Change key to trigger animation
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.3, ease: 'easeOut' }}
							className='absolute inset-0 text-sm text-zinc-400'
						>
							{isError ? error : message}
						</motion.p>
					</AnimatePresence>
				</div>

				{/* Progress Bar */}
				{!isError && (
					<div className='w-full bg-zinc-700 rounded-full h-1 mt-3'>
						<motion.div
							className={isComplete ? 'bg-green-500' : 'bg-blue-500'}
							initial={{ width: '0%' }}
							animate={{ width: `${(step / totalSteps) * 100}%` }}
							transition={{ duration: 0.5, ease: 'easeOut' }}
							style={{ height: '100%', borderRadius: '9999px' }}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
