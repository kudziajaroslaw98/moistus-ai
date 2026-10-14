import { redirect } from 'next/navigation';

/** Plugin review moved into the dashboard shell; this keeps old bookmarks working. */
export default function LegacyAdminPluginsPage() {
	redirect('/dashboard/admin/plugins');
}
