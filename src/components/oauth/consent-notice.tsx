import { AuthCard } from '@/components/auth/shared/auth-card';
import { Clock, UserRound } from 'lucide-react';
import Link from 'next/link';

interface ConsentNoticeProps {
	kind: 'guest' | 'expired';
}

const COPY = {
	guest: {
		Icon: UserRound,
		title: "Guests can't connect AI apps",
		body: 'You joined as a guest. Create a free account (it keeps your maps), then connect again from your AI app.',
		action: { href: '/auth/sign-up', label: 'Create account' },
	},
	expired: {
		Icon: Clock,
		title: 'This connection request expired',
		body: 'Go back to your AI app and start connecting again. In Claude Code, run /mcp and choose Authenticate.',
		action: { href: '/dashboard?settings=connections', label: 'Open Settings › Connections' },
	},
} as const;

/** Consent page states that need no decision: guest accounts and dead requests. */
export function ConsentNotice({ kind }: ConsentNoticeProps) {
	const { Icon, title, body, action } = COPY[kind];

	return (
		<AuthCard className='flex flex-col items-center p-6 text-center sm:p-8'>
			<span
				aria-hidden
				className='flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary'
			>
				<Icon className='h-6 w-6' />
			</span>

			<h1 className='mt-5 text-2xl font-semibold text-text-primary'>{title}</h1>

			<p className='mt-2.5 text-sm text-text-secondary'>{body}</p>

			<Link
				className='mt-6 inline-flex h-10 items-center rounded border border-border-default px-4 text-sm text-white/87 transition-colors duration-200 ease hover:bg-white/5 hover:text-white'
				href={action.href}
			>
				{action.label}
			</Link>
		</AuthCard>
	);
}
