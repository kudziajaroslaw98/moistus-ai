import { BackToTopLink } from '@/components/legal/back-to-top-link';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Subprocessors - Shiko',
	description:
		'List of third-party service providers that process data on behalf of Shiko.',
};

const EFFECTIVE_DATE = 'January 24, 2026';
const CONTACT_EMAIL = 'support@shiko.app';

interface Subprocessor {
	name: string;
	purpose: string;
	dataProcessed: string;
	location: string;
	privacyUrl: string;
	dpaStatus: string;
}

const SUBPROCESSORS: Subprocessor[] = [
	{
		name: 'Supabase',
		purpose: 'Database, Authentication, Real-time collaboration',
		dataProcessed:
			'User accounts, mind maps, nodes, edges, comments, sessions',
		location: 'EU (Frankfurt)',
		privacyUrl: 'https://supabase.com/privacy',
		dpaStatus: 'GDPR DPA included',
	},
	{
		name: 'Polar.sh',
		purpose: 'Payment processing, Subscription management',
		dataProcessed: 'Email, name, billing information, payment history',
		location: 'US',
		privacyUrl: 'https://polar.sh/legal/privacy',
		dpaStatus: 'GDPR compliant',
	},
	{
		name: 'OpenAI',
		purpose: 'AI-powered features (suggestions, Q&A, content generation)',
		dataProcessed: 'Node content sent for AI processing (not stored by OpenAI)',
		location: 'US',
		privacyUrl: 'https://openai.com/policies/privacy-policy',
		dpaStatus: 'DPA available',
	},
	{
		name: 'Vercel',
		purpose: 'Application hosting, Edge functions, CDN',
		dataProcessed: 'Application code, request logs, IP addresses',
		location: 'US (Global CDN)',
		privacyUrl: 'https://vercel.com/legal/privacy-policy',
		dpaStatus: 'GDPR DPA included',
	},
	{
		name: 'Resend',
		purpose: 'Transactional email delivery',
		dataProcessed: 'Email addresses, email content for delivery',
		location: 'US',
		privacyUrl: 'https://resend.com/legal/privacy-policy',
		dpaStatus: 'GDPR compliant',
	},
	{
		name: 'Google OAuth',
		purpose: 'Social login authentication',
		dataProcessed: 'Authentication tokens, email, name, profile picture',
		location: 'US',
		privacyUrl: 'https://policies.google.com/privacy',
		dpaStatus: 'SCCs available',
	},
	{
		name: 'GitHub OAuth',
		purpose: 'Social login authentication',
		dataProcessed: 'Authentication tokens, email, username, profile picture',
		location: 'US',
		privacyUrl: 'https://docs.github.com/en/site-policy/privacy-policies',
		dpaStatus: 'SCCs available',
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
					Last updated: <time dateTime='2026-01-24'>{EFFECTIVE_DATE}</time>
				</p>
			</header>

			{/* Introduction */}
			<section id='introduction' className='scroll-mt-24'>
				<h2>About This List</h2>
				<p>
					Shiko uses third-party service providers (&quot;subprocessors&quot;)
					to help deliver our service. Under GDPR Article 28, we are required to
					disclose these subprocessors and ensure they meet our data protection
					standards.
				</p>
				<p>
					All subprocessors listed below have been vetted for security and
					privacy practices. Where applicable, we have Data Processing
					Agreements (DPAs) or Standard Contractual Clauses (SCCs) in place to
					protect your data.
				</p>
			</section>

			{/* Subprocessors Table */}
			<section id='subprocessors' className='scroll-mt-24'>
				<h2>Current Subprocessors</h2>

				<div className='not-prose overflow-x-auto my-6'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='border-b border-border-subtle'>
								<th className='text-left py-3 px-4 text-text-primary font-semibold'>
									Provider
								</th>
								<th className='text-left py-3 px-4 text-text-primary font-semibold'>
									Purpose
								</th>
								<th className='text-left py-3 px-4 text-text-primary font-semibold'>
									Location
								</th>
								<th className='text-left py-3 px-4 text-text-primary font-semibold'>
									DPA Status
								</th>
							</tr>
						</thead>
						<tbody className='text-text-secondary'>
							{SUBPROCESSORS.map((sub, index) => (
								<tr
									key={sub.name}
									className={
										index < SUBPROCESSORS.length - 1
											? 'border-b border-border-subtle/50'
											: ''
									}
								>
									<td className='py-3 px-4'>
										<a
											href={sub.privacyUrl}
											target='_blank'
											rel='noopener noreferrer'
											className='text-primary-400 hover:text-primary-300 transition-colors duration-200'
										>
											{sub.name}
										</a>
									</td>
									<td className='py-3 px-4'>{sub.purpose}</td>
									<td className='py-3 px-4'>{sub.location}</td>
									<td className='py-3 px-4'>{sub.dpaStatus}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* Detailed Information */}
			<section id='details' className='scroll-mt-24'>
				<h2>Data Processing Details</h2>

				{SUBPROCESSORS.map((sub) => (
					<div
						key={sub.name}
						className='not-prose mb-6 p-4 bg-elevated/30 rounded-lg border border-border-subtle'
					>
						<h3 className='text-lg font-semibold text-text-primary mb-2'>
							{sub.name}
						</h3>
						<dl className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm'>
							<div>
								<dt className='text-text-tertiary'>Purpose</dt>
								<dd className='text-text-secondary'>{sub.purpose}</dd>
							</div>
							<div>
								<dt className='text-text-tertiary'>Location</dt>
								<dd className='text-text-secondary'>{sub.location}</dd>
							</div>
							<div className='sm:col-span-2'>
								<dt className='text-text-tertiary'>Data Processed</dt>
								<dd className='text-text-secondary'>{sub.dataProcessed}</dd>
							</div>
							<div>
								<dt className='text-text-tertiary'>Privacy Policy</dt>
								<dd>
									<a
										href={sub.privacyUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='text-primary-400 hover:text-primary-300 transition-colors duration-200'
									>
										View →
									</a>
								</dd>
							</div>
							<div>
								<dt className='text-text-tertiary'>DPA Status</dt>
								<dd className='text-text-secondary'>{sub.dpaStatus}</dd>
							</div>
						</dl>
					</div>
				))}
			</section>

			{/* Updates Section */}
			<section id='updates' className='scroll-mt-24'>
				<h2>Changes to Subprocessors</h2>
				<p>
					We may update our list of subprocessors from time to time. When we add
					a new subprocessor that processes personal data, we will:
				</p>
				<ul>
					<li>Update this page with the new subprocessor details</li>
					<li>
						Notify users by email at least 14 days before the change takes
						effect (for material changes)
					</li>
					<li>Ensure appropriate data protection agreements are in place</li>
				</ul>
				<p>
					If you object to a new subprocessor, you may terminate your account
					before the change takes effect by contacting us.
				</p>
			</section>

			{/* Contact Section */}
			<section id='contact' className='scroll-mt-24'>
				<h2>Questions</h2>
				<p>
					If you have questions about our subprocessors or data processing
					practices, please contact us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
				<p>
					For business customers requiring a Data Processing Agreement (DPA),
					please contact us at the same email address.
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
