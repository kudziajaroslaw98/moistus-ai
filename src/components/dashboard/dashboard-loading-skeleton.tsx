import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardViewMode } from '@/types/dashboard-map';

interface DashboardMapsLoadingSkeletonProps {
	viewMode: DashboardViewMode;
	cardCount?: number;
}

function GridMapSkeleton() {
	return (
		<div
			className='overflow-hidden rounded-2xl border border-[#1d1f24] bg-[#0e0f12]'
			data-testid='dashboard-grid-map-skeleton'
		>
			<div className='h-[112px] border-b border-[#1d1f24] bg-zinc-900/60' />

			<div className='space-y-2.5 px-4 pb-4 pt-3.5'>
				<Skeleton className='h-4 w-2/3 bg-zinc-700/40' />

				<Skeleton className='h-3 w-4/5 bg-zinc-800/60' />

				<Skeleton className='mt-4 h-3 w-1/3 bg-zinc-800/60' />
			</div>
		</div>
	);
}

function ListMapSkeleton() {
	return (
		<div
			className='flex items-center gap-4 rounded-xl border border-[#1d1f24] bg-[#0e0f12] p-3 pr-4'
			data-testid='dashboard-list-map-skeleton'
		>
			<Skeleton className='h-12 w-16 shrink-0 rounded-lg bg-zinc-900/60' />

			<div className='grow space-y-2'>
				<Skeleton className='h-4 w-1/3 bg-zinc-700/40' />

				<Skeleton className='h-3 w-1/5 bg-zinc-800/60' />
			</div>
		</div>
	);
}

/** Placeholder cards while the map list loads. */
export function DashboardMapsLoadingSkeleton({
	viewMode,
	cardCount = 8,
}: DashboardMapsLoadingSkeletonProps) {
	return (
		<>
			{Array.from({ length: cardCount }).map((_, index) =>
				viewMode === 'grid' ? (
					<GridMapSkeleton key={`dashboard-grid-skeleton-${index}`} />
				) : (
					<ListMapSkeleton key={`dashboard-list-skeleton-${index}`} />
				)
			)}
		</>
	);
}

/** Home content while the page loads (inside the shell, under the top bar). */
export function DashboardHomeLoadingSkeleton() {
	return (
		<div
			className='w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-8'
			data-testid='dashboard-home-loading-skeleton'
		>
			<Skeleton className='h-8 w-40 bg-zinc-700/50' />

			<Skeleton className='mt-3 h-4 w-72 bg-zinc-800/60' />

			<Skeleton className='mt-7 h-[86px] w-full rounded-[18px] bg-zinc-900/70' />

			<div className='mt-9 h-11 border-b border-[#1d1f24]' />

			<div className='mt-6 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5'>
				<DashboardMapsLoadingSkeleton viewMode='grid' />
			</div>
		</div>
	);
}

/**
 * The whole dashboard (sidebar, top bar, Home content) while the dashboard layout
 * checks the session on entry. `sidebarCollapsed` matches the saved sidebar state so
 * the real sidebar doesn't jump in at a different width.
 */
export function DashboardRouteLoadingSkeleton({
	sidebarCollapsed = false,
}: {
	sidebarCollapsed?: boolean;
}) {
	return (
		<div
			className='fixed inset-0 flex w-full bg-zinc-950'
			data-testid='dashboard-route-loading-skeleton'
		>
			{sidebarCollapsed ? (
				<aside className='hidden w-[3.25rem] flex-col items-center gap-5 border-r border-[#16171b] bg-[#0b0b0d] px-1.5 py-4 md:flex'>
					<Skeleton className='size-8 rounded-lg bg-zinc-800/60' />

					<Skeleton className='size-10 rounded-[10px] bg-[#005bc7]/40' />

					<div className='space-y-1'>
						{Array.from({ length: 6 }).map((_, index) => (
							<Skeleton
								className='size-[38px] rounded-[9px] bg-zinc-900/80'
								key={index}
							/>
						))}
					</div>

					<Skeleton className='mt-auto size-8 rounded-full bg-zinc-900/80' />
				</aside>
			) : (
				<aside className='hidden w-64 flex-col gap-5 border-r border-[#16171b] bg-[#0b0b0d] px-3.5 py-4 md:flex'>
					<div className='flex h-8 items-center justify-between px-1'>
						<Skeleton className='h-5 w-20 bg-zinc-700/50' />

						<Skeleton className='size-8 rounded-lg bg-zinc-800/60' />
					</div>

					<Skeleton className='h-10 w-full rounded-[10px] bg-[#005bc7]/40' />

					<div className='space-y-1'>
						{/* Home, Templates, Recipes, Plugins, Teams, Archive */}
						{Array.from({ length: 6 }).map((_, index) => (
							<Skeleton
								className='h-[38px] w-full rounded-[9px] bg-zinc-900/80'
								key={index}
							/>
						))}
					</div>

					<Skeleton className='mt-auto h-[132px] w-full rounded-[14px] bg-zinc-900/80' />
				</aside>
			)}

			<main className='flex min-h-0 grow flex-col overflow-hidden'>
				<header className='flex min-h-16 items-center justify-between gap-6 border-b border-[#16171b] px-4 sm:px-8'>
					<Skeleton className='h-4 w-12 bg-zinc-800/80' />

					<Skeleton className='hidden h-10 max-w-[440px] flex-1 rounded-[10px] bg-zinc-900/80 sm:block' />

					<Skeleton className='size-10 rounded-[10px] bg-zinc-900/80' />
				</header>

				<div className='flex-1 overflow-y-auto'>
					<DashboardHomeLoadingSkeleton />
				</div>
			</main>
		</div>
	);
}
