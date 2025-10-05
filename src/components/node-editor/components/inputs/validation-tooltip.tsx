'use client';

import React, { useRef } from 'react';
import { cn } from '@/utils/cn';
import { type ValidationError } from '../../core/validators/validation-types';

interface ValidationTooltipProps {
	children: React.ReactNode;
	errors: ValidationError[];
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onQuickFix?: (startIndex: number, endIndex: number, replacement: string) => void;
}

export const ValidationTooltip: React.FC<ValidationTooltipProps> = ({
	children,
	errors,
	isOpen,
	onOpenChange,
	onQuickFix,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);

	try {
		if (!errors || errors.length === 0) {
			return <>{children}</>;
		}

		const hasErrors = errors.some(error => error.type === 'error');
		const hasWarnings = errors.some(error => error.type === 'warning');

	return (
		<>
			<div
				ref={containerRef}
				className={cn(
					'validation-trigger relative',
					hasErrors && 'has-errors',
					hasWarnings && 'has-warnings'
				)}
				style={{
					// Ensure stable layout regardless of tooltip state
					isolation: 'isolate',
				}}
			>
				{children}
				
				{/* Enhanced tooltip with animations and quick fixes */}
				<div
					className="absolute top-full left-0 right-0 z-[40]"
					style={{
						// Always present in DOM but conditionally visible to prevent re-mounting
						position: 'absolute',
						pointerEvents: isOpen ? 'auto' : 'none',
						opacity: isOpen ? 1 : 0,
						transform: isOpen ? 'translateY(0px) scale(1)' : 'translateY(-4px) scale(0.95)',
						transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
						visibility: isOpen ? 'visible' : 'hidden',
						// Prevent layout interference
						willChange: 'opacity, transform',
						// Position closer to input
						marginTop: '4px',
					}}
				>
					<div className={cn(
						'px-4 py-3 rounded-lg shadow-xl border text-sm max-w-full relative backdrop-blur-sm',
						hasErrors 
							? 'bg-red-950/95 border-red-500/50 text-red-100'
							: 'bg-yellow-950/95 border-yellow-500/50 text-yellow-100'
					)}>
						{/* Enhanced pointer arrow */}
						<div className={cn(
							'absolute -top-2 left-4 w-4 h-4 rotate-45 border-l border-t',
							hasErrors 
								? 'bg-red-950/95 border-red-500/50'
								: 'bg-yellow-950/95 border-yellow-500/50'
						)} />

						<div className={cn(
							'absolute -top-1 left-4 w-4 h-4 rotate-45',
							hasErrors 
								? 'bg-red-950/95'
								: 'bg-yellow-950/95'
						)} />
						
						{/* Dismiss button */}
						<button
							onClick={() => onOpenChange(false)}
							className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
							aria-label="Dismiss errors"
							style={{ pointerEvents: 'auto' }}
						>
							<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						
						<div className="space-y-3 pr-8">
							{errors.slice(0, 3).map((error, index) => (
								<div key={index} className="flex flex-col gap-2">
									<div className="flex items-start gap-2">
										{/* Enhanced error icons with better contrast */}
										<div className="flex-shrink-0 mt-0.5">
											{error.type === 'error' ? (
												<span className="text-red-400 text-base">🚫</span>
											) : error.type === 'warning' ? (
												<span className="text-yellow-400 text-base">⚠️</span>
											) : (
												<span className="text-blue-400 text-base">💡</span>
											)}
										</div>

										<div className="flex-1 min-w-0">
											<p className="font-medium leading-tight">{error.message}</p>

											{error.contextualHint && (
												<p className="text-xs opacity-75 mt-1 leading-tight">
													{error.contextualHint}
												</p>
											)}

											{error.suggestion && !error.quickFixes && (
												<p className="text-xs opacity-80 mt-1 leading-tight">
													Try: <code className="px-1.5 py-0.5 rounded bg-black/30 text-xs font-mono">{error.suggestion}</code>
												</p>
											)}
										</div>
									</div>
									
									{/* Quick Fix Buttons */}
									{error.quickFixes && error.quickFixes.length > 0 && onQuickFix && (
										<div className="flex flex-wrap gap-2 ml-6">
											{error.quickFixes.map((fix: any, fixIndex: number) => (
												<button
													key={fixIndex}
													onClick={() => {
														onQuickFix(error.startIndex || 0, error.endIndex || 0, fix.replacement);
														onOpenChange(false);
													}}
													className={cn(
														'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border',
														'hover:scale-105 hover:shadow-md active:scale-95',
														hasErrors
															? 'bg-red-600/80 hover:bg-red-600/90 border-red-500/50 text-red-100'
															: 'bg-yellow-600/80 hover:bg-yellow-600/90 border-yellow-500/50 text-yellow-100'
													)}
													title={fix.description}
												>
													{fix.label}
												</button>
											))}
										</div>
									)}
								</div>
							))}
							
							{errors.length > 3 && (
								<div className="flex items-center gap-2 pl-6 pt-2 border-t border-white/10">
									<span className="text-xs opacity-75">
										+{errors.length - 3} more {errors.length > 4 ? 'issues' : 'issue'}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
	} catch (error) {
		console.error('ValidationTooltip render error:', error);
		return <>{children}</>;
	}
};