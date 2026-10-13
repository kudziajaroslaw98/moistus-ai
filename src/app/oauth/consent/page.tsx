import { AuthLayout } from '@/components/auth/shared/auth-layout';
import { ConsentCard } from '@/components/oauth/consent-card';
import { ConsentNotice } from '@/components/oauth/consent-notice';
import { resolveDisplayName } from '@/helpers/identity/resolve-user-identity';
import { createClient } from '@/helpers/supabase/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'Connect an AI app · Shiko',
	robots: { index: false, follow: false },
};

interface ConsentPageProps {
	searchParams: Promise<{ authorization_id?: string | string[] }>;
}

const SIGN_IN_MESSAGE =
	"Sign in to connect your AI app to Shiko. You'll come straight back here to approve it.";

/** Where approval sends the browser; custom app schemes (cursor://…) have no origin. */
function hostOf(uri: string): string {
	try {
		const { origin } = new URL(uri);
		return origin !== 'null' ? origin : uri;
	} catch {
		return uri;
	}
}

/**
 * Supabase Auth sends AI apps here (authorization_url_path) to ask the
 * signed-in user whether the app may use Shiko as them.
 */
export default async function OAuthConsentPage({ searchParams }: ConsentPageProps) {
	const raw = (await searchParams).authorization_id;
	const authorizationId = typeof raw === 'string' && raw.trim() ? raw.trim() : null;

	if (!authorizationId) {
		return (
			<AuthLayout>
				<ConsentNotice kind='expired' />
			</AuthLayout>
		);
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		const here = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
		redirect(
			`/auth/sign-in?redirectedFrom=${encodeURIComponent(here)}&message=${encodeURIComponent(SIGN_IN_MESSAGE)}`
		);
	}

	if (user.is_anonymous) {
		return (
			<AuthLayout>
				<ConsentNotice kind='guest' />
			</AuthLayout>
		);
	}

	const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
	if (error || !data) {
		return (
			<AuthLayout>
				<ConsentNotice kind='expired' />
			</AuthLayout>
		);
	}

	// Already approved earlier for the same scopes: go straight back to the app.
	if (!('authorization_id' in data)) redirect(data.redirect_url);

	const { data: profile } = await supabase
		.from('user_profiles')
		.select('display_name, full_name')
		.eq('user_id', user.id)
		.maybeSingle<{ display_name: string | null; full_name: string | null }>();

	return (
		<AuthLayout>
			<ConsentCard
				authorizationId={data.authorization_id}
				clientName={data.client.name?.trim() || 'An AI app'}
				redirectHost={hostOf(data.redirect_uri)}
				userName={resolveDisplayName({
					displayName: profile?.display_name,
					fullName: profile?.full_name,
					email: user.email,
					userId: user.id,
				})}
			/>
		</AuthLayout>
	);
}
