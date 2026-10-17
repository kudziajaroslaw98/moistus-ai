import { BackToTopLink } from '@/components/legal/back-to-top-link';
import { CONTACT_EMAIL, LEGAL_OPERATOR } from '@/constants/legal';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Privacy Policy - Shiko',
	description:
		'What personal data Shiko collects, why, who receives it, how long we keep it, and your rights.',
};

const EFFECTIVE_DATE = 'October 18, 2026';

// Described by purpose, never by key or database name: names add nothing for a
// reader and go stale. A new kind of storage needs a row here.
const STORED_THINGS = [
	{
		what: 'Signing in',
		kind: 'Cookies',
		why: 'Keeps you signed in and secures the sign-in process. It never holds your password.',
		howLong: 'Until you sign out',
	},
	{
		what: 'Your preferences',
		kind: 'Cookie and browser storage',
		why: 'Remembers your editor settings, whether the sidebar is open, and the tips you’ve closed.',
		howLong: 'Sidebar: a week. The rest: until you clear your browser data',
	},
	{
		what: 'Working offline',
		kind: 'Browser storage',
		why: 'A copy of the maps you’ve opened and any changes made without a connection, so Shiko keeps working offline and saves them when you’re back.',
		howLong: 'Until you clear your browser data',
	},
	{
		what: 'Faster loading',
		kind: 'Browser cache',
		why: 'Saved copies of Shiko’s pages and files, so the app loads quickly and opens offline.',
		howLong: 'Replaced as Shiko updates',
	},
];

export default function PrivacyPolicyPage() {
	return (
		<article className='prose prose-invert h-auto prose-zinc max-w-none'>
			{/* Header */}
			<header className='not-prose mb-12'>
				<h1 className='text-3xl sm:text-4xl font-bold text-text-primary mb-4'>
					Privacy Policy
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
						'Who We Are',
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
						'Cookies and Browser Storage',
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

			{/* Section 1: Who We Are */}
			<section id='section-1' className='scroll-mt-24'>
				<h2>1. Who We Are</h2>
				<p>
					Shiko is an AI-powered mind mapping app. It is run by{' '}
					<strong>{LEGAL_OPERATOR.name}</strong>, {LEGAL_OPERATOR.address}, who
					is the controller of your personal data under the EU&apos;s General
					Data Protection Regulation (GDPR). You can reach us at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
				<p>
					This policy explains what personal data we collect, why, who receives
					it, how long we keep it, and what rights you have. It applies to
					everyone who uses Shiko; section 7.8 adds what applies to residents of
					the United States.
				</p>
			</section>

			{/* Section 2: Information We Collect */}
			<section id='section-2' className='scroll-mt-24'>
				<h2>2. Information We Collect</h2>

				<h3>2.1 Account Information</h3>
				<p>When you create an account, we collect:</p>
				<ul>
					<li>
						<strong>Email address</strong> — to identify your account and
						contact you
					</li>
					<li>
						<strong>Password</strong> — stored in scrambled (hashed) form; we
						can&apos;t read it
					</li>
					<li>
						<strong>Display name</strong> — optional, shown to collaborators
					</li>
					<li>
						<strong>Profile details</strong> — an optional bio, picture and
						preferences you choose to add
					</li>
				</ul>

				<h3>2.2 Signing In With Google or GitHub</h3>
				<p>
					If you sign in with Google or GitHub, they send us your email address,
					name (or username) and profile picture. We never receive your Google
					or GitHub password.
				</p>

				<h3>2.3 Guests</h3>
				<p>
					You can join a shared map with a room code without an account. Shiko
					then creates a temporary guest account with the name you enter. A
					guest has no email address.
				</p>

				<h3>2.4 Content You Create</h3>
				<ul>
					<li>
						<strong>Maps</strong> — titles, descriptions, nodes (text, tasks,
						code, images and more) and the connections between them
					</li>
					<li>
						<strong>Comments and reactions</strong> on shared maps
					</li>
					<li>
						<strong>Change history</strong> — who changed what on a map and
						when, so you can see and restore earlier versions
					</li>
					<li>
						<strong>Plugins, recipes and drafts</strong> you write or install,
						and any plugin reports you file
					</li>
				</ul>

				<h3>2.5 Usage and Billing</h3>
				<ul>
					<li>
						How many AI actions you have used, to apply your plan&apos;s limit
					</li>
					<li>
						Your plan, billing period and payment history (amounts and dates) as
						reported by our payment seller, Polar. We never see your card
						details
					</li>
					<li>
						The notifications Shiko sends you (in the app, by email, and by
						browser push if you turn it on)
					</li>
				</ul>

				<h3>2.6 Technical Data</h3>
				<p>
					Our servers log your IP address, browser type and device details when
					you use Shiko. We use them to run the service, limit abuse and keep it
					secure.
				</p>

				<h3>2.7 What We Don&apos;t Collect</h3>
				<ul>
					<li>Payment card details (the seller, Polar, handles them)</li>
					<li>Your location, phone number or contacts</li>
					<li>
						Analytics, advertising or tracking data: Shiko uses no analytics
						service, ad network or device fingerprinting
					</li>
				</ul>
			</section>

			{/* Section 3: How We Use Your Information */}
			<section id='section-3' className='scroll-mt-24'>
				<h2>3. How We Use Your Information</h2>
				<p>
					Each use below names its legal basis; section 4 explains what they
					mean.
				</p>
				<ul>
					<li>
						<strong>Provide Shiko</strong> — store and sync your maps, let
						people you share them with work on them live, keep their change
						history, and send you notifications. <em>Basis: contract.</em>
					</li>
					<li>
						<strong>AI features you ask for</strong> — when you use an AI action
						(suggestions, connections, merges, node search, recipes or link
						summaries) we send OpenAI what the result needs: node text and tags,
						how nodes connect, the map&apos;s title and description, and what
						you type for AI (a recipe&apos;s instruction, a search query). For a
						link summary it is the text of the page. Text written by other
						people on the map can be part of it.{' '}
						<em>Basis: contract (you asked for it).</em>
					</li>
					<li>
						<strong>Billing</strong> — manage your plan and keep the records the
						law requires. <em>Basis: contract and legal obligation.</em>
					</li>
					<li>
						<strong>Emails</strong> — account and security emails (sign-in
						codes, password resets, account deletion confirmation), and updates
						when someone mentions you, replies to your comment or reacts to it.
						You can turn the update emails off in your account settings.{' '}
						<em>
							Basis: contract for account emails; legitimate interest for
							updates.
						</em>
					</li>
					<li>
						<strong>Push notifications</strong> — only if you allow them in your
						browser. <em>Basis: your consent.</em>
					</li>
					<li>
						<strong>Security and moderation</strong> — limit abuse, detect
						fraud, review plugins and handle reports of illegal or harmful
						content. <em>Basis: legitimate interest.</em>
					</li>
					<li>
						<strong>Legal requests</strong> — answer valid requests from courts
						and authorities. <em>Basis: legal obligation.</em>
					</li>
				</ul>
			</section>

			{/* Section 4: Legal Basis for Processing */}
			<section id='section-4' className='scroll-mt-24'>
				<h2>4. Legal Basis for Processing (GDPR)</h2>

				<h3>4.1 Contract</h3>
				<p>
					Processing needed to give you the service you signed up for, including
					AI actions you start yourself.
				</p>

				<h3>4.2 Legitimate Interests</h3>
				<p>
					Keeping Shiko secure and free of abuse, and telling you about activity
					on your maps. We weigh these against your rights, and you can object
					(section 7.6).
				</p>

				<h3>4.3 Consent</h3>
				<p>
					Used only for browser push notifications. You can withdraw it at any
					time by turning push off in your settings or your browser.
				</p>

				<h3>4.4 Legal Obligation</h3>
				<p>
					Processing needed to follow the law, such as keeping billing records
					or answering a court order.
				</p>

				<h3>4.5 No Automated Decisions</h3>
				<p>
					We don&apos;t make decisions about you based solely on automated
					processing that have legal or similarly significant effects.
				</p>
			</section>

			{/* Section 5: Information Sharing */}
			<section id='section-5' className='scroll-mt-24'>
				<h2>5. Information Sharing</h2>
				<p>
					<strong>We do not sell your personal data.</strong> We share it only
					as described here.
				</p>

				<h3>5.1 Service Providers</h3>
				<p>
					These companies process data for us to run Shiko. The{' '}
					<Link href='/subprocessors'>subprocessors page</Link> links each
					one&apos;s privacy policy.
				</p>

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
									What it receives
								</th>
							</tr>
						</thead>
						<tbody className='text-text-secondary'>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Supabase</td>
								<td className='py-3 px-4'>
									Database, sign-in, real-time updates
								</td>
								<td className='py-3 px-4'>US (Ohio)</td>
								<td className='py-3 px-4'>Your account and all your content</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Vercel</td>
								<td className='py-3 px-4'>Hosting</td>
								<td className='py-3 px-4'>US (global network)</td>
								<td className='py-3 px-4'>
									Your requests to Shiko, including your IP address
								</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>PartyKit (Cloudflare)</td>
								<td className='py-3 px-4'>Live collaboration</td>
								<td className='py-3 px-4'>Global (Cloudflare network)</td>
								<td className='py-3 px-4'>
									Live edits, cursors and presence on maps you have open
								</td>
							</tr>
							<tr className='border-b border-border-subtle/50'>
								<td className='py-3 px-4'>Resend</td>
								<td className='py-3 px-4'>Email delivery</td>
								<td className='py-3 px-4'>US</td>
								<td className='py-3 px-4'>
									Your email address and the email text
								</td>
							</tr>
							<tr>
								<td className='py-3 px-4'>OpenAI</td>
								<td className='py-3 px-4'>AI features</td>
								<td className='py-3 px-4'>US</td>
								<td className='py-3 px-4'>
									Map title and description, node text and tags, how nodes
									connect, recipe instructions and search queries, and the text
									of pages you ask Shiko to summarize. OpenAI keeps it up to 30
									days to detect abuse and does not use it to train its models
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					<strong>Companies you deal with directly.</strong> Polar sells Pro
					subscriptions and receives your email, name and payment details when
					you buy. Google and GitHub receive your sign-in when you use them to
					sign in. Each handles your data under its own privacy policy.
				</p>

				<h3>5.2 Collaborators</h3>
				<p>
					When you share a map, the people on it can see your display name,
					picture and email address, what you change (including in the change
					history), and your live cursor and selection. Comments you write are
					visible to everyone with access to the map.
				</p>

				<h3 id='plugins' className='scroll-mt-24'>
					5.3 Plugins
				</h3>
				<p>
					Plugins add new kinds of nodes to a map. Only a map&apos;s owner can
					turn a plugin on, and Shiko reviews every plugin it offers. Plugins
					you load from your own computer in Developer mode run only for you.
				</p>
				<ul>
					<li>
						Most plugins work only with their own nodes and send nothing
						anywhere. Plugins that read other nodes, whether the nodes under
						them or the nodes you link to them, can&apos;t connect to any site,
						so what they read stays in your browser.
					</li>
					<li>
						A plugin that connects to another site, such as GitHub or Wikipedia,
						names that site and who runs it, with a link to their privacy
						policy, before anything is sent. It connects only when someone who
						can edit the map adds the plugin&apos;s node, edits it or presses
						Refresh. That person&apos;s browser sends the site what was typed
						into that one node (for example an issue address or a topic), along
						with what every browser request includes, such as their IP address.
						No cookies or Shiko account details are sent. The site handles that
						information under its own privacy policy.
					</li>
					<li>
						What the site sends back is saved in the map, so everyone else sees
						it without contacting the site. Viewing a map never makes your
						browser contact a plugin&apos;s site.
					</li>
					<li>
						If you report a plugin, Shiko&apos;s reviewers see your report and,
						only if you choose to attach it, the plugin data of the one node you
						selected. The plugin&apos;s author never sees who reported it or
						what was attached.
					</li>
				</ul>
				<p>
					Sites that plugins connect to are not Shiko subprocessors: Shiko
					doesn&apos;t send them your data. The request comes from the browser
					of the person who adds or refreshes the node.
				</p>

				<h3>5.4 What You Publish</h3>
				<p>
					If you submit a plugin to the library, its code, name and your display
					name as author are visible to everyone signed in to Shiko. If you
					share a recipe by link, anyone with the link can read and copy it.
				</p>

				<h3>5.5 Push Notifications</h3>
				<p>
					If you turn push on, notifications travel through your browser
					maker&apos;s push service (for example Google, Apple or Mozilla). The
					content is encrypted so only your browser can read it.
				</p>

				<h3>5.6 Legal Requirements</h3>
				<p>
					We may disclose information if a law, court order or valid government
					request requires it.
				</p>

				<h3>5.7 Business Transfers</h3>
				<p>
					If Shiko is sold or merged, your information may move to the new
					owner. We will tell you first and your rights under this policy
					continue.
				</p>
			</section>

			{/* Section 6: Data Retention */}
			<section id='section-6' className='scroll-mt-24'>
				<h2>6. Data Retention</h2>
				<ul>
					<li>
						<strong>Active accounts</strong> — we keep your data while your
						account is active.
					</li>
					<li>
						<strong>Deleted accounts</strong> — when you delete your account, we
						delete your profile and your maps, and everything in them, within 30
						days. What you added to other people&apos;s maps (nodes,
						connections, comments and replies, and their change history) stays
						on those maps without your name or picture, shown as &quot;Former
						member&quot;. Your reactions and your access to those maps are
						removed. To remove specific items, delete them before you leave or
						ask us. Plugins you published are removed; recipe copies other
						people already installed stay with them. We keep only what the law
						requires.
					</li>
					<li>
						<strong>Guests</strong> — a guest account that hasn&apos;t been used
						for 90 days is removed, and what it added to a map stays there as
						&quot;Former member&quot;. The map owner can remove a guest sooner,
						and a guest can ask us to delete their account at any time.
					</li>
					<li>
						<strong>Backups</strong> — backups may hold deleted data for up to
						90 days, then it is overwritten.
					</li>
					<li>
						<strong>Server logs</strong> — kept for a short time for security
						and debugging.
					</li>
					<li>
						<strong>Purchases</strong> — Polar keeps its own records of your
						purchases as tax law requires.
					</li>
				</ul>
			</section>

			{/* Section 7: Your Rights */}
			<section id='section-7' className='scroll-mt-24'>
				<h2>7. Your Rights</h2>
				<p>
					Under the GDPR you have the rights below. To use any of them, email{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the
					address on your account. We reply within 30 days.
				</p>

				<h3>7.1 Access</h3>
				<p>
					Ask for a copy of your personal data. You can also download your data
					yourself in your account settings.
				</p>

				<h3>7.2 Rectification</h3>
				<p>Correct your information any time in your account settings.</p>

				<h3>7.3 Erasure</h3>
				<p>
					Delete your account in your account settings, or ask us to delete it.
					You can also ask us to remove specific items.
				</p>

				<h3>7.4 Portability</h3>
				<p>
					Export your maps and data as a JSON file to use with another service.
				</p>

				<h3>7.5 Restriction</h3>
				<p>
					Ask us to pause using your data while you dispute its accuracy or our
					reasons for using it.
				</p>

				<h3>7.6 Objection</h3>
				<p>
					Object to processing based on our legitimate interests (section 4.2).
					Update emails can be switched off in your account settings.
				</p>

				<h3>7.7 Withdraw Consent and Complain</h3>
				<p>
					Where we rely on consent, you can withdraw it at any time; this
					doesn&apos;t affect what happened before. You can also complain to a
					data protection authority. In Poland that is the President of the
					Personal Data Protection Office (UODO), or you can contact the
					authority in your own country.
				</p>

				<h3>7.8 United States Residents</h3>
				<p>
					If you live in California or another US state with a privacy law, you
					can ask to know what personal information we collect and why (this
					policy), get a copy, have it deleted, and have it corrected. We
					don&apos;t discriminate against you for using these rights. We
					don&apos;t sell personal information or share it for advertising
					across websites, and we use sign-in credentials only to sign you in.
					Email us from your account address to make a request. If we decline,
					reply to our answer to appeal. We respond within 45 days.
				</p>
			</section>

			{/* Section 8: International Data Transfers */}
			<section id='section-8' className='scroll-mt-24'>
				<h2>8. International Data Transfers</h2>
				<p>
					Shiko&apos;s database and hosting are in the United States, so your
					data leaves the European Economic Area (EEA). We rely on the EU–US
					Data Privacy Framework where a provider is certified under it, and
					otherwise on Standard Contractual Clauses, which are EU-approved
					contract terms with the provider. You can ask us for a copy at{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
			</section>

			{/* Section 9: Security */}
			<section id='section-9' className='scroll-mt-24'>
				<h2>9. Security</h2>
				<ul>
					<li>Everything between you and Shiko is encrypted (HTTPS).</li>
					<li>Passwords are stored scrambled, so nobody can read them.</li>
					<li>
						A map is visible only to you and the people you share it with, and
						access to personal data on our side is limited to what running the
						service needs.
					</li>
					<li>We keep our software up to date to fix security problems.</li>
				</ul>
				<p>
					No system is completely secure. If a breach puts your rights at risk,
					we will tell you and the authorities as the law requires. To report a
					vulnerability, email{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
				</p>
			</section>

			{/* Section 10: Children's Privacy */}
			<section id='section-10' className='scroll-mt-24'>
				<h2>10. Children&apos;s Privacy</h2>
				<p>
					Shiko is not meant for children under 16 (or 13 where the GDPR does
					not apply). We don&apos;t knowingly collect their personal
					information. If you think a child has given us any, email{' '}
					<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will
					delete it.
				</p>
			</section>

			{/* Section 11: Changes to This Policy */}
			<section id='section-11' className='scroll-mt-24'>
				<h2>11. Changes to This Policy</h2>
				<p>
					When we change this policy we update the &quot;Last updated&quot;
					date. For significant changes we also email you or tell you in the app
					before they take effect.
				</p>
			</section>

			{/* Section 12: Cookies and Browser Storage */}
			<section id='section-12' className='scroll-mt-24'>
				<h2 id='cookies' className='scroll-mt-24'>
					12. Cookies and Browser Storage
				</h2>
				<p>
					Shiko stores a few things in your browser so you can sign in and so
					the editor works the way you left it. We don&apos;t use advertising or
					analytics cookies, and nothing Shiko stores is used to follow you
					across other websites.
				</p>
				<p>
					Everything listed below is needed for something you asked Shiko to do:
					sign you in, save your work, remember your settings. The law
					doesn&apos;t require consent for that, which is why Shiko shows a
					short notice and doesn&apos;t ask you to accept or refuse.{' '}
					<strong>
						If we ever add anything that isn&apos;t needed, we&apos;ll ask you
						first, and saying no will be as easy as saying yes.
					</strong>
				</p>

				<h3>12.1 What we store</h3>
				<div role='list' className='not-prose my-6 text-sm'>
					<div
						aria-hidden='true'
						className='hidden gap-x-6 border-b border-border-subtle px-4 py-3 font-semibold text-text-primary sm:flex'
					>
						<span className='flex-[1_1_13rem]'>What</span>
						<span className='flex-[999_1_20rem]'>What it&apos;s for</span>
						<span className='flex-[1_1_10.5rem]'>How long</span>
					</div>
					{STORED_THINGS.map((item) => (
						<div
							key={item.what}
							role='listitem'
							className='flex flex-wrap gap-x-6 gap-y-1.5 border-b border-border-subtle/50 px-4 py-3.5'
						>
							<div className='min-w-0 flex-[1_1_13rem]'>
								<div className='font-semibold text-text-primary'>
									{item.what}
								</div>
								<div className='mt-0.5 text-text-tertiary'>{item.kind}</div>
							</div>
							<div className='flex-[999_1_20rem] text-text-secondary'>
								{item.why}
							</div>
							<div className='flex-[1_1_10.5rem] text-text-secondary'>
								{item.howLong}
							</div>
						</div>
					))}
				</div>

				<h3>12.2 Other websites</h3>
				<p>
					Shiko loads no third-party scripts, ads or trackers, and its fonts
					come from Shiko&apos;s own servers. A few things you do take you to,
					or load something from, another website, which handles your data under
					its own privacy policy:
				</p>
				<ul>
					<li>
						Paying for Pro takes you to Polar&apos;s checkout, which sets its
						own cookies.
					</li>
					<li>Signing in with Google or GitHub happens on their websites.</li>
					<li>
						An image that you or a collaborator add from another website loads
						from that website.
					</li>
					<li>
						Plugins that connect to a website work as described in{' '}
						<a href='#plugins'>5.3 Plugins</a>.
					</li>
				</ul>

				<h3>12.3 Do Not Track and Global Privacy Control</h3>
				<p>
					Shiko doesn&apos;t track you across websites and doesn&apos;t sell or
					share your personal information for advertising. If your browser sends
					a Do Not Track or Global Privacy Control signal, nothing needs to
					change, because Shiko already works the way those signals ask.
				</p>

				<h3>12.4 Clearing what&apos;s stored</h3>
				<p>
					You can delete Shiko&apos;s cookies and storage in your browser&apos;s
					settings at any time. Clearing it signs you out and resets your editor
					settings and tips. It also loses any changes that haven&apos;t been
					saved yet, so reconnect first if you&apos;ve been working offline. On
					a shared computer, clear your browser data when you&apos;re done.
				</p>
			</section>

			{/* Section 13: Contact Us */}
			<section id='section-13' className='scroll-mt-24'>
				<h2>13. Contact Us</h2>
				<p>For questions about this policy or to use your rights:</p>
				<ul>
					<li>
						<strong>Email:</strong>{' '}
						<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
					</li>
					<li>
						<strong>Controller:</strong> {LEGAL_OPERATOR.name},{' '}
						{LEGAL_OPERATOR.address}
					</li>
				</ul>
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
