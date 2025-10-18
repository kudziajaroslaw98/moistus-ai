'use client';

import { cn } from '@/utils/cn';
import { diffLines } from 'diff';
import { useMemo } from 'react';

interface GitDiffViewProps {
	oldValue: string;
	newValue: string;
	className?: string;
}

export function GitDiffView({
	oldValue,
	newValue,
	className,
}: GitDiffViewProps) {
	const diffResult = useMemo(() => {
		return diffLines(oldValue, newValue);
	}, [oldValue, newValue]);

	return (
		<div
			className={cn(
				'rounded overflow-hidden text-xs font-mono bg-[#121212] border border-white/6',
				className
			)}
		>
			<div className='max-h-[200px] overflow-auto p-2'>
				{diffResult.map((part, index) => {
					if (part.removed) {
						return (
							<div
								key={index}
								className='flex items-start gap-2 py-0.5 px-2 -mx-2'
								style={{
									backgroundColor: 'rgba(239, 68, 68, 0.08)',
								}}
							>
								<span className='text-red-400 font-bold flex-shrink-0 select-none'>
									-
								</span>
								<span className='text-red-300 break-all whitespace-pre-wrap flex-1'>
									{part.value}
								</span>
							</div>
						);
					}

					if (part.added) {
						return (
							<div
								key={index}
								className='flex items-start gap-2 py-0.5 px-2 -mx-2'
								style={{
									backgroundColor: 'rgba(34, 197, 94, 0.08)',
								}}
							>
								<span className='text-green-400 font-bold flex-shrink-0 select-none'>
									+
								</span>
								<span className='text-green-300 break-all whitespace-pre-wrap flex-1'>
									{part.value}
								</span>
							</div>
						);
					}

					// Unchanged content - only show if it's not just whitespace/newlines
					const trimmed = part.value.trim();
					if (!trimmed) return null;

					return (
						<div
							key={index}
							className='flex items-start gap-2 py-0.5 px-2 -mx-2 opacity-60'
						>
							<span className='text-white/38 flex-shrink-0 select-none'> </span>
							<span className='text-white/60 break-all whitespace-pre-wrap flex-1'>
								{part.value}
							</span>
						</div>
					);
				})}
			</div>

			{/* Custom scrollbar styles */}
			<style jsx>{`
				div::-webkit-scrollbar {
					width: 6px;
					height: 6px;
				}
				div::-webkit-scrollbar-track {
					background: transparent;
				}
				div::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.15);
					border-radius: 3px;
				}
				div::-webkit-scrollbar-thumb:hover {
					background: rgba(255, 255, 255, 0.25);
				}
			`}</style>
		</div>
	);
}
