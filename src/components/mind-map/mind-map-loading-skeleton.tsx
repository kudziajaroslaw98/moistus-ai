interface MindMapLoadingSkeletonProps {
	className?: string;
}

export function MindMapLoadingSkeleton({
	className,
}: MindMapLoadingSkeletonProps) {
	return (
		<div
			className={`relative h-full min-h-full w-full overflow-hidden rounded-md bg-base ${className ?? ''}`.trim()}
			data-testid='mind-map-loading-skeleton'
		>
			<div className='absolute inset-0 bg-base' />
			<div className='absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:16px_16px]' />

			<div className='absolute inset-x-0 top-0 z-10 h-12 border-b border-white/10 bg-base/80 px-4 backdrop-blur-xs md:h-14 md:px-8'>
				<div className='mx-auto flex h-full w-full items-center justify-between'>
					<div className='flex items-center gap-2 md:gap-3'>
						<div className='size-4 animate-pulse rounded-full bg-white/40' />
						<div className='h-4 w-10 animate-pulse rounded-sm bg-white/65' />
						<div className='h-3 w-1 animate-pulse rounded-sm bg-white/30' />
						<div className='h-4 w-24 animate-pulse rounded-sm bg-white/35 md:w-32' />
						<div className='ml-1 hidden size-7 animate-pulse rounded-md border border-white/10 bg-surface/80 md:block' />
					</div>

					<div className='flex items-center gap-2'>
						<div className='hidden size-7 animate-pulse rounded-md border border-white/10 bg-surface/80 md:block' />
						<div className='h-7 w-16 animate-pulse rounded-md border border-white/10 bg-surface/90 md:w-20' />
						<div className='hidden size-7 animate-pulse rounded-md border border-white/10 bg-surface/80 md:block' />
						<div className='h-8 w-20 animate-pulse rounded-full border border-white/10 bg-surface/85 md:w-24' />
					</div>
				</div>
			</div>

			<div className='pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center'>
				<div className='flex items-center gap-1 rounded-xl border border-white/10 bg-surface/95 p-1.5 shadow-2xl shadow-black/70'>
					<div className='size-7 animate-pulse rounded-md bg-primary-500/80' />
					<div className='size-7 animate-pulse rounded-md border border-white/10 bg-base/85' />
					<div className='size-7 animate-pulse rounded-md border border-white/10 bg-base/85' />
					<div className='size-7 animate-pulse rounded-md border border-white/10 bg-base/85' />
					<div className='size-7 animate-pulse rounded-md border border-white/10 bg-base/85' />
					<div className='hidden size-7 animate-pulse rounded-md border border-white/10 bg-base/85 md:block' />
					<div className='hidden size-7 animate-pulse rounded-md border border-white/10 bg-base/85 md:block' />
					<div className='size-7 animate-pulse rounded-md border border-white/10 bg-base/85' />
				</div>
			</div>
		</div>
	);
}
