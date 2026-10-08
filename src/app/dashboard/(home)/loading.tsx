import { DashboardHomePageSkeleton } from './dashboard-content';

/** Home content while it loads; the shell around it stays as it is. */
export default function DashboardHomeLoading() {
	return <DashboardHomePageSkeleton />;
}
