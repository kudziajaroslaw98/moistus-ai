import { NextResponse } from 'next/server';
import { createClient } from '@/helpers/supabase/server';
import { checkStorageQuota } from '@/helpers/history/retention-enforcer';

export async function GET() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

		const quotaInfo = await checkStorageQuota(user.id, supabase);
		return NextResponse.json({
			...quotaInfo,
			warnings: getStorageWarnings(quotaInfo.percentage),
		});
	} catch (error) {
		console.error('Storage usage error:', error);
		return NextResponse.json({ error: 'Failed to check storage usage' }, { status: 500 });
	}
}

function getStorageWarnings(percentage: number): string[] {
	const warnings: string[] = [];
	if (percentage >= 100) {
		warnings.push('Storage quota exceeded. Oldest history will be automatically cleaned up.');
	} else if (percentage >= 90) {
		warnings.push('Storage quota is 90% full. Consider upgrading to Pro.');
	} else if (percentage >= 80) {
		warnings.push('Storage quota is 80% full.');
	}
	return warnings;
}