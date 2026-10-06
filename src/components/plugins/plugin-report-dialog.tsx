'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
	PLUGIN_REPORT_REASON_LABELS,
	PLUGIN_REPORT_REASONS,
	type PluginReportInput,
	type PluginReportReason,
} from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { CircleCheck, Loader2 } from 'lucide-react';
import { useId, useState } from 'react';

interface PluginReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pluginId: string;
	pluginName: string;
	version?: string;
	mapId?: string;
	/** The selected node's plugin data; offered as an attachment, never sent unless ticked. */
	nodeData?: Record<string, unknown> | null;
	/** Shown after sending: the owner can turn it off now. */
	isOwner?: boolean;
}

/** Report a plugin to Shiko. The author never sees who sent it. */
export function PluginReportDialog({
	open,
	onOpenChange,
	pluginId,
	pluginName,
	version,
	mapId,
	nodeData,
	isOwner = false,
}: PluginReportDialogProps) {
	const [reason, setReason] = useState<PluginReportReason>('broken');
	const [details, setDetails] = useState('');
	const [attach, setAttach] = useState(false);
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const ids = useId();

	const close = (next: boolean) => {
		if (!next) {
			setSent(false);
			setDetails('');
			setAttach(false);
			setError(null);
		}
		onOpenChange(next);
	};

	const send = async () => {
		setSending(true);
		setError(null);
		const body: PluginReportInput = {
			pluginId,
			version,
			mapId,
			reason,
			details: details.trim() || undefined,
			nodeData: attach && nodeData ? nodeData : undefined,
		};
		try {
			const response = await fetch('/api/plugins/reports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const result = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			if (!response.ok)
				throw new Error(result?.error ?? 'The report could not be sent');
			setSent(true);
		} catch (sendError) {
			setError(
				sendError instanceof Error
					? sendError.message
					: 'The report could not be sent'
			);
		} finally {
			setSending(false);
		}
	};

	return (
		<Dialog onOpenChange={close} open={open}>
			<DialogContent className='border border-zinc-800 bg-zinc-950 p-5 sm:max-w-[480px]'>
				{sent ? (
					<div className='flex flex-col gap-3' role='status'>
						<CircleCheck aria-hidden className='size-8 text-emerald-400' />

						<DialogTitle>Thanks, Shiko will check it</DialogTitle>

						<DialogDescription>
							{`If it's harmful, Shiko turns it off everywhere and you'll get a notification.${
								isOwner
									? ` If you're worried now, you can turn ${pluginName} off in the Plugins panel.`
									: ''
							}`}
						</DialogDescription>

						<Button className='self-end' onClick={() => close(false)}>
							Done
						</Button>
					</div>
				) : (
					<div className='flex flex-col gap-4'>
						<DialogHeader>
							<DialogTitle>{`Report ${pluginName}`}</DialogTitle>

							<DialogDescription>
								Shiko reviews every report. The author doesn&apos;t see who sent
								it.
							</DialogDescription>
						</DialogHeader>

						<fieldset className='flex flex-col gap-1'>
							<legend className='mb-1 text-xs text-text-secondary'>
								What&apos;s wrong?
							</legend>

							{PLUGIN_REPORT_REASONS.map((option) => (
								<label
									key={option}
									className={cn(
										'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-200 transition-colors duration-200 ease',
										reason === option
											? 'bg-primary-500/12'
											: 'hover:bg-white/[0.04]'
									)}
								>
									<input
										checked={reason === option}
										className='accent-primary-500'
										name={`${ids}-reason`}
										onChange={() => setReason(option)}
										type='radio'
									/>

									{PLUGIN_REPORT_REASON_LABELS[option]}
								</label>
							))}
						</fieldset>

						<label
							className='flex flex-col gap-1 text-xs text-text-secondary'
							htmlFor={`${ids}-details`}
						>
							What happened? (optional)
							<Textarea
								id={`${ids}-details`}
								maxLength={2000}
								onChange={(event) => setDetails(event.target.value)}
								placeholder='The card text changed to an ad after I moved it'
								rows={3}
								value={details}
							/>
						</label>

						{nodeData && (
							<label className='flex items-start gap-2 text-[13px] leading-[18px] text-zinc-200'>
								<input
									checked={attach}
									className='mt-0.5 size-4 shrink-0 accent-primary-500'
									onChange={(event) => setAttach(event.target.checked)}
									type='checkbox'
								/>
								Attach the selected node&apos;s plugin data so Shiko can
								reproduce it (only this node, never the rest of the map)
							</label>
						)}

						{error && (
							<p className='text-xs text-error-500' role='alert'>
								{error}
							</p>
						)}

						<div className='flex justify-end gap-2'>
							<Button onClick={() => close(false)} variant='outline'>
								Cancel
							</Button>

							<Button disabled={sending} onClick={() => void send()}>
								{sending ? (
									<Loader2
										aria-label='Sending'
										className='size-4 animate-spin'
									/>
								) : (
									'Send report'
								)}
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
