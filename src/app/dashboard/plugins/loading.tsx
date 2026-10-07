import { Skeleton } from '@/components/ui/skeleton';

/** A tab's content while it loads; the shell, title and tabs stay as they are. */
export default function PluginsLoading() {
	return (
		<div aria-busy className='mt-6 flex flex-col gap-3'>
			<Skeleton className='h-5 w-3/4' />

			{Array.from({ length: 3 }).map((_, index) => (
				<Skeleton className='h-28 w-full rounded-xl' key={index} />
			))}
		</div>
	);
}
