import { checkDashboardAuth } from '@/app/dashboard/auth-check';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { isPluginAdmin } from '@/lib/plugins/server/plugin-library';
import { notFound, redirect } from 'next/navigation';
import { AdminPluginsContent } from './admin-plugins-content';

/** Shiko's plugin review: submissions and reports. Only for admins (404 for everyone else). */
export default async function AdminPluginsPage() {
	const auth = await checkDashboardAuth();
	if (!auth.authorized) redirect('/auth/sign-in?redirectedFrom=/admin/plugins');
	if (!(await isPluginAdmin(createServiceRoleClient(), auth.userId)))
		notFound();

	return <AdminPluginsContent />;
}

export const dynamic = 'force-dynamic';
