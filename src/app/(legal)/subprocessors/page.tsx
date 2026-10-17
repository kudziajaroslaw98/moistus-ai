import { BackToTopLink } from '@/components/legal/back-to-top-link';
import { CONTACT_EMAIL } from '@/constants/legal';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Subprocessors - Shiko',
	description:
		'The companies that process personal data for Shiko: what each does, what it receives and where.',
};

const EFFECTIVE_DATE = 'October 18, 2026';

interface Subprocessor {
	name: string;
	purpose: string;
	dataProcessed: string;
	location: string;
	privacyUrl: string;
}

const SUBPROCESSORS: Subprocessor[] = [
	{
		name: 'Supabase',
		purpose: 'Database, sign-in and real-time updates',
		dataProcessed:
			'Accounts, maps, nodes, connections, comments, change history and sessions',
		location: 'US (Ohio)',
		privacyUrl: 'https://supabase.com/privacy',
	},
	{
		name: 'Vercel',
		purpose: 'Hosting',
		dataProcessed: 'Your requests to Shiko, including your IP address',
		location: 'US (global network)',
		privacyUrl: 'https://vercel.com/legal/privacy-policy',
	},
	{
		name: 'PartyKit (Cloudflare)',
		purpose: 'Live collaboration',
		dataProcessed:
			'Live edits, cursors and presence on maps people have open, and a working copy of those maps while they are being edited',
		location: 'Global (Cloudflare network)',
		privacyUrl: 'https://partykit.io/privacy',
	},
	{
		name: 'OpenAI',
		purpose: 'AI features',
		dataProcessed:
			'Map text and structure sent with an AI action or a link summary. OpenAI keeps it up to 30 days to detect abuse and does not use it to train its models',
		location: 'US',
		privacyUrl: 'https://openai.com/policies/privacy-policy',
	},
	{
		name: 'Resend',
		purpose: 'Email delivery',
		dataProcessed: 'Email addresses and the text of emails Shiko sends',
		location: 'US',
		privacyUrl: 'https://resend.com/legal/privacy-policy',
	},
];

export default function SubprocessorsPage() {
	return (
		<article className='prose prose-invert h-auto prose-zinc max-w-none'>
			{/* Header */}
			<header className='not-prose mb-12'>
				<h1 className='text-3xl sm:text-4xl font-bold text-text-primary mb-4'>
					Subprocessors
				</h1>
				<p className='text-text-secondary'>
					Last updated: <time dateTime='2026-10-18'>{EFFECTIVE_DATE}</time>
				</p>
			</header>

			{/* Introduction */}
			<section id='introduction' className='scroll-mt-24'>
				<h2>About This List</h2>
				<p>
					Shiko uses these companies to process personal data on our behalf.
					Each is bound by a data processing agreement. The{' '}
					<Link href='/privacy'>Privacy Policy</Link> explains what we do with
					your data and why.
				</p>
			</section>

			{/* Subprocessors list */}
			<section id='subprocessors' className='scroll-mt-24'>
				<h2>Current Subprocessors</h2>

				<div role='list' className='not-prose my-6 text-sm'>
					<div
						aria-hidden='true'
						className='hidden gap-x-6 border-b border-border-subtle px-4 py-3 font-semibold text-text-primary sm:flex'
					>
						<span className='flex-[1_1_11rem]'>Provider</span>
						<span className='flex-[999_1_20rem]'>
							What it does and receives
						</span>
						<span className='flex-[1_1_9rem]'>Location</span>
					</div>
					{SUBPROCESSORS.map((sub) => (
						<div
							key={sub.name}
							role='listitem'
							className='flex flex-wrap gap-x-6 gap-y-1.5 border-b border-border-subtle/50 px-4 py-3.5'
						>
							<div className='min-w-0 flex-[1_1_11rem]'>
								<a
									href={sub.privacyUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='font-semibold text-primary-400 transition-colors duration-200 hover:text-primary-300'
								>
									{sub.name}
								</a>
								<div className='mt-0.5 text-text-tertiary'>{sub.purpose}</div>
							</div>
							<div className='flex-[999_1_20rem] text-text-secondary'>
								{sub.dataProcessed}
							</div>
							<div className='flex-[1_1_9rem] text-text-secondary'>
								{sub.location}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Not on this list */}
			<section id='not-listed' className='scroll-mt-24'>
				<h2>Not on This List</h2>
				<p>
					Some companies handle your data because you chose to deal with them,
					not because we send it to them for processing:
				</p>
				<ul>
					<li>
						<strong>Polar</strong> sells Pro subscriptions and receives your
						payment details at checkout.
					</li>
					<li>
						<strong>Google</strong> and <strong>GitHub</strong> receive your
						sign-in when you use them to sign in.
					</li>
					<li>
						<strong>Sites that plugins connect to</strong>, such as GitHub or
						Wikipedia, are contacted from the browser of the person who adds or
						refreshes that plugin&apos;s node, not by Shiko. See{' '}
						<Link href='/privacy#plugins'>Plugins in our Privacy Policy</Link>.
					</li>
				</ul>
			</section>

			{/* Updates Section */}
			<section id='updates' className='scroll-mt-24'>
				<h2>Changes</h2>
				<p>
					We update this page before a new company starts processing personal
					data for Shiko. If you object to a change, you can delete your account
					before it takes effect.
				</p>
			</section>

			{/* Contact Section */}
			<section id='contact' className='scroll-mt-24'>
				<h2>Questions</h2>
				<p>
					Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If
					your organization needs a Data Processing Agreement with Shiko, ask at
					the same address.
				</p>
			</section>

			{/* Footer navigation */}
			<div className='not-prose mt-16 pt-8 border-t border-border-subtle'>
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
					<Link
						href='/privacy'
						className='text-primary-400 hover:text-primary-300 transition-colors duration-200'
					>
						← Back to Privacy Policy
					</Link>
					<BackToTopLink />
				</div>
			</div>
		</article>
	);
}
