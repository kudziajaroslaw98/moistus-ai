import { BackToTopLink } from '@/components/legal/back-to-top-link';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Terms of Service - Shiko',
	description:
		'Terms and conditions for using Shiko, the AI-powered mind mapping platform.',
};

const EFFECTIVE_DATE = 'January 23, 2026';
const CONTACT_EMAIL = 'support@shiko.app';

export default function TermsOfServicePage() {
	return (
		<article className='prose prose-invert prose-zinc max-w-none'>
			{/* Header */}
			<header className='not-prose mb-12'>
				<h1 className='text-3xl sm:text-4xl font-bold text-text-primary mb-4'>
					Terms of Service
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
						'Acceptance of Terms',
						'Description of Service',
						'Account Registration',
						'Subscription Plans & Billing',
						'Acceptable Use',
						'User Content',
						'Intellectual Property',
						'AI Features',
						'Third-Party Services',
						'Disclaimer of Warranties',
						'Limitation of Liability',
						'Indemnification',
						'Termination',
						'Dispute Resolution',
						'Changes to Terms',
						'General Provisions',
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

			{/* Section 1: Acceptance of Terms */}
			<section id='section-1' className='scroll-mt-24'>
				<h2>1. Acceptance of Terms</h2>
				<p>
					By accessing or using Shiko (&quot;Service&quot;), you agree to be
					bound by these Terms of Service (&quot;Terms&quot;). If you do not
					agree to these Terms, you may not use the Service.
				</p>
				<p>
					You must be at least 16 years old (or 13 in jurisdictions where the
					GDPR does not apply) to use this Service. By using Shiko, you
					represent that you meet this age requirement.
				</p>
				<p>
					If you are using the Service on behalf of an organization, you
					represent that you have the authority to bind that organization to
					these Terms.
				</p>
			</section>

			{/* Section 2: Description of Service */}
			<section id='section-2' className='scroll-mt-24'>
				<h2>2. Description of Service</h2>
				<p>Shiko is an AI-powered mind mapping platform that provides:</p>
				<ul>
					<li>
						<strong>Mind mapping tools</strong> — Create, organize, and
						visualize your ideas with various node types (text, tasks, code,
						images, questions, and more)
					</li>
					<li>
						<strong>AI-powered features</strong> — Get intelligent suggestions,
						answers, and connections powered by artificial intelligence
					</li>
					<li>
						<strong>Real-time collaboration</strong> — Work together with others
						on shared mind maps with live cursors and presence indicators
					</li>
					<li>
						<strong>Export capabilities</strong> — Export your work in various
						formats (PNG, SVG, PDF)
					</li>
				</ul>
				<p>
					We reserve the right to modify, suspend, or discontinue any aspect of
					the Service at any time, with or without notice.
				</p>
			</section>

			{/* Section 3: Account Registration */}
			<section id='section-3' className='scroll-mt-24'>
				<h2>3. Account Registration</h2>

				<h3>3.1 Account Creation</h3>
				<p>
					To use most features of Shiko, you must create an account. You can
					sign up using:
				</p>
				<ul>
					<li>Email and password</li>
					<li>Google OAuth</li>
					<li>GitHub OAuth</li>
				</ul>

				<h3>3.2 Account Responsibilities</h3>
				<p>You agree to:</p>
				<ul>
					<li>Provide accurate and complete information during registration</li>
					<li>Keep your login credentials secure and confidential</li>
					<li>
						Notify us immediately of any unauthorized access to your account
					</li>
					<li>
						Be responsible for all activity that occurs under your account
					</li>
				</ul>

				<h3>3.3 Anonymous Access</h3>
				<p>
					Some features, such as joining shared maps via room codes, may be
					available without creating an account. Anonymous users have limited
					functionality and their data may not be retained after the session
					ends.
				</p>
			</section>

			{/* Section 4: Subscription Plans & Billing */}
			<section id='section-4' className='scroll-mt-24'>
				<h2>4. Subscription Plans & Billing</h2>

				<h3>4.1 Free Plan</h3>
				<p>Our free plan includes:</p>
				<ul>
					<li>Up to 3 mind maps</li>
					<li>Up to 50 nodes per map</li>
					<li>Up to 3 collaborators per map</li>
					<li>Basic features</li>
				</ul>

				<h3>4.2 Pro Plan</h3>
				<p>Our Pro plan ($12/month or $120/year) includes:</p>
				<ul>
					<li>Unlimited mind maps</li>
					<li>Unlimited nodes per map</li>
					<li>Unlimited collaborators per map</li>
					<li>100 AI suggestions per month</li>
					<li>Priority support</li>
				</ul>

				<h3>4.3 Payment Processing</h3>
				<p>
					Payments are processed by Polar.sh, our third-party payment processor.
					By subscribing, you agree to Polar&apos;s terms of service. We do not
					store your payment card information.
				</p>

				<h3>4.4 Billing Cycle</h3>
				<p>
					Subscriptions are billed in advance on a monthly or annual basis. Your
					subscription will automatically renew at the end of each billing
					period unless you cancel.
				</p>

				<h3>4.5 Cancellation</h3>
				<p>
					You may cancel your subscription at any time through your account
					settings or by contacting us. Upon cancellation:
				</p>
				<ul>
					<li>
						You will retain access to Pro features until the end of your current
						billing period
					</li>
					<li>
						Your account will revert to the Free plan at the end of the period
					</li>
					<li>
						If you exceed Free plan limits, you may need to delete content or
						upgrade to continue using the Service
					</li>
				</ul>

				<h3>4.6 Refunds</h3>
				<p>
					We generally do not provide refunds for subscription fees. However, we
					may consider refund requests on a case-by-case basis for exceptional
					circumstances. Contact us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for
					assistance.
				</p>

				<h3>4.7 Price Changes</h3>
				<p>
					We may change our prices at any time. For existing subscribers, price
					changes will take effect at the start of the next billing cycle after
					30 days&apos; notice.
				</p>
			</section>

			{/* Section 5: Acceptable Use */}
			<section id='section-5' className='scroll-mt-24'>
				<h2>5. Acceptable Use</h2>
				<p>You agree not to use the Service to:</p>

				<h3>5.1 Prohibited Content</h3>
				<ul>
					<li>Create, store, or share illegal content</li>
					<li>Distribute malware, viruses, or harmful code</li>
					<li>Share content that infringes intellectual property rights</li>
					<li>
						Post content that is defamatory, harassing, threatening, or promotes
						violence or discrimination
					</li>
					<li>
						Share explicit or adult content without appropriate safeguards
					</li>
					<li>Engage in phishing, fraud, or deceptive practices</li>
				</ul>

				<h3>5.2 Prohibited Activities</h3>
				<ul>
					<li>
						Attempt to gain unauthorized access to other users&apos; accounts or
						data
					</li>
					<li>
						Reverse engineer, decompile, or disassemble any part of the Service
					</li>
					<li>
						Use automated systems (bots, scrapers) to access the Service without
						permission
					</li>
					<li>Interfere with or disrupt the Service or its infrastructure</li>
					<li>Circumvent usage limits or billing mechanisms</li>
					<li>
						Resell, sublicense, or commercially exploit the Service without
						authorization
					</li>
				</ul>

				<h3>5.3 Rate Limits</h3>
				<p>
					We implement rate limits to ensure fair usage and service stability.
					Excessive use that impacts other users or our infrastructure may
					result in temporary or permanent restrictions.
				</p>
			</section>

			{/* Section 6: User Content */}
			<section id='section-6' className='scroll-mt-24'>
				<h2>6. User Content</h2>

				<h3>6.1 Ownership</h3>
				<p>
					You retain ownership of all content you create using Shiko (&quot;User
					Content&quot;). We do not claim ownership of your mind maps, nodes, or
					other content.
				</p>

				<h3>6.2 License to Shiko</h3>
				<p>
					By using the Service, you grant us a limited, worldwide,
					non-exclusive, royalty-free license to:
				</p>
				<ul>
					<li>
						Store and display your content to you and your authorized
						collaborators
					</li>
					<li>
						Process your content to provide the Service (including AI features)
					</li>
					<li>Create backups for disaster recovery</li>
				</ul>
				<p>This license ends when you delete your content or account.</p>

				<h3>6.3 AI Processing Consent</h3>
				<p>
					When you use AI features, your content (such as node text and map
					structure) is sent to our AI provider (OpenAI) for processing. By
					using AI features, you consent to this data transfer. See our{' '}
					<Link href='/privacy'>Privacy Policy</Link> for details.
				</p>

				<h3>6.4 Content Responsibility</h3>
				<p>
					You are solely responsible for your User Content. We do not endorse or
					guarantee the accuracy, completeness, or usefulness of any User
					Content.
				</p>

				<h3>6.5 Content Removal</h3>
				<p>
					We reserve the right to remove or disable access to content that
					violates these Terms or applicable law, without prior notice.
				</p>
			</section>

			{/* Section 7: Intellectual Property */}
			<section id='section-7' className='scroll-mt-24'>
				<h2>7. Intellectual Property</h2>

				<h3>7.1 Shiko&apos;s Rights</h3>
				<p>
					The Service, including its design, features, code, and documentation,
					is owned by Shiko and protected by intellectual property laws. You may
					not copy, modify, or distribute any part of the Service without our
					permission.
				</p>

				<h3>7.2 Trademarks</h3>
				<p>
					&quot;Shiko&quot; and our logo are trademarks. You may not use our
					trademarks without prior written consent.
				</p>

				<h3>7.3 Feedback</h3>
				<p>
					If you provide feedback, suggestions, or ideas about the Service, you
					grant us a perpetual, royalty-free license to use and incorporate that
					feedback without obligation to you.
				</p>
			</section>

			{/* Section 8: AI Features */}
			<section id='section-8' className='scroll-mt-24'>
				<h2>8. AI Features</h2>

				<h3>8.1 AI-Generated Content</h3>
				<p>
					Shiko uses artificial intelligence (powered by OpenAI) to provide
					suggestions, answers, and other features. You understand that:
				</p>
				<ul>
					<li>
						AI-generated content may not be accurate, complete, or appropriate
						for your needs
					</li>
					<li>
						You are responsible for reviewing and verifying any AI-generated
						content
					</li>
					<li>
						AI features may not be available at all times due to third-party
						service limitations
					</li>
				</ul>

				<h3>8.2 Data Sent to AI</h3>
				<p>
					When you use AI features, the following data may be sent to OpenAI:
				</p>
				<ul>
					<li>Mind map structure (node relationships)</li>
					<li>Node content (text, not images or files)</li>
					<li>
						Your chat messages and conversation history (within the session)
					</li>
				</ul>

				<h3>8.3 No Guarantees</h3>
				<p>
					We make no guarantees about the quality, accuracy, or availability of
					AI features. AI capabilities may change as underlying models are
					updated.
				</p>

				<h3>8.4 Prohibited AI Uses</h3>
				<p>You may not use AI features to:</p>
				<ul>
					<li>Generate content that violates our Acceptable Use policy</li>
					<li>Attempt to extract or reverse-engineer AI models</li>
					<li>Generate content intended to deceive or mislead others</li>
				</ul>
			</section>

			{/* Section 9: Third-Party Services */}
			<section id='section-9' className='scroll-mt-24'>
				<h2>9. Third-Party Services</h2>
				<p>
					The Service may contain links to or integrations with third-party
					websites and services. We do not control or endorse these third
					parties and are not responsible for their content, privacy practices,
					or terms.
				</p>
				<p>
					Your use of third-party services (including OAuth providers like
					Google and GitHub) is subject to their respective terms and privacy
					policies.
				</p>
			</section>

			{/* Section 10: Disclaimer of Warranties */}
			<section id='section-10' className='scroll-mt-24'>
				<h2>10. Disclaimer of Warranties</h2>
				<p>
					THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
					WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
					LIMITED TO:
				</p>
				<ul>
					<li>MERCHANTABILITY</li>
					<li>FITNESS FOR A PARTICULAR PURPOSE</li>
					<li>NON-INFRINGEMENT</li>
					<li>ACCURACY OR RELIABILITY OF CONTENT</li>
					<li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
				</ul>
				<p>
					We do not guarantee that the Service will meet your requirements or
					that any errors will be corrected. Use of the Service is at your own
					risk.
				</p>
			</section>

			{/* Section 11: Limitation of Liability */}
			<section id='section-11' className='scroll-mt-24'>
				<h2>11. Limitation of Liability</h2>
				<p>
					TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHIKO AND ITS AFFILIATES,
					OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
				</p>
				<ul>
					<li>
						Any indirect, incidental, special, consequential, or punitive
						damages
					</li>
					<li>Loss of data, profits, revenue, or business opportunities</li>
					<li>Damages arising from your use or inability to use the Service</li>
					<li>
						Damages arising from unauthorized access to your account or data
					</li>
				</ul>
				<p>
					IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US IN
					THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS
					GREATER.
				</p>
				<p>
					Some jurisdictions do not allow limitation of liability for certain
					damages. In such jurisdictions, our liability is limited to the
					maximum extent permitted by law.
				</p>
			</section>

			{/* Section 12: Indemnification */}
			<section id='section-12' className='scroll-mt-24'>
				<h2>12. Indemnification</h2>
				<p>
					You agree to indemnify, defend, and hold harmless Shiko and its
					affiliates from any claims, damages, losses, and expenses (including
					legal fees) arising from:
				</p>
				<ul>
					<li>Your use of the Service</li>
					<li>Your User Content</li>
					<li>Your violation of these Terms</li>
					<li>Your violation of any third-party rights</li>
				</ul>
			</section>

			{/* Section 13: Termination */}
			<section id='section-13' className='scroll-mt-24'>
				<h2>13. Termination</h2>

				<h3>13.1 Termination by You</h3>
				<p>
					You may terminate your account at any time through your account
					settings or by contacting us. Upon termination, your right to use the
					Service will cease immediately.
				</p>

				<h3>13.2 Termination by Shiko</h3>
				<p>We may suspend or terminate your account if:</p>
				<ul>
					<li>You violate these Terms</li>
					<li>Your use poses a security risk to the Service or other users</li>
					<li>We are required to do so by law</li>
					<li>We discontinue the Service (with reasonable notice)</li>
				</ul>

				<h3>13.3 Effect of Termination</h3>
				<p>Upon termination:</p>
				<ul>
					<li>Your access to the Service will be revoked</li>
					<li>
						Your User Content may be deleted (we recommend exporting your data
						before termination)
					</li>
					<li>
						Provisions that should survive termination (such as Limitation of
						Liability and Indemnification) will remain in effect
					</li>
				</ul>
			</section>

			{/* Section 14: Dispute Resolution */}
			<section id='section-14' className='scroll-mt-24'>
				<h2>14. Dispute Resolution</h2>

				<h3>14.1 Governing Law</h3>
				<p>
					These Terms are governed by the laws of Poland, without regard to
					conflict of law principles. For EU users, mandatory consumer
					protection laws of your country of residence may also apply.
				</p>

				<h3>14.2 Informal Resolution</h3>
				<p>
					Before initiating any formal dispute resolution, you agree to contact
					us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to
					attempt to resolve the dispute informally. We will try to resolve
					disputes within 30 days.
				</p>

				<h3>14.3 Jurisdiction</h3>
				<p>
					Any disputes that cannot be resolved informally shall be subject to
					the exclusive jurisdiction of the courts in Poland, except where
					consumer protection laws grant you the right to bring proceedings in
					your country of residence.
				</p>
			</section>

			{/* Section 15: Changes to Terms */}
			<section id='section-15' className='scroll-mt-24'>
				<h2>15. Changes to Terms</h2>
				<p>
					We may update these Terms from time to time. When we make material
					changes:
				</p>
				<ul>
					<li>
						We will provide at least 30 days&apos; notice before the changes
						take effect
					</li>
					<li>We will notify you by email and/or through the Service</li>
					<li>
						We will update the &quot;Last updated&quot; date at the top of these
						Terms
					</li>
				</ul>
				<p>
					Your continued use of the Service after the changes take effect
					constitutes acceptance of the new Terms. If you do not agree to the
					changes, you must stop using the Service.
				</p>
			</section>

			{/* Section 16: General Provisions */}
			<section id='section-16' className='scroll-mt-24'>
				<h2>16. General Provisions</h2>

				<h3>16.1 Entire Agreement</h3>
				<p>
					These Terms, together with our{' '}
					<Link href='/privacy'>Privacy Policy</Link>, constitute the entire
					agreement between you and Shiko regarding the Service.
				</p>

				<h3>16.2 Severability</h3>
				<p>
					If any provision of these Terms is found to be unenforceable, the
					remaining provisions will continue in effect.
				</p>

				<h3>16.3 Waiver</h3>
				<p>
					Our failure to enforce any right or provision of these Terms does not
					constitute a waiver of that right or provision.
				</p>

				<h3>16.4 Assignment</h3>
				<p>
					You may not assign your rights or obligations under these Terms
					without our prior written consent. We may assign our rights and
					obligations without restriction.
				</p>

				<h3>16.5 Contact</h3>
				<p>
					For questions about these Terms, please contact us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
			</section>

			{/* Footer navigation */}
			<div className='not-prose mt-16 pt-8 border-t border-border-subtle'>
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
					<Link
						href='/privacy'
						className='text-primary-400 hover:text-primary-300 transition-colors duration-200'
					>
						Read our Privacy Policy →
					</Link>
					<BackToTopLink />
				</div>
			</div>
		</article>
	);
}
