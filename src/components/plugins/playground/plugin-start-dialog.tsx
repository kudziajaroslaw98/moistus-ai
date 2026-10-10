'use client';

import {
	DeveloperModeSetting,
	useDeveloperMode,
} from '@/components/plugins/developer-mode-switch';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	createDraftFromText,
	DraftRequestError,
} from '@/lib/plugins/drafts-client';
import {
	loadTemplateFiles,
	PLAYGROUND_TEMPLATES,
} from '@/lib/plugins/playground/templates';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	describePowerKind,
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import { Code2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { QUIET_BUTTON_CLASS } from './playground-styles';

const playgroundHref = (draftId: string) =>
	`/dashboard/plugins/playground/${draftId}`;

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong. Try again.';

/**
 * "Write a plugin": pick a template (or import your two files) and land in the
 * playground. Developer mode comes first: while it's off the dialog says what it is and
 * holds the switch, and the templates wait.
 */
export function PluginStartDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const importId = useId();
	const { enabled } = useDeveloperMode();
	const [busy, setBusy] = useState<string | null>(null);
	const [problem, setProblem] = useState<string | null>(null);

	const start = async (
		key: string,
		files: () => Promise<{ manifestText: string; code: string }>
	) => {
		setBusy(key);
		setProblem(null);
		try {
			const { manifestText, code } = await files();
			const draft = await createDraftFromText(manifestText, code);
			router.push(playgroundHref(draft.id));
		} catch (error) {
			setProblem(
				error instanceof DraftRequestError && error.needsDeveloperMode
					? 'Turn on Developer mode first.'
					: messageOf(error)
			);
			setBusy(null);
		}
	};

	const importFiles = (list: FileList | null) => {
		const files = Array.from(list ?? []);
		const manifest = files.find((file) =>
			file.name.toLowerCase().endsWith('.json')
		);
		const code = files.find((file) => file.name.toLowerCase().endsWith('.js'));
		if (!manifest || !code) {
			setProblem('Choose both manifest.json and a .js file (plugin.js).');
			return;
		}
		void start('import', async () => ({
			manifestText: await manifest.text(),
			code: await code.text(),
		}));
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className='max-h-[90dvh] gap-0 overflow-y-auto border border-[#1d1f24] bg-[#0e0f12] p-0 sm:max-w-[760px]'>
				<DialogHeader className='px-6 pt-6'>
					<DialogTitle className='text-lg font-semibold text-white'>
						Write a plugin
					</DialogTitle>

					<DialogDescription className='text-sm leading-5 text-zinc-400'>
						Start from something close. You can change every line, and it saves
						as a draft only you see.
					</DialogDescription>
				</DialogHeader>

				{!enabled && (
					<div
						className='mx-6 mt-5 flex items-start gap-3.5 rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-4 py-3.5'
						role='group'
					>
						<Code2
							aria-hidden
							className='mt-0.5 size-[18px] shrink-0 text-amber-300'
						/>

						<div className='flex min-w-0 flex-1 flex-col gap-3'>
							<div className='flex flex-col gap-1'>
								<p className='text-sm font-medium text-amber-100'>
									Writing plugins needs Developer mode
								</p>

								<p className='text-[13px] leading-[19px] text-zinc-300'>
									It’s a switch for people who build things. It shows the
									Developer section in the Plugins panel and lets drafts run on
									your own maps. Only you see your drafts. You can turn it off
									any time in Map Settings or Settings.
								</p>
							</div>

							<DeveloperModeSetting id='start-dialog-developer-mode' />
						</div>
					</div>
				)}

				<div className='grid gap-3 px-6 pb-2 pt-5 sm:grid-cols-2'>
					{PLAYGROUND_TEMPLATES.map((template) => {
						const Icon = PLUGIN_ICONS[template.icon];
						const power = powerKindOfPermissions(template.permissions);
						return (
							<article
								className='flex flex-col gap-2.5 rounded-[14px] border border-[#1d1f24] bg-[#0b0c0f] p-4'
								key={template.id}
							>
								<div className='flex items-center gap-3'>
									<span
										className='flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#1d1f24] bg-[#0e0f12]'
										style={{
											color: `hsl(${PLUGIN_POWER_HUES[power]} 80% 68%)`,
										}}
									>
										<Icon aria-hidden className='size-[18px]' />
									</span>

									<div className='min-w-0 flex-1'>
										<h3 className='truncate text-[15px] font-semibold text-white'>
											{template.name}
										</h3>

										<code className='font-mono text-[11.5px] text-teal-300'>
											{template.trigger}
										</code>
									</div>
								</div>

								<p className='min-h-10 text-[13px] leading-5 text-zinc-400'>
									{template.description}
								</p>

								<p className='flex min-h-5 items-center text-xs text-zinc-400'>
									{describePowerKind(template.permissions) === 'No powers'
										? 'Only its own nodes'
										: describePowerKind(template.permissions)}
								</p>

								<div className='mt-auto flex items-center justify-between gap-3 pt-1.5'>
									<span className='text-xs text-zinc-500'>2 files</span>

									<button
										className={QUIET_BUTTON_CLASS}
										disabled={!enabled || busy !== null}
										type='button'
										onClick={() =>
											void start(template.id, () =>
												loadTemplateFiles(template.id)
											)
										}
									>
										{busy === template.id ? 'Starting…' : 'Start'}
									</button>
								</div>
							</article>
						);
					})}
				</div>

				{problem && (
					<p className='mx-6 mt-3 text-sm text-red-300' role='alert'>
						{problem}
					</p>
				)}

				<div className='mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[#1d1f24] px-6 pb-5 pt-4'>
					<div className='flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px]'>
						<label
							className='inline-flex cursor-pointer items-center gap-1.5 text-zinc-400 transition-colors duration-200 ease [@media(hover:hover)]:hover:text-white'
							htmlFor={importId}
						>
							<Upload aria-hidden className='size-3.5' />
							Import manifest.json and plugin.js
						</label>

						<input
							multiple
							accept='.json,.js,application/json,text/javascript'
							className='sr-only'
							disabled={!enabled || busy !== null}
							id={importId}
							type='file'
							onChange={(event) => {
								importFiles(event.target.files);
								event.target.value = '';
							}}
						/>

						<Link
							className='text-zinc-400 transition-colors duration-200 ease [@media(hover:hover)]:hover:text-white'
							href='/dashboard/plugins/build'
							onClick={() => onOpenChange(false)}
						>
							Use my own editor and load from localhost
						</Link>
					</div>

					<button
						className={QUIET_BUTTON_CLASS}
						onClick={() => onOpenChange(false)}
						type='button'
					>
						Cancel
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
