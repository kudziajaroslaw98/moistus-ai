import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LegalConsentNoteProps {
	/**
	 * `create` where the button creates an account. `continue` where the same
	 * screen can also create one (Google/GitHub sign-in makes an account for a
	 * new person).
	 */
	action?: 'create' | 'continue';
	className?: string;
}

const linkClass =
	'text-text-secondary underline underline-offset-2 transition-colors duration-200 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm';

/**
 * Tells people, where they create an account, that the Terms apply and where
 * the Privacy Policy is. Only the Terms are "agreed to": a privacy notice is
 * information we owe people, not something they accept. Links open in a new tab
 * so a half-filled form isn't lost.
 */
export function LegalConsentNote({
	action = 'create',
	className,
}: LegalConsentNoteProps) {
	const lead = action === 'create' ? 'By creating an account' : 'By continuing';

	return (
		<p className={cn('text-center text-xs text-text-tertiary', className)}>
			<span>{lead}, you agree to the </span>

			<Link
				className={linkClass}
				href='/terms'
				rel='noopener noreferrer'
				target='_blank'
			>
				Terms of Service
			</Link>

			<span>. Our </span>

			<Link
				className={linkClass}
				href='/privacy'
				rel='noopener noreferrer'
				target='_blank'
			>
				Privacy Policy
			</Link>

			<span> explains how we use your data.</span>
		</p>
	);
}
