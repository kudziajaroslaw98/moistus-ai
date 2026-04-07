import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface DashboardMapsLoadingSkeletonProps {
	viewMode: 'grid' | 'list';
	cardCount?: number;
}

function GridMapSkeleton({ index }: { index: number }) {
	return (
		<div
			data-testid='dashboard-grid-map-skeleton'
			className={cn(
				'relative h-56 sm:h-52 md:h-56 w-full rounded-lg overflow-hidden border border-zinc-800/90 bg-zinc-900/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]',
				index === 0 && 'border-zinc-700/80'
			)}
		>
			<div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(24,24,27,0.32)_0%,rgba(9,9,11,0.74)_70%,rgba(9,9,11,0.88)_100%)]' />
			<div className='absolute inset-0 bg-[radial-gradient(44%_62%_at_50%_0%,rgba(56,189,248,0.07),transparent_78%)]' />
			<div className='absolute inset-x-0 bottom-0 p-4 space-y-2'>
				<Skeleton className='h-4 w-2/3 bg-zinc-600/45' />
				<Skeleton className='h-3 w-1/2 bg-zinc-700/40' />
			</div>
		</div>
	);
}

function ListMapSkeleton() {
	return (
		<div
			className='flex items-center gap-4 rounded-lg border border-zinc-800/90 bg-zinc-900/60 p-4'
			data-testid='dashboard-list-map-skeleton'
		>
			<Skeleton className='h-10 w-10 rounded-md bg-zinc-700/45' />
			<div className='grow space-y-2'>
				<Skeleton className='h-4 w-1/3 bg-zinc-600/45' />
				<Skeleton className='h-3 w-1/5 bg-zinc-700/40' />
			</div>
			<Skeleton className='h-8 w-8 rounded-md bg-zinc-700/40' />
		</div>
	);
}

export function DashboardMapsLoadingSkeleton({
	viewMode,
	cardCount = 8,
}: DashboardMapsLoadingSkeletonProps) {
	return (
		<>
			{Array.from({ length: cardCount }).map((_, index) =>
				viewMode === 'grid' ? (
					<GridMapSkeleton index={index} key={`dashboard-grid-skeleton-${index}`} />
				) : (
					<ListMapSkeleton key={`dashboard-list-skeleton-${index}`} />
				)
			)}
		</>
	);
}

export function DashboardRouteLoadingSkeleton() {
	return (
		<div
			className='flex h-screen w-full bg-zinc-950'
			data-testid='dashboard-route-loading-skeleton'
		>
			<aside className='hidden md:flex md:w-64 md:flex-col border-r border-zinc-800 bg-zinc-950'>
				<div className='h-14 border-b border-zinc-800 px-4 flex items-center justify-between'>
					<Skeleton className='h-5 w-20 bg-zinc-700/70' />
					<Skeleton className='h-8 w-8 rounded-md bg-zinc-800/80' />
				</div>
				<div className='p-3 space-y-2'>
					<Skeleton className='h-9 w-full bg-zinc-800/75' />
					<Skeleton className='h-9 w-full bg-zinc-900/80' />
					<Skeleton className='h-9 w-full bg-zinc-900/80' />
					<Skeleton className='h-9 w-full bg-zinc-900/80' />
				</div>
			</aside>

			<main className='grow flex flex-col h-screen overflow-hidden'>
				<header className='h-14 border-b border-zinc-800 bg-zinc-900/50 px-6 flex items-center justify-between'>
					<Skeleton className='h-6 w-32 bg-zinc-700/70' />
					<div className='flex items-center gap-3'>
						<Skeleton className='h-8 w-8 rounded-full bg-zinc-800/80' />
						<Skeleton className='h-8 w-24 rounded-full bg-zinc-700/70' />
					</div>
				</header>

				<div className='flex-1 overflow-y-auto'>
					<div className='p-6 md:p-8'>
						<div className='mx-auto max-w-7xl'>
							<div className='mb-10'>
								<div className='mb-8 flex items-center justify-between'>
									<Skeleton className='h-9 w-44 bg-zinc-700/70' />
								</div>

								<div className='mb-6 hidden gap-4 lg:flex'>
									<Skeleton className='h-5 w-24 bg-zinc-800/80' />
									<Skeleton className='h-5 w-20 bg-zinc-800/80' />
									<Skeleton className='h-5 w-24 bg-zinc-800/80' />
									<Skeleton className='h-5 w-24 bg-zinc-800/80' />
								</div>

								<div className='flex flex-col gap-6 rounded-xl border border-zinc-800/50 bg-zinc-950 p-2 shadow-lg sm:flex-row sm:items-center sm:justify-between'>
									<Skeleton className='h-10 w-full max-w-md bg-zinc-800/75' />
									<div className='flex items-center gap-2'>
										<Skeleton className='h-10 w-32 bg-zinc-800/75' />
										<Skeleton className='h-10 w-36 bg-zinc-800/75' />
										<Skeleton className='h-10 w-24 bg-zinc-800/75' />
									</div>
								</div>
							</div>

							<div className='mb-4 flex h-9 items-center'>
								<Skeleton className='h-5 w-44 bg-zinc-800/80' />
							</div>

							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
								<DashboardMapsLoadingSkeleton viewMode='grid' />
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
