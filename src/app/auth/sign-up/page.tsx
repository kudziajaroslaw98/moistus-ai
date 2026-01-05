'use client';

import { AuthLayout } from '@/components/auth/shared';
import { SignUpWizard } from '@/components/auth/sign-up';

export default function SignUpPage() {
	return (
		<AuthLayout>
			<SignUpWizard />
		</AuthLayout>
	);
}
