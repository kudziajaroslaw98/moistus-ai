import {
	CatalogCardSkeleton,
	CatalogGrid,
} from '@/components/dashboard/catalog-card';

/** A tab's content while it loads; the shell, title and tabs stay as they are. */
export default function PluginsLoading() {
	return (
		<div aria-busy>
			<CatalogGrid className='mt-6' viewMode='grid'>
				<CatalogCardSkeleton count={6} viewMode='grid' />
			</CatalogGrid>
		</div>
	);
}
