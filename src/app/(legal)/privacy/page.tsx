import { BackToTopLink } from '@/components/legal/back-to-top-link';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Privacy Policy - Shiko',
	description:
		'Learn how Shiko collects, uses, and protects your personal information. GDPR and CCPA compliant.',
};

const EFFECTIVE_DATE = 'January 23, 2026';
const CONTACT_EMAIL = 'support@shiko.app';

export default function PrivacyPolicyPage() {
	return (
		<article className='prose prose-invert h-auto prose-zinc max-w-none'>
			{/* Header */}
			<header className='not-prose mb-12'>
				<h1 className='text-3xl sm:text-4xl font-bold text-text-primary mb-4'>
					Privacy Policy
				</h1>
				<p className='text-text-secondary'>
					Last updated: <time dateTime='2026-01-23'>{EFFECTIVE_DATE}</time>
				</p>
			</header>

			{/* Table of Contents */}
			<nav className='not-prose mb-12 p-6 bg-elevated/50 rounded-lg border border-border-subtle'>
				<h2 className='text-sm font-semibold text-text-primary uppercase tracking-wider mb-4'>
					Contents
				</h2>
				<ol className='space-y-2 text-sm'>
					{[
						'Introduction',
						'Information We Collect',
						'How We Use Your Information',
						'Legal Basis for Processing',
						'Information Sharing',
						'Data Retention',
						'Your Rights',
						'International Data Transfers',
						'Security',
						"Children's Privacy",
						'Changes to This Policy',
						'Contact Us',
					].map((title, index) => (
						<li key={title}>
							<a
								href={`#section-${index + 1}`}
								className='text-text-secondary hover:text-primary-400 transition-colors duration-200'
							>
								{index + 1}. {title}
							</a>
						</li>
					))}
				</ol>
			</nav>

			{/* Section 1: Introduction */}
			<section id='section-1' className='scroll-mt-24'>
				<h2>1. Introduction</h2>
				<p>
					Shiko (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
					committed to protecting your privacy. This Privacy Policy explains how
					we collect, use, disclose, and safeguard your information when you use
					our AI-powered mind mapping platform.
				</p>
				<p>
					We are based in Poland and operate under the European Union&apos;s
					General Data Protection Regulation (GDPR). We also comply with the
					California Consumer Privacy Act (CCPA) for our users in California.
				</p>
				<p>
					By using Shiko, you agree to the collection and use of information in
					accordance with this policy. If you do not agree with our policies and
					practices, please do not use our service.
				</p>
			</section>

			{/* Section 2: Information We Collect */}
			<section id='section-2' className='scroll-mt-24'>
				<h2>2. Information We Collect</h2>

				<h3>2.1 Account Information</h3>
				<p>When you create an account, we collect:</p>
				<ul>
					<li>
						<strong>Email address</strong> — Required for account identification
						and communication
					</li>
					<li>
						<strong>Password</strong> — Stored in encrypted (hashed) form; we
						never have access to your plain-text password
					</li>
					<li>
						<strong>Display name</strong> — Optional name shown to collaborators
					</li>
					<li>
						<strong>Profile information</strong> — Optional bio and preferences
						you choose to provide
					</li>
				</ul>

				<h3>2.2 OAuth Information</h3>
				<p>If you sign in using Google or GitHub, we receive:</p>
				<ul>
					<li>Your email address</li>
					<li>Your name (as provided by the OAuth provider)</li>
					<li>Your profile picture URL</li>
				</ul>
				<p>
					We do not receive or store your OAuth provider passwords.
					Authentication is handled securely by the respective providers.
				</p>

				<h3>2.3 Content You Create</h3>
				<p>We store the content you create within Shiko:</p>
				<ul>
					<li>
						<strong>Mind maps</strong> — Including titles, descriptions, and
						organizational structure
					</li>
					<li>
						<strong>Nodes</strong> — All node types (text, tasks, code, images,
						questions, etc.) and their content
					</li>
					<li>
						<strong>Connections</strong> — Relationships between nodes
					</li>
					<li>
						<strong>Comments</strong> — Discussion threads and messages on
						shared maps
					</li>
				</ul>

				<h3>2.4 Usage Data</h3>
				<p>
					We automatically collect certain information about how you use our
					service:
				</p>
				<ul>
					<li>
						<strong>AI feature usage</strong> — We track how many AI suggestions
						you use for billing purposes
					</li>
					<li>
						<strong>Subscription status</strong> — Your plan type and billing
						period
					</li>
				</ul>

				<h3>2.5 Technical Data</h3>
				<p>For security and service operation, we may collect:</p>
				<ul>
					<li>Browser type and version</li>
					<li>IP address (for rate limiting and abuse prevention)</li>
					<li>Device information</li>
				</ul>

				<h3>2.6 Information We Do NOT Collect</h3>
				<p>We want to be clear about what we don&apos;t collect:</p>
				<ul>
					<li>
						Payment card details (handled entirely by our payment processor,
						Polar)
					</li>
					<li>Phone numbers or physical addresses</li>
					<li>Location or GPS data</li>
					<li>Device fingerprints for tracking</li>
					<li>
						We do not use analytics services like Google Analytics, Mixpanel, or
						similar tracking tools
					</li>
				</ul>
			</section>

			{/* Section 3: How We Use Your Information */}
			<section id='section-3' className='scroll-mt-24'>
				<h2>3. How We Use Your Information</h2>
				<p>We use the information we collect to:</p>
				<ul>
					<li>
						<strong>Provide our service</strong> — Store and sync your mind maps
						across devices, enable real-time collaboration
					</li>
					<li>
						<strong>Process AI features</strong> — Send relevant content to our
						AI provider (OpenAI) to generate suggestions and answers
					</li>
					<li>
						<strong>Process payments</strong> — Manage subscriptions through our
						payment processor
					</li>
					<li>
						<strong>Communicate with you</strong> — Send service-related emails
						(account verification, password resets, billing notifications)
					</li>
					<li>
						<strong>Improve our service</strong> — Understand how features are
						used to make improvements
					</li>
					<li>
						<strong>Ensure security</strong> — Detect and prevent fraud, abuse,
						and security threats
					</li>
					<li>
						<strong>Comply with legal obligations</strong> — Respond to legal
						requests and enforce our terms
					</li>
				</ul>
			</section>

			{/* Section 4: Legal Basis for Processing */}
			<section id='section-4' className='scroll-mt-24'>
				<h2>4. Legal Basis for Processing (GDPR)</h2>
				<p>
					Under the GDPR, we process your personal data based on the following
					legal grounds:
				</p>

				<h3>4.1 Contract Performance</h3>
				<p>
					Processing necessary to provide you with our service, including
					account management, content storage, and collaboration features.
				</p>

				<h3>4.2 Legitimate Interests</h3>
				<p>
					Processing necessary for our legitimate interests, including service
					security, fraud prevention, and service improvements, where these
					interests are not overridden by your rights.
				</p>

				<h3>4.3 Consent</h3>
				<p>
					For optional features or communications, we rely on your consent,
					which you can withdraw at any time.
				</p>

				<h3>4.4 Legal Obligation</h3>
				<p>
					Processing necessary to comply with legal requirements, such as tax
					and accounting laws.
				</p>
			</section>

			{/* Section 5: Information Sharing */}
			<section id='section-5' className='scroll-mt-24'>
				<h2>5. Information Sharing</h2>
				<p>
					<strong>We do not sell your personal data.</strong> We share
					information only in the following circumstances:
				</p>

				<h3>5.1 Service Providers (Subprocessors)</h3>
				<p>We use trusted third-party services to operate Shiko:</p>

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
									Data Shared
								</th>
							</tr>
						</thead>
						<tbody className='text-text-secondary'>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Supabase</td>
								<td className='py-3 px-4'>
									Database, Authentication, Real-time sync
								</td>
								<td className='py-3 px-4'>EU</td>
								<td className='py-3 px-4'>All user data and content</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Polar.sh</td>
								<td className='py-3 px-4'>Payment processing</td>
								<td className='py-3 px-4'>US</td>
								<td className='py-3 px-4'>Email, name, billing information</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>OpenAI</td>
								<td className='py-3 px-4'>AI features</td>
								<td className='py-3 px-4'>US</td>
								<td className='py-3 px-4'>Node content for AI processing</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Vercel</td>
								<td className='py-3 px-4'>Hosting</td>
								<td className='py-3 px-4'>US (Global CDN)</td>
								<td className='py-3 px-4'>Application code only</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Google OAuth</td>
								<td className='py-3 px-4'>Social login</td>
								<td className='py-3 px-4'>US</td>
								<td className='py-3 px-4'>Authentication tokens</td>
							</tr>
							<tr>
								<td className='py-3 px-4'>GitHub OAuth</td>
								<td className='py-3 px-4'>Social login</td>
								<td className='py-3 px-4'>US</td>
								<td className='py-3 px-4'>Authentication tokens</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3>5.2 Collaborators</h3>
				<p>
					When you share a mind map, collaborators can see your display name,
					avatar, and real-time activity (cursor position, selected nodes). Your
					email is not shared with collaborators unless you explicitly include
					it in your profile.
				</p>

				<h3>5.3 Legal Requirements</h3>
				<p>
					We may disclose your information if required by law, court order, or
					government request.
				</p>

				<h3>5.4 Business Transfers</h3>
				<p>
					If Shiko is involved in a merger, acquisition, or sale of assets, your
					information may be transferred as part of that transaction. We will
					notify you of any such change.
				</p>
			</section>

			{/* Section 6: Data Retention */}
			<section id='section-6' className='scroll-mt-24'>
				<h2>6. Data Retention</h2>
				<p>We retain your information as follows:</p>
				<ul>
					<li>
						<strong>Active accounts</strong> — Your data is retained for as long
						as your account is active
					</li>
					<li>
						<strong>Deleted accounts</strong> — When you delete your account, we
						will delete your personal data within 30 days, except where we are
						required to retain it for legal purposes
					</li>
					<li>
						<strong>AI chat history</strong> — Chat conversations with AI are
						ephemeral and are not stored on our servers after your session ends
					</li>
					<li>
						<strong>Backups</strong> — Backups may retain deleted data for up to
						90 days for disaster recovery purposes
					</li>
				</ul>
			</section>

			{/* Section 7: Your Rights */}
			<section id='section-7' className='scroll-mt-24'>
				<h2>7. Your Rights</h2>
				<p>
					Under GDPR and CCPA, you have the following rights regarding your
					personal data:
				</p>

				<h3>7.1 Right to Access</h3>
				<p>
					You can request a copy of the personal data we hold about you. We
					provide data export functionality in your account settings.
				</p>

				<h3>7.2 Right to Rectification</h3>
				<p>
					You can update or correct your personal information at any time
					through your account settings.
				</p>

				<h3>7.3 Right to Erasure (&quot;Right to be Forgotten&quot;)</h3>
				<p>
					You can request deletion of your account and associated data. This can
					be done through your account settings or by contacting us.
				</p>

				<h3>7.4 Right to Data Portability</h3>
				<p>
					You can export your mind maps and data in standard formats (JSON) for
					use with other services.
				</p>

				<h3>7.5 Right to Withdraw Consent</h3>
				<p>
					Where we rely on consent, you can withdraw it at any time. This will
					not affect the lawfulness of processing before withdrawal.
				</p>

				<h3>7.6 Right to Lodge a Complaint</h3>
				<p>
					You have the right to lodge a complaint with a supervisory authority.
					In Poland, this is the President of the Personal Data Protection
					Office (UODO).
				</p>

				<h3>7.7 California Residents (CCPA)</h3>
				<p>California residents have additional rights:</p>
				<ul>
					<li>
						Right to know what personal information is collected and how it is
						used
					</li>
					<li>Right to delete personal information</li>
					<li>
						Right to opt-out of the sale of personal information (note: we do
						not sell your data)
					</li>
					<li>
						Right to non-discrimination for exercising your privacy rights
					</li>
				</ul>

				<p>
					To exercise any of these rights, please contact us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will
					respond within 30 days (or 45 days for CCPA requests).
				</p>
			</section>

			{/* Section 8: International Data Transfers */}
			<section id='section-8' className='scroll-mt-24'>
				<h2>8. International Data Transfers</h2>
				<p>
					Some of our service providers are located in the United States. When
					we transfer your data outside the European Economic Area (EEA), we
					ensure appropriate safeguards are in place:
				</p>
				<ul>
					<li>
						<strong>Standard Contractual Clauses (SCCs)</strong> — Our
						agreements with US-based providers include EU-approved contractual
						safeguards
					</li>
					<li>
						<strong>Adequacy decisions</strong> — Where applicable, we rely on
						EU adequacy decisions
					</li>
				</ul>
				<p>
					You can request a copy of the safeguards we use by contacting us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
			</section>

			{/* Section 9: Security */}
			<section id='section-9' className='scroll-mt-24'>
				<h2>9. Security</h2>
				<p>
					We implement appropriate technical and organizational measures to
					protect your data:
				</p>
				<ul>
					<li>
						<strong>Encryption in transit</strong> — All data is transmitted
						over HTTPS/TLS
					</li>
					<li>
						<strong>Password hashing</strong> — Passwords are hashed using
						industry-standard algorithms (bcrypt)
					</li>
					<li>
						<strong>Row-level security</strong> — Database access is controlled
						at the row level to ensure you can only access your own data
					</li>
					<li>
						<strong>Access controls</strong> — We limit employee access to
						personal data on a need-to-know basis
					</li>
					<li>
						<strong>Regular updates</strong> — We keep our systems and
						dependencies updated to address security vulnerabilities
					</li>
				</ul>
				<p>
					While we strive to protect your data, no method of transmission or
					storage is 100% secure. If you discover a security vulnerability,
					please report it to{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
			</section>

			{/* Section 10: Children's Privacy */}
			<section id='section-10' className='scroll-mt-24'>
				<h2>10. Children&apos;s Privacy</h2>
				<p>
					Shiko is not intended for children under 16 years of age (or 13 in
					jurisdictions where the GDPR does not apply). We do not knowingly
					collect personal information from children.
				</p>
				<p>
					If you are a parent or guardian and believe your child has provided us
					with personal information, please contact us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will take
					steps to delete such information.
				</p>
			</section>

			{/* Section 11: Changes to This Policy */}
			<section id='section-11' className='scroll-mt-24'>
				<h2>11. Changes to This Policy</h2>
				<p>
					We may update this Privacy Policy from time to time. When we make
					material changes, we will:
				</p>
				<ul>
					<li>
						Update the &quot;Last updated&quot; date at the top of this policy
					</li>
					<li>Notify you by email (for significant changes)</li>
					<li>Post a notice on our website</li>
				</ul>
				<p>
					We encourage you to review this policy periodically. Your continued
					use of Shiko after changes constitutes acceptance of the updated
					policy.
				</p>
			</section>

			{/* Section 12: Contact Us */}
			<section id='section-12' className='scroll-mt-24'>
				<h2>12. Contact Us</h2>
				<p>
					If you have questions about this Privacy Policy or our data practices,
					please contact us:
				</p>
				<ul>
					<li>
						<strong>Email:</strong>{' '}
						<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
					</li>
					<li>
						<strong>Data Controller:</strong> Shiko (Poland)
					</li>
				</ul>
				<p>
					For GDPR-related inquiries, you can also contact your local data
					protection authority.
				</p>
			</section>

			{/* Footer navigation */}
			<div className='not-prose mt-16 pt-8 border-t border-border-subtle'>
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
					<Link
						href='/terms'
						className='text-primary-400 hover:text-primary-300 transition-colors duration-200'
					>
						Read our Terms of Service →
					</Link>
					<BackToTopLink />
				</div>
			</div>
		</article>
	);
}
