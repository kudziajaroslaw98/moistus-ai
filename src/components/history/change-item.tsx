'use client';

import { cn } from '@/utils/cn';
import { ChevronDown, Circle, Pencil, Plus, Trash, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { GitDiffView } from './git-diff-view';

interface PatchDetail {
	field: string;
	oldValue: string;
	newValue: string;
}

interface ChangeItemProps {
	operation: 'add' | 'remove' | 'patch';
	entityType: 'node' | 'edge';
	label: string;
	details?: string;
	patches?: PatchDetail[];
	index: number;
}

export function ChangeItem({
	operation,
	entityType,
	label,
	details,
	patches,
	index,
}: ChangeItemProps) {
	const getOperationIcon = () => {
		switch (operation) {
			case 'add':
				return <Plus className='h-3.5 w-3.5' />;
			case 'remove':
				return <Trash className='h-3.5 w-3.5' />;
			case 'patch':
				return <Pencil className='h-3.5 w-3.5' />;
		}
	};

	const getEntityIcon = () => {
		return entityType === 'node' ? (
			<Circle className='h-3.5 w-3.5' />
		) : (
			<Zap className='h-3.5 w-3.5' />
		);
	};

	const getOperationColor = () => {
		switch (operation) {
			case 'add':
				return 'text-emerald-400';
			case 'remove':
				return 'text-red-400';
			case 'patch':
				return 'text-amber-400';
		}
	};

	const getOperationBg = () => {
		switch (operation) {
			case 'add':
				return 'bg-emerald-500/10';
			case 'remove':
				return 'bg-red-500/10';
			case 'patch':
				return 'bg-amber-500/10';
		}
	};

	return (
		<motion.div
			animate={{ opacity: 1, x: 0 }}
			className='flex flex-col gap-2'
			exit={{ opacity: 0, x: -10 }}
			initial={{ opacity: 0, x: -10 }}
			transition={{
				ease: [0.215, 0.61, 0.355, 1],
				duration: 0.25,
				delay: index * 0.03,
			}}
		>
			<div className='flex items-start gap-2'>
				{/* Operation icon */}

				{/* Content */}
				<div className='flex-grow'>
					<div className='flex items-center justify-start gap-3 text-sm'>
						{/* Label */}
						<div
							className={cn(
								'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded',
								getOperationBg(),
								getOperationColor()
							)}
						>
							{getOperationIcon()}
						</div>

						<span className='text-white/87 font-medium'>{label}</span>
					</div>

					{/* Patches (for updates) */}
					<AnimatePresence>
						{patches && patches.length > 0 && (
							<motion.div
								animate={{ opacity: 1, height: 'auto' }}
								className='mt-1.5 flex flex-col gap-1 overflow-hidden'
								exit={{ opacity: 0, height: 0 }}
								initial={{ opacity: 0, height: 0 }}
								transition={{
									ease: [0.215, 0.61, 0.355, 1],
									duration: 0.3,
								}}
							>
								{patches.map((patch, i) => (
									<PatchItem key={i} patch={patch} />
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</motion.div>
	);
}

function PatchItem({ patch }: { patch: PatchDetail }) {
	// Per-field expand/collapse state
	const [isExpanded, setIsExpanded] = useState(true);

	// Check if values are null/undefined for compact rendering
	const isOldValueEmpty =
		patch.oldValue === 'null' ||
		patch.oldValue === 'undefined' ||
		patch.oldValue === '';
	const isNewValueEmpty =
		patch.newValue === 'null' ||
		patch.newValue === 'undefined' ||
		patch.newValue === '';

	// Determine if we should use git-style diff (for text fields)
	const useGitDiff =
		!isOldValueEmpty &&
		!isNewValueEmpty &&
		typeof patch.oldValue === 'string' &&
		typeof patch.newValue === 'string' &&
		!patch.oldValue.startsWith('{') && // Not JSON
		!patch.oldValue.startsWith('['); // Not array

	return (
		<div className='flex flex-col gap-1.5 rounded px-2 py-1.5 text-xs bg-[#121212] border border-white/6'>
			{/* Field name with expand toggle */}
			<button
				className='flex items-center gap-1.5 text-left w-full hover:text-white/87 transition-colors'
				onClick={(e) => {
					e.stopPropagation();
					setIsExpanded(!isExpanded);
				}}
			>
				<motion.div
					animate={{ rotate: isExpanded ? 180 : 0 }}
					transition={{
						ease: [0.215, 0.61, 0.355, 1],
						duration: 0.2,
					}}
				>
					<ChevronDown className='h-3 w-3 text-white/38 shrink-0' />
				</motion.div>

				<div className='text-white/60 font-medium'>{patch.field}</div>
			</button>

			{/* Diff content */}
			<AnimatePresence>
				{isExpanded && (
					<motion.div
						animate={{ opacity: 1, height: 'auto' }}
						className='overflow-hidden'
						exit={{ opacity: 0, height: 0 }}
						initial={{ opacity: 0, height: 0 }}
						transition={{
							ease: [0.215, 0.61, 0.355, 1],
							duration: 0.3,
						}}
					>
						{/* Compact rendering for null → value transitions */}
						{isOldValueEmpty && !isNewValueEmpty && (
							<div className='flex flex-col gap-0.5'>
								<div className='text-emerald-400 text-[10px] uppercase tracking-wide font-medium'>
									Added
								</div>

								<div className='text-white/87 font-mono break-words whitespace-pre-wrap'>
									{patch.newValue}
								</div>
							</div>
						)}

						{/* Compact rendering for value → null transitions */}
						{!isOldValueEmpty && isNewValueEmpty && (
							<div className='flex flex-col gap-0.5'>
								<div className='text-red-400 text-[10px] uppercase tracking-wide font-medium'>
									Removed
								</div>

								<div className='text-white/60 font-mono break-words whitespace-pre-wrap line-through'>
									{patch.oldValue}
								</div>
							</div>
						)}

						{/* Git-style diff for text changes */}
						{useGitDiff && (
							<GitDiffView
								newValue={patch.newValue}
								oldValue={patch.oldValue}
							/>
						)}

						{/* Traditional before/after for non-text or complex values */}
						{!isOldValueEmpty && !isNewValueEmpty && !useGitDiff && (
							<div className='flex flex-col gap-1.5'>
								{/* Old value */}
								<div className='flex flex-col gap-0.5'>
									<div className='text-white/60 font-mono break-words whitespace-pre-wrap'>
										{patch.oldValue}
									</div>
								</div>

								{/* Divider with arrow */}
								<div className='flex items-center gap-2 -my-0.5'>
									<div className='flex-1 h-px bg-white/10' />

									<ChevronDown className='h-3 w-3 text-white/38 shrink-0' />

									<div className='flex-1 h-px bg-white/10' />
								</div>

								{/* New value */}
								<div className='flex flex-col gap-0.5'>
									<div className='text-white/87 font-mono break-words whitespace-pre-wrap'>
										{patch.newValue}
									</div>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
