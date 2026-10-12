import {
	CatalogCardSkeleton,
	CatalogGrid,
} from '@/components/dashboard/catalog-card';
import {
	DashboardPage,
	PageHeading,
} from '@/components/dashboard/dashboard-page';

/** Plugin review's content while the admin check runs; the shell around it stays as it is. */
export default function PluginReviewLoading() {
	return (
		<DashboardPage>
			<PageHeading
				intro='Approve new plugins and versions, and act on what people report.'
				title='Plugin review'
			/>

			<div aria-busy>
				<CatalogGrid className='mt-24' viewMode='grid'>
					<CatalogCardSkeleton count={3} viewMode='grid' />
				</CatalogGrid>
			</div>
		</DashboardPage>
	);
}
