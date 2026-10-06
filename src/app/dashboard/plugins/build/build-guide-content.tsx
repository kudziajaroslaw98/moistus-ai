'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DeveloperModeSetting } from '@/components/plugins/developer-mode-switch';
import { buttonVariants } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMac } from '@/hooks/use-platform';
import {
	STARTER_MANIFEST,
	STARTER_MANIFEST_JSON,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';
import { cn } from '@/utils/cn';
import { Check, ChevronLeft, Copy, Download } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
	FIELD_TYPE_ROWS,
	LIMIT_ROWS,
	MANIFEST_ROWS,
	NODE_KIND_ROWS,
	UI_CALLS,
	type GuideRow,
} from './guide-reference';

const STARTER_KIND = STARTER_MANIFEST.nodeKinds[0];
const SERVE_COMMAND = 'npx serve --cors -l 5173';
const MANIFEST_URL = 'http://localhost:5173/manifest.json';

const SECTIONS = [
	{ id: 'quick-start', label: 'Quick start' },
	{ id: 'manifest', label: 'manifest.json' },
	{ id: 'fields', label: 'How people fill in fields' },
	{ id: 'plugin-js', label: 'plugin.js' },
	{ id: 'ui', label: 'What a plugin can draw' },
	{ id: 'limits', label: 'Limits' },
	{ id: 'cant', label: 'What plugins can’t do' },
	{ id: 'sharing', label: 'Sharing a plugin' },
] as const;

const codeChipClass =
	'rounded bg-teal-500/15 px-1.5 py-px font-mono text-[12.5px] text-teal-300';

function useCopy() {
	const [copied, setCopied] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);

	const copy = async (key: string, text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(key);
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(null), 1500);
		} catch {
			toast.error('Couldn’t copy. Select the text and copy it yourself.');
		}
	};

	return { copied, copy };
}

function downloadFile(filename: string, content: string, type: string) {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	// Give the browser a moment to start the download before freeing the URL.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CopyButton({
	label,
	isCopied,
	onCopy,
	showText = false,
}: {
	label: string;
	isCopied: boolean;
	onCopy: () => void;
	showText?: boolean;
}) {
	const Icon = isCopied ? Check : Copy;
	return (
		<button
			aria-label={showText ? undefined : label}
			onClick={onCopy}
			type='button'
			className={cn(
				'flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-400 transition-colors duration-200 ease hover:bg-white/[0.06] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
				!showText && 'w-7 justify-center px-0'
			)}
		>
			<Icon aria-hidden className={cn('size-3.5', isCopied && 'text-emerald-400')} />

			{showText && (isCopied ? 'Copied' : 'Copy')}
		</button>
	);
}

function CommandLine({
	id,
	text,
	label,
	copy,
}: {
	id: string;
	text: string;
	label: string;
	copy: ReturnType<typeof useCopy>;
}) {
	return (
		<div className='flex items-center gap-2 rounded-[10px] border border-zinc-800 bg-[#0b0b0b] py-2.5 pl-4 pr-2'>
			<code className='min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[13px] leading-5 text-zinc-200'>
				{text}
			</code>

			<CopyButton
				isCopied={copy.copied === id}
				label={label}
				onCopy={() => void copy.copy(id, text)}
			/>
		</div>
	);
}

function CodeFile({
	filename,
	code,
	copy,
}: {
	filename: string;
	code: string;
	copy: ReturnType<typeof useCopy>;
}) {
	return (
		<div className='overflow-hidden rounded-[10px] border border-zinc-800 bg-[#0b0b0b]'>
			<div className='flex items-center justify-between border-b border-zinc-800 py-1.5 pl-4 pr-2'>
				<span className='text-xs text-zinc-400'>{filename}</span>

				<CopyButton
					showText
					isCopied={copy.copied === filename}
					label={`Copy ${filename}`}
					onCopy={() => void copy.copy(filename, code)}
				/>
			</div>

			<pre className='overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-5 text-zinc-300'>
				<code>{code}</code>
			</pre>
		</div>
	);
}

function ReferenceTable({
	rows,
	nameHeader,
	descriptionHeader,
}: {
	rows: GuideRow[];
	nameHeader: string;
	descriptionHeader: string;
}) {
	return (
		<div className='overflow-x-auto'>
			<table className='w-full border-collapse text-[13px] leading-5'>
				<thead>
					<tr>
						<th
							className='w-[40%] border-b border-zinc-800 py-2 pr-3 text-left font-medium text-zinc-400'
							scope='col'
						>
							{nameHeader}
						</th>

						<th
							className='border-b border-zinc-800 py-2 text-left font-medium text-zinc-400'
							scope='col'
						>
							{descriptionHeader}
						</th>
					</tr>
				</thead>

				<tbody>
					{rows.map((row) => (
						<tr key={row.name}>
							<td className='border-b border-zinc-900 py-2.5 pr-3 align-top font-mono text-[12.5px] text-zinc-200'>
								{row.name}
							</td>

							<td className='border-b border-zinc-900 py-2.5 text-zinc-300'>
								{row.description}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Section({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section aria-labelledby={`${id}-title`} className='flex scroll-mt-6 flex-col gap-4' id={id}>
			<h2 className='text-xl font-semibold text-white' id={`${id}-title`}>
				{title}
			</h2>

			{children}
		</section>
	);
}

function Step({
	number,
	title,
	children,
}: {
	number: number;
	title: string;
	children: ReactNode;
}) {
	return (
		<li className='flex gap-3.5'>
			<span
				aria-hidden
				className='flex size-[26px] shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xs font-semibold text-zinc-300'
			>
				{number}
			</span>

			<div className='flex min-w-0 flex-1 flex-col gap-2.5'>
				<h3 className='text-[15px] font-medium leading-6 text-white'>{title}</h3>

				{children}
			</div>
		</li>
	);
}

/** Highlights the table-of-contents entry for the section being read. */
function useActiveSection(ids: readonly string[]) {
	const [active, setActive] = useState<string>(ids[0]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) setActive(visible[0].target.id);
			},
			{ rootMargin: '0px 0px -65% 0px' }
		);
		for (const id of ids) {
			const element = document.getElementById(id);
			if (element) observer.observe(element);
		}
		return () => observer.disconnect();
	}, [ids]);

	return active;
}

const bodyClass = 'text-sm leading-[22px] text-zinc-400';

/** Dashboard "Build a plugin" guide: a quick start with the Counter starter, then the reference. */
export function BuildGuideContent() {
	const isMac = useIsMac();
	const copy = useCopy();
	const activeSection = useActiveSection(SECTIONS.map((section) => section.id));
	const paletteShortcut = isMac ? '⌘K' : 'Ctrl+K';

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='p-6 md:p-8'>
					<div className='mx-auto flex max-w-5xl items-start gap-12'>
						<article className='flex min-w-0 max-w-3xl flex-1 flex-col gap-12'>
							<header className='flex flex-col gap-2'>
								<Link
									className='inline-flex items-center gap-0.5 self-start rounded-sm text-sm text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
									href='/dashboard/plugins'
								>
									<ChevronLeft aria-hidden className='size-4' />
									Plugins
								</Link>

								<h1 className='text-3xl font-bold tracking-tight text-white'>
									Build a plugin
								</h1>

								<p className='text-zinc-400'>
									A plugin adds a new kind of node. You list its fields in
									manifest.json and draw it in plugin.js, in plain JavaScript.
								</p>
							</header>

							<Section id='quick-start' title='Quick start'>
								<ol className='flex flex-col gap-6'>
									<Step number={1} title='Turn on Developer mode'>
										<p className={bodyClass}>
											It adds a Developer section to the Plugins panel of maps you
											own. It&apos;s also in Map Settings › Editor Preferences and
											in Settings › Editor.
										</p>

										<div className='rounded-[10px] border border-zinc-800 bg-[#0b0b0b] p-3.5'>
											<DeveloperModeSetting id='guide-developer-mode' />
										</div>
									</Step>

									<Step number={2} title='Download the starter'>
										<p className={bodyClass}>
											A Counter plugin in two files. Put both in one folder.
										</p>

										<div className='flex flex-wrap gap-2'>
											<button
												className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
												type='button'
												onClick={() =>
													downloadFile('manifest.json', STARTER_MANIFEST_JSON, 'application/json')
												}
											>
												<Download aria-hidden className='size-3.5' />
												manifest.json
											</button>

											<button
												className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
												type='button'
												onClick={() =>
													downloadFile('plugin.js', STARTER_PLUGIN_JS, 'text/javascript')
												}
											>
												<Download aria-hidden className='size-3.5' />
												plugin.js
											</button>
										</div>
									</Step>

									<Step number={3} title='Serve the folder from localhost'>
										<CommandLine
											copy={copy}
											id='serve'
											label='Copy command'
											text={SERVE_COMMAND}
										/>

										<p className={bodyClass}>
											{`Shiko fetches the files from your browser, so the server has to allow requests from other sites. That's what `}

											<code className='whitespace-nowrap font-mono text-[13px] text-zinc-300'>
												--cors
											</code>

											{` does; any static server with CORS works. If port 5173 is taken, serve picks another one and prints it.`}
										</p>
									</Step>

									<Step number={4} title='Load it on a map you own'>
										<p className={bodyClass}>
											Open the map, press {paletteShortcut} and choose Plugins.
											Under Developer, paste the manifest URL and press Load.
										</p>

										<CommandLine
											copy={copy}
											id='manifest-url'
											label='Copy URL'
											text={MANIFEST_URL}
										/>
									</Step>

									<Step number={5} title='Add a node'>
										<p className={bodyClass}>
											Type <code className={codeChipClass}>${STARTER_KIND.kind}</code>

											{` in the node editor, or press ${paletteShortcut} and choose Add ${STARTER_KIND.label}. When you change plugin.js, press Reload next to it in the Plugins panel.`}
										</p>
									</Step>
								</ol>
							</Section>

							<Section id='manifest' title='manifest.json'>
								<p className={bodyClass}>
									Says who made the plugin and which kinds of node it adds. Each
									kind lists the fields people fill in.
								</p>

								<CodeFile code={STARTER_MANIFEST_JSON} copy={copy} filename='manifest.json' />

								<ReferenceTable descriptionHeader='What it is' nameHeader='Key' rows={MANIFEST_ROWS} />

								<ReferenceTable
									descriptionHeader='What it is'
									nameHeader='In each of nodeKinds'
									rows={NODE_KIND_ROWS}
								/>

								<ReferenceTable
									descriptionHeader='Options'
									nameHeader='Field type'
									rows={FIELD_TYPE_ROWS}
								/>
							</Section>

							<Section id='fields' title='How people fill in fields'>
								<p className={bodyClass}>
									In the node editor, fields are typed as name:value. Text without
									a name goes into labelField. Put values with spaces in quotes,
									like unit:&quot;cups of tea&quot;.
								</p>

								<div className='rounded-[10px] border border-zinc-800 bg-[#0b0b0b] px-4 py-3 font-mono text-[13px] text-zinc-300'>
									Coffees today <span className='text-teal-300'>count:2</span>
								</div>

								<p className={bodyClass}>
									Shiko highlights, completes and checks the fields from your
									manifest, so you don&apos;t write any editor code. Editing a
									node shows its fields as text again.
								</p>
							</Section>

							<Section id='plugin-js' title='plugin.js'>
								<p className={bodyClass}>
									Draws the node and handles its buttons. Only two globals exist:
									definePlugin and ui.
								</p>

								<CodeFile code={STARTER_PLUGIN_JS} copy={copy} filename='plugin.js' />

								<dl className='flex flex-col gap-4'>
									<div className='flex flex-col gap-1'>
										<dt className='font-mono text-[13px] text-zinc-200'>definePlugin({'{ kinds }'})</dt>

										<dd className={bodyClass}>
											Call it once. Each key in kinds matches a kind in the
											manifest.
										</dd>
									</div>

									<div className='flex flex-col gap-1'>
										<dt className='font-mono text-[13px] text-zinc-200'>render(data, ctx)</dt>

										<dd className={bodyClass}>
											Returns the node&apos;s view, built with ui. data holds the
											node&apos;s fields; list rows carry an id. ctx.canEdit is
											false for people who can only view the map, and ctx.today is
											their date (2026-12-31). Runs again whenever the data or the
											day changes.
										</dd>
									</div>

									<div className='flex flex-col gap-1'>
										<dt className='font-mono text-[13px] text-zinc-200'>summary(data)</dt>

										<dd className={bodyClass}>
											Optional. Plain text that search, AI and exports use for
											the node.
										</dd>
									</div>

									<div className='flex flex-col gap-1'>
										<dt className='font-mono text-[13px] text-zinc-200'>
											actions.increment(data, payload, ctx)
										</dt>

										<dd className={bodyClass}>
											Runs when someone presses a button or checkbox that names
											it. Return the node&apos;s new data: Shiko checks it against
											your fields and saves it as one History step credited to
											your plugin. To change one list row, send its id in the
											payload and find it by id, not by position: someone else may
											have changed the list a moment ago.
										</dd>
									</div>
								</dl>
							</Section>

							<Section id='ui' title='What a plugin can draw'>
								<ReferenceTable descriptionHeader='What it draws' nameHeader='Call' rows={UI_CALLS} />
							</Section>

							<Section id='limits' title='Limits'>
								<ReferenceTable descriptionHeader='Up to' nameHeader='What' rows={LIMIT_ROWS} />

								<p className={bodyClass}>
									A plugin that runs too long or uses too much memory is stopped.
									Its nodes show their last saved view with a Retry button.
								</p>
							</Section>

							<Section id='cant' title='What plugins can’t do, and why'>
								<ul className='flex list-disc flex-col gap-2.5 pl-5 text-sm leading-[22px] text-zinc-400'>
									<li>
										<span className='text-zinc-200'>No internet, page access or timers.</span>{' '}
										Plugin code runs in a sandbox in a background worker, away
										from the page and your account.
									</li>

									<li>
										<span className='text-zinc-200'>No links, images or HTML in views.</span>{' '}
										A URL could carry your map&apos;s text to someone else&apos;s
										server, so views are built only from the pieces above.
									</li>

									<li>
										<span className='text-zinc-200'>Only its own nodes.</span> A
										plugin changes the data of the nodes it made and nothing else
										on the map.
									</li>
								</ul>
							</Section>

							<Section id='sharing' title='Sharing a plugin'>
								<p className={bodyClass}>
									A plugin you load from localhost runs only for you, in that
									browser. Collaborators see each of its nodes as it last looked.
									Plugins anyone can turn on are reviewed and shipped with Shiko.
								</p>
							</Section>
						</article>

						<nav
							aria-label='On this page'
							className='sticky top-6 hidden w-48 shrink-0 flex-col gap-1 pt-[104px] xl:flex'
						>
							<span className='pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
								On this page
							</span>

							{SECTIONS.map((section) => (
								<a
									aria-current={activeSection === section.id ? 'location' : undefined}
									href={`#${section.id}`}
									key={section.id}
									className={cn(
										'rounded-sm py-1 text-[13px] leading-5 transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
										activeSection === section.id
											? 'text-white'
											: 'text-zinc-500 hover:text-zinc-200'
									)}
								>
									{section.label}
								</a>
							))}
						</nav>
					</div>
				</div>
			</DashboardLayout>
		</SidebarProvider>
	);
}
