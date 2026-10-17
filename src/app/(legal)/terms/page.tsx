import { BackToTopLink } from '@/components/legal/back-to-top-link';
import { CONTACT_EMAIL, LEGAL_OPERATOR } from '@/constants/legal';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Terms of Service - Shiko',
	description:
		'The terms for using Shiko, the AI-powered mind mapping platform: accounts, plans and refunds, your content, plugins, AI features, and how to complain.',
};

const EFFECTIVE_DATE = 'October 18, 2026';

export default function TermsOfServicePage() {
	return (
		<article className='prose prose-invert prose-zinc max-w-none'>
			{/* Header */}
			<header className='not-prose mb-12'>
				<h1 className='text-3xl sm:text-4xl font-bold text-text-primary mb-4'>
					Terms of Service
				</h1>
				<p className='text-text-secondary'>
					Last updated: <time dateTime='2026-10-18'>{EFFECTIVE_DATE}</time>
				</p>
			</header>

			{/* Table of Contents */}
			<nav className='not-prose mb-12 p-6 bg-elevated/50 rounded-lg border border-border-subtle'>
				<h2 className='text-sm font-semibold text-text-primary uppercase tracking-wider mb-4'>
					Contents
				</h2>
				<ol className='space-y-2 text-sm'>
					{[
						'About These Terms',
						'The Service',
						'Accounts',
						'Plans, Billing & Refunds',
						'Acceptable Use',
						'Your Content',
						'Plugins & Recipes',
						'AI Features',
						'Reporting Illegal Content',
						'Third-Party Services',
						'Warranties & Liability',
						'Ending Your Account',
						'Complaints & Disputes',
						'Changes to These Terms',
						'General',
					].map((title, index) => (
						<li key={title}>
							<a
								href={`#section-${index + 1}`}
								className='text-text-secondary hover:text-primary-400 transition-colors duration-200 motion-reduce:transition-none'
							>
								{index + 1}. {title}
							</a>
						</li>
					))}
				</ol>
			</nav>

			{/* Section 1: About These Terms */}
			<section id='section-1' className='scroll-mt-24'>
				<h2>1. About These Terms</h2>
				<p>
					Shiko (&quot;Service&quot;) is run by{' '}
					<strong>{LEGAL_OPERATOR.name}</strong>, {LEGAL_OPERATOR.address}
					(&quot;we&quot;, &quot;us&quot;). You can reach us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. By using
					Shiko you agree to these Terms. If you don&apos;t agree, please
					don&apos;t use it.
				</p>
				<p>
					You must be at least 16 years old (or 13 where the GDPR does not
					apply). If you use Shiko for an organization, you confirm you can
					accept these Terms for it.
				</p>
				<p>
					If you are a consumer, the mandatory consumer laws of your country
					still apply, and nothing in these Terms takes away rights you have
					under them.
				</p>
			</section>

			{/* Section 2: The Service */}
			<section id='section-2' className='scroll-mt-24'>
				<h2>2. The Service</h2>
				<p>
					Shiko is a mind mapping app with live collaboration, AI suggestions
					you ask for, plugins, recipes and export. To use it you need a current
					browser with JavaScript turned on and an internet connection. Changes
					made offline are saved when you reconnect.
				</p>
				<p>
					We may change, suspend or stop parts of Shiko when there is a good
					reason, such as security, a legal requirement, a technical limit or an
					improvement. If a change substantially reduces what you paid for, we
					will tell you at least 30 days ahead where we can, and you can cancel
					and get a refund for the unused part of your paid period.
				</p>
			</section>

			{/* Section 3: Accounts */}
			<section id='section-3' className='scroll-mt-24'>
				<h2>3. Accounts</h2>

				<h3>3.1 Creating an Account</h3>
				<p>
					You can sign up with email and password, or with Google or GitHub.
					Give accurate information.
				</p>

				<h3>3.2 Your Responsibilities</h3>
				<ul>
					<li>Keep your login details secure</li>
					<li>Tell us promptly if someone else has used your account</li>
					<li>You are responsible for what happens under your account</li>
				</ul>

				<h3>3.3 Guests</h3>
				<p>
					You can join a shared map with a room code without an account. Shiko
					then makes a temporary guest account with the name you enter. Guests
					have fewer features. A guest account stays until the map owner removes
					the guest or the guest asks us to delete it at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
			</section>

			{/* Section 4: Plans, Billing & Refunds */}
			<section id='section-4' className='scroll-mt-24'>
				<h2>4. Plans, Billing &amp; Refunds</h2>

				<h3>4.1 Plans</h3>
				<p>
					Shiko has a Free plan and a Pro plan. What each includes and the
					current prices are on the <Link href='/#pricing'>pricing page</Link>.
					The price you see at checkout, with any tax, is the price you pay.
				</p>

				<h3>4.2 Who Sells Pro</h3>
				<p>
					Pro is sold by our payment partner, Polar Software, Inc.
					(&quot;Polar&quot;), as seller of record. You buy from Polar, it takes
					payment and handles tax and invoices, and{' '}
					<a
						href='https://polar.sh/legal/checkout-buyer-terms'
						rel='noopener noreferrer'
						target='_blank'
					>
						Polar&apos;s buyer terms
					</a>{' '}
					apply to the purchase. We never see your card details. For billing
					problems you can write to us or to Polar.
				</p>

				<h3>4.3 Renewal and Cancellation</h3>
				<p>
					Pro renews automatically each month or year until you cancel. Cancel
					any time from Billing in your account settings. You keep Pro until the
					end of the period you paid for, then your account moves to the Free
					plan. If you are over the Free limits at that point, you may need to
					delete content or upgrade to keep adding to it.
				</p>

				<h3>4.4 Refunds and Your Right to Withdraw</h3>
				<p>
					You can cancel your first Pro purchase within <strong>14 days</strong>{' '}
					of your first payment and get a full refund, without giving a reason.
					Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or ask
					Polar. The refund goes back to the way you paid. Later renewals are
					not refunded unless the law requires it or Shiko failed to provide the
					service. Your legal rights as a consumer are not affected.
				</p>

				<h3>4.5 Price Changes</h3>
				<p>
					If we raise the price of Pro, we will tell you at least 30 days before
					it applies to your next renewal, and you can cancel before then.
				</p>
			</section>

			{/* Section 5: Acceptable Use */}
			<section id='section-5' className='scroll-mt-24'>
				<h2>5. Acceptable Use</h2>
				<p>Don&apos;t use Shiko to:</p>
				<ul>
					<li>Create, store or share illegal content</li>
					<li>
						Share content that infringes others&apos; rights, or that is
						defamatory, harassing, threatening, or promotes violence or
						discrimination
					</li>
					<li>
						Distribute malware or take part in phishing, fraud or deception
					</li>
					<li>Get into other people&apos;s accounts or data</li>
					<li>
						Disrupt Shiko, scrape it or use bots on it without permission, or
						get around limits or billing
					</li>
					<li>Resell or commercially exploit Shiko without our agreement</li>
				</ul>
				<p>
					We limit how fast Shiko can be used so it stays stable for everyone.
					Heavy use that affects other people or our systems may be slowed or
					restricted.
				</p>
			</section>

			{/* Section 6: Your Content */}
			<section id='section-6' className='scroll-mt-24'>
				<h2>6. Your Content</h2>

				<h3>6.1 You Own It</h3>
				<p>
					You keep ownership of everything you create in Shiko (&quot;your
					content&quot;). We don&apos;t claim it.
				</p>

				<h3>6.2 Licence to Shiko</h3>
				<p>
					You give us a limited, worldwide, non-exclusive, royalty-free licence
					to store your content, show it to you and the people you share it
					with, process it to provide the Service (including AI features you ask
					for), and keep backups. The licence ends when you delete the content
					or your account, except for backups, which are overwritten within 90
					days.
				</p>

				<h3>6.3 Your Responsibility</h3>
				<p>
					You are responsible for your content and for having the right to use
					it, including when you use AI features on text other people wrote. See
					our <Link href='/privacy'>Privacy Policy</Link> for what AI features
					send.
				</p>

				<h3>6.4 Removing Content</h3>
				<p>
					We may remove or hide content that breaks these Terms or the law. We
					tell you why and how to object, unless the law stops us. See section
					9.
				</p>
			</section>

			{/* Section 7: Plugins & Recipes */}
			<section id='section-7' className='scroll-mt-24'>
				<h2>7. Plugins &amp; Recipes</h2>

				<h3>7.1 Using Them</h3>
				<p>
					A map&apos;s owner can turn plugins on for it. Shiko reviews the
					plugins it offers and runs them in a restricted sandbox in your
					browser, but plugins are made by their authors, and section 11 applies
					to them too. The <Link href='/privacy#plugins'>Privacy Policy</Link>{' '}
					explains what a plugin that connects to a site sends.
				</p>

				<h3>7.2 Publishing Them</h3>
				<p>If you submit a plugin or share a recipe, you confirm that:</p>
				<ul>
					<li>You have the right to publish it</li>
					<li>
						A plugin does what it says, reaches only the sites it names, and
						contains no malware or code meant to collect people&apos;s data
					</li>
				</ul>
				<p>
					You give other Shiko users a licence to run your plugin or copy your
					shared recipe, and we may show your display name as the author. We may
					review, refuse, publish or turn off a plugin or recipe, and we tell
					you why. If you delete your account, your plugins are removed; copies
					of a recipe that people already installed stay with them.
				</p>
			</section>

			{/* Section 8: AI Features */}
			<section id='section-8' className='scroll-mt-24'>
				<h2>8. AI Features</h2>
				<ul>
					<li>
						AI output can be wrong, incomplete or unsuitable. You are
						responsible for checking it before you rely on it.
					</li>
					<li>
						AI features send our AI provider what the result needs (node text
						and tags, how nodes connect, the map&apos;s title and description,
						and what you type for AI); the{' '}
						<Link href='/privacy'>Privacy Policy</Link> has the details.
					</li>
					<li>
						AI features can be unavailable or change when the models behind them
						change.
					</li>
					<li>
						Don&apos;t use AI features to break section 5, to copy or extract
						the AI models, or to create content meant to deceive people.
					</li>
				</ul>
			</section>

			{/* Section 9: Reporting Illegal Content */}
			<section id='section-9' className='scroll-mt-24'>
				<h2>9. Reporting Illegal Content</h2>

				<h3>9.1 How to Report</h3>
				<p>
					If you see illegal content on Shiko, or a plugin that misbehaves, tell
					us. For content, email{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with where it
					is (a link to the map is best), why you think it is illegal, and your
					name and email. For a plugin, use Report in its menu.
				</p>

				<h3>9.2 What We Do</h3>
				<p>
					We review reports promptly and may remove or disable the content, or
					turn a plugin off (we then tell the owners of the maps that use it).
					We tell the person who posted it what we did and why, and they can
					reply to us and ask us to look again.
				</p>

				<h3>9.3 Contact Point</h3>
				<p>
					This email is also our single point of contact for authorities and for
					anyone using Shiko under the EU Digital Services Act. Write in English
					or Polish.
				</p>
			</section>

			{/* Section 10: Third-Party Services */}
			<section id='section-10' className='scroll-mt-24'>
				<h2>10. Third-Party Services</h2>
				<p>
					Shiko links to or works with other services, such as Google and GitHub
					sign-in and the sites some plugins connect to. They have their own
					terms and privacy policies, and we are not responsible for what they
					do.
				</p>
			</section>

			{/* Section 11: Warranties & Liability */}
			<section id='section-11' className='scroll-mt-24'>
				<h2>11. Warranties &amp; Liability</h2>

				<h3>11.1 No Promise of Perfection</h3>
				<p>
					TO THE EXTENT THE LAW ALLOWS, SHIKO IS PROVIDED &quot;AS IS&quot; AND
					&quot;AS AVAILABLE&quot;, WITHOUT WARRANTIES THAT IT WILL BE
					UNINTERRUPTED, ERROR-FREE, OR SUITED TO YOUR PARTICULAR NEEDS.
				</p>

				<h3>11.2 Limit on Liability</h3>
				<p>
					TO THE EXTENT THE LAW ALLOWS, WE ARE NOT LIABLE FOR INDIRECT OR
					CONSEQUENTIAL LOSS, OR FOR LOST PROFIT, REVENUE OR DATA, AND OUR TOTAL
					LIABILITY FOR ANY CLAIM IS LIMITED TO WHAT YOU PAID US IN THE TWELVE
					MONTHS BEFORE THE CLAIM, OR $100 IF THAT IS MORE.
				</p>

				<h3>11.3 What This Does Not Limit</h3>
				<p>
					Nothing in these Terms limits liability that cannot be limited by law.
					That includes liability for intent or gross negligence, for injury to
					a person, and, for consumers, rights the law gives you, such as the
					right to a service that matches what was promised.
				</p>

				<h3>11.4 Business Users</h3>
				<p>
					If you use Shiko for business, you will cover claims from third
					parties that arise from your content or your breach of these Terms.
				</p>
			</section>

			{/* Section 12: Ending Your Account */}
			<section id='section-12' className='scroll-mt-24'>
				<h2>12. Ending Your Account</h2>

				<h3>12.1 By You</h3>
				<p>
					You can delete your account in your account settings or by emailing
					us. Deleting it cancels Pro straight away and does not refund the rest
					of the period, so cancel Pro first if you want to use the time you
					paid for. Export your data first if you want to keep it. The Privacy
					Policy explains what is deleted.
				</p>

				<h3>12.2 By Us</h3>
				<p>
					We may suspend or end your account if you break these Terms, if your
					use is a security risk, if the law requires it, or if we stop offering
					Shiko. We tell you why and give notice, except where the situation is
					urgent or the law stops us. If we end a paid account and you did not
					break these Terms, we refund the unused part of the period.
				</p>

				<h3>12.3 After It Ends</h3>
				<p>
					Your access stops and your content is deleted as described in the
					Privacy Policy. Sections that by their nature should continue, such as
					11, keep applying.
				</p>
			</section>

			{/* Section 13: Complaints & Disputes */}
			<section id='section-13' className='scroll-mt-24'>
				<h2>13. Complaints &amp; Disputes</h2>

				<h3>13.1 Complaints</h3>
				<p>
					If something is wrong, email{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We answer
					within 14 days. You can also ask a consumer protection body in your
					country for help, and you can always go to court.
				</p>

				<h3>13.2 Governing Law</h3>
				<p>
					Polish law governs these Terms. If you are a consumer, you keep the
					protection of the mandatory laws of your country of residence.
				</p>

				<h3>13.3 Courts</h3>
				<p>
					Disputes go to the courts of Poland. If you are a consumer, you can
					also bring a case in the courts of your own country.
				</p>
			</section>

			{/* Section 14: Changes to These Terms */}
			<section id='section-14' className='scroll-mt-24'>
				<h2>14. Changes to These Terms</h2>
				<p>
					For a material change we give at least 30 days&apos; notice by email
					or in the app, and update the date at the top. If you keep using Shiko
					after the change takes effect, you accept it. If you disagree, you can
					delete your account, or cancel Pro for a refund of the unused period,
					before then.
				</p>
			</section>

			{/* Section 15: General */}
			<section id='section-15' className='scroll-mt-24'>
				<h2>15. General</h2>
				<ul>
					<li>
						These Terms, the <Link href='/privacy'>Privacy Policy</Link> and,
						for Pro purchases, Polar&apos;s buyer terms are the whole agreement
						between us.
					</li>
					<li>
						If a part of these Terms cannot be enforced, the rest still applies.
					</li>
					<li>
						If we don&apos;t enforce something straight away, we haven&apos;t
						given it up.
					</li>
					<li>
						You can&apos;t transfer your rights under these Terms without our
						written consent. We may transfer ours to a successor to Shiko, as
						long as your rights don&apos;t get worse.
					</li>
					<li>
						&quot;Shiko&quot; and its logo are our trademarks. The
						Service&apos;s design and code are ours or our licensors&apos;;
						don&apos;t copy or reverse engineer them except where the law
						allows.
					</li>
					<li>
						If you send us feedback, we may use it without obligation to you.
					</li>
				</ul>
			</section>

			{/* Footer navigation */}
			<div className='not-prose mt-16 pt-8 border-t border-border-subtle'>
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
					<Link
						href='/privacy'
						className='text-primary-400 hover:text-primary-300 transition-colors duration-200 motion-reduce:transition-none'
					>
						Read our Privacy Policy →
					</Link>
					<BackToTopLink />
				</div>
			</div>
		</article>
	);
}
