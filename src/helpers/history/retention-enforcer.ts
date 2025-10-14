import { RetentionPolicy, RETENTION_POLICIES } from '@/types/history-state';

export function getRetentionPolicy(planName: string): RetentionPolicy {
	return planName === 'pro' ? RETENTION_POLICIES.pro : RETENTION_POLICIES.free;
}

export function shouldCleanupSnapshot(
	snapshotAge: number,
	isMajor: boolean,
	policy: RetentionPolicy
): boolean {
	if (isMajor) return snapshotAge > policy.maxAge * 2;
	return snapshotAge > policy.maxAge;
}

export function getCleanupPriority(
	snapshot: { created_at: string; is_major: boolean; size_bytes: number },
	policy: RetentionPolicy
): number {
	const age = Date.now() - new Date(snapshot.created_at).getTime();
	const ageRatio = age / policy.maxAge;
	let priority = ageRatio * 100;
	if (snapshot.is_major) priority *= 0.5;
	if (snapshot.size_bytes > 1024 * 1024) priority *= 1.2; // >1MB
	return priority;
}

export async function checkStorageQuota(
	userId: string,
	supabase: any
): Promise<{
	exceeded: boolean;
	usage: number;
	quota: number;
	percentage: number;
}> {
	const { data } = await supabase.rpc('get_user_history_storage', { p_user_id: userId });
	if (!data || data.length === 0) {
		return {
			exceeded: false,
			usage: 0,
			quota: RETENTION_POLICIES.free.storageQuota,
			percentage: 0,
		};
	}
	const result = data[0];
	return {
		exceeded: result.usage_percentage > 100,
		usage: result.total_size_bytes,
		quota: result.quota_bytes,
		percentage: result.usage_percentage,
	};
}