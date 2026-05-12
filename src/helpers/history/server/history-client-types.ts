import type {
	createClient,
	createServiceRoleClient,
} from '@/helpers/supabase/server';

export type HistoryServerClient = Awaited<ReturnType<typeof createClient>>;
export type HistoryAdminClient = ReturnType<typeof createServiceRoleClient>;
