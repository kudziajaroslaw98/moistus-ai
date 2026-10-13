import { isUserAdmin } from '@/helpers/auth/is-admin';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { checkDashboardAuth } from '../auth-check';
import { TemplatesContent } from './templates-content';

/**
 * Template gallery. Auth, plan and the shell live in the dashboard layout, which
 * redirects signed-out visitors; this page only resolves whether to show admin controls.
 */
export default async function TemplatesPage() {
	const auth = await checkDashboardAuth();
	const isAdmin =
		auth.authorized &&
		(await isUserAdmin(createServiceRoleClient(), auth.userId));

	return <TemplatesContent isAdmin={isAdmin} />;
}
