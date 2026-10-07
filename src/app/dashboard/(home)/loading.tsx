import { DashboardHomeLoadingSkeleton } from '@/components/dashboard/dashboard-loading-skeleton';

/** Home content while it loads; the shell around it stays as it is. */
export default function DashboardHomeLoading() {
	return <DashboardHomeLoadingSkeleton />;
}
