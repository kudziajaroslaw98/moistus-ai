'use client';

import { AuthLayout } from '@/components/auth/shared';
import { SignUpWizard } from '@/components/auth/sign-up';
import { Suspense } from 'react';

export default function SignUpPage() {
	return (
		<AuthLayout>
			<Suspense fallback={null}>
				<SignUpWizard />
			</Suspense>
		</AuthLayout>
	);
}
