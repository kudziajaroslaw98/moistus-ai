import { FormConflict } from '@/store/slices/realtime-slice';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../ui/button';

interface ConflictResolutionModalProps {
	conflicts: FormConflict[];
	onResolve: (fieldName: string, resolution: 'local' | 'remote') => void;
	onClose?: () => void;
	isOpen: boolean;
}

export function ConflictResolutionModal({
	conflicts,
	onResolve,
	onClose,
	isOpen,
}: ConflictResolutionModalProps) {
	const [resolving, setResolving] = useState<string | null>(null);

	const handleResolve = async (
		fieldName: string,
		resolution: 'local' | 'remote'
	) => {
		setResolving(fieldName);
		await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay for UX
		onResolve(fieldName, resolution);
		setResolving(null);
	};

	const formatTimestamp = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} min ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
		return date.toLocaleDateString();
	};

	const formatFieldName = (fieldName: string) => {
		return fieldName
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, (str) => str.toUpperCase());
	};

	const formatValue = (value: any): string => {
		if (value === null || value === undefined) return '(empty)';
		if (Array.isArray(value)) return value.join(', ') || '(empty)';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	};

	if (!isOpen || conflicts.length === 0) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						className='bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden'
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className='p-6 border-b border-zinc-700'>
							<div className='flex items-center gap-3'>
								<div className='w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
									<AlertTriangle className='w-5 h-5 text-amber-500' />
								</div>
								<div>
									<h2 className='text-xl font-semibold text-zinc-100'>
										Resolve Conflicts
									</h2>
									<p className='text-sm text-zinc-400'>
										{conflicts.length} field
										{conflicts.length > 1 ? 's have' : ' has'} conflicting
										changes
									</p>
								</div>
							</div>
						</div>

						{/* Conflicts List */}
						<div className='overflow-y-auto max-h-[60vh]'>
							{conflicts.map((conflict, index) => (
								<div
									key={`${conflict.fieldName}-${index}`}
									className='p-6 border-b border-zinc-800 last:border-b-0'
								>
									<div className='mb-4'>
										<h3 className='text-lg font-medium text-zinc-200 mb-2'>
											{formatFieldName(conflict.fieldName)}
										</h3>
										<p className='text-sm text-zinc-400'>
											Two users edited this field at the same time. Choose which
											version to keep.
										</p>
									</div>

									<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
										{/* Local Version */}
										<div className='bg-zinc-800/50 rounded-lg p-4 border border-zinc-700'>
											<div className='flex items-center gap-2 mb-3'>
												<User className='w-4 h-4 text-blue-400' />
												<span className='text-sm font-medium text-blue-400'>
													Your Version
												</span>
												<div className='flex items-center gap-1 text-xs text-zinc-500 ml-auto'>
													<Clock className='w-3 h-3' />
													{formatTimestamp(conflict.localTimestamp)}
												</div>
											</div>
											<div className='bg-zinc-900 rounded border border-zinc-600 p-3'>
												<pre className='text-sm text-zinc-300 whitespace-pre-wrap break-words'>
													{formatValue(conflict.localValue)}
												</pre>
											</div>
										</div>

										{/* Remote Version */}
										<div className='bg-zinc-800/50 rounded-lg p-4 border border-zinc-700'>
											<div className='flex items-center gap-2 mb-3'>
												<User className='w-4 h-4 text-green-400' />
												<span className='text-sm font-medium text-green-400'>
													{conflict.remoteUser || 'Other User'}&apos;s Version
												</span>
												<div className='flex items-center gap-1 text-xs text-zinc-500 ml-auto'>
													<Clock className='w-3 h-3' />
													{formatTimestamp(conflict.remoteTimestamp)}
												</div>
											</div>
											<div className='bg-zinc-900 rounded border border-zinc-600 p-3'>
												<pre className='text-sm text-zinc-300 whitespace-pre-wrap break-words'>
													{formatValue(conflict.remoteValue)}
												</pre>
											</div>
										</div>
									</div>

									{/* Resolution Buttons */}
									<div className='flex flex-col sm:flex-row gap-3 mt-4'>
										<Button
											onClick={() => handleResolve(conflict.fieldName, 'local')}
											disabled={resolving === conflict.fieldName}
											variant='outline'
											className='flex-1 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50'
										>
											{resolving === conflict.fieldName ? (
												<div className='w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2' />
											) : null}
											Keep Your Version
										</Button>
										<Button
											onClick={() =>
												handleResolve(conflict.fieldName, 'remote')
											}
											disabled={resolving === conflict.fieldName}
											variant='outline'
											className='flex-1 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50'
										>
											{resolving === conflict.fieldName ? (
												<div className='w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-2' />
											) : null}
											Keep {conflict.remoteUser || 'Other'}&apos;s Version
										</Button>
									</div>
								</div>
							))}
						</div>

						{/* Footer */}
						<div className='p-6 border-t border-zinc-700 bg-zinc-900/50'>
							<div className='flex items-center justify-between'>
								<p className='text-sm text-zinc-400'>
									Resolve conflicts to continue collaborative editing
								</p>
								{onClose && (
									<Button onClick={onClose} variant='ghost' size='sm'>
										Close
									</Button>
								)}
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
