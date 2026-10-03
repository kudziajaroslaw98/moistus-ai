'use client';

import {
	TemplateSettingsSection,
	type TemplateSettingsValue,
} from '@/components/mind-map/template-settings-section';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_TEMPLATE_PREVIEW_COLORS } from '@/constants/template-options';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PublishTemplateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sourceMapId: string;
	defaultTitle: string;
	defaultDescription: string | null;
}

const DEFAULT_SETTINGS: TemplateSettingsValue = {
	category: null,
	icon: 'Lightbulb',
	previewColors: DEFAULT_TEMPLATE_PREVIEW_COLORS,
};

/**
 * Admin-only: publishes a copy of the current map as a system template.
 * The source map is left untouched.
 */
export function PublishTemplateDialog({
	open,
	onOpenChange,
	sourceMapId,
	defaultTitle,
	defaultDescription,
}: PublishTemplateDialogProps) {
	const [title, setTitle] = useState(defaultTitle);
	const [description, setDescription] = useState(defaultDescription ?? '');
	const [settings, setSettings] =
		useState<TemplateSettingsValue>(DEFAULT_SETTINGS);
	const [isPublishing, setIsPublishing] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTitle(defaultTitle);
		setDescription(defaultDescription ?? '');
		setSettings(DEFAULT_SETTINGS);
	}, [open, defaultTitle, defaultDescription]);

	const trimmedTitle = title.trim();
	const canPublish =
		trimmedTitle.length > 0 && settings.category !== null && !isPublishing;

	const handlePublish = async () => {
		if (!canPublish) return;
		setIsPublishing(true);

		try {
			const response = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sourceMapId,
					title: trimmedTitle,
					description: description.trim() || null,
					category: settings.category,
					icon: settings.icon,
					previewColors: settings.previewColors,
				}),
			});
			const result = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(result?.error || 'Failed to publish template.');
			}

			const templateId: string | undefined = result?.data?.templateId;
			toast.success('Template published', {
				description: 'It is now visible in the template gallery.',
				action: templateId
					? {
							label: 'Open template',
							onClick: () => {
								window.location.href = `/mind-map/${templateId}`;
							},
						}
					: undefined,
			});
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to publish template.'
			);
		} finally {
			setIsPublishing(false);
		}
	};

	return (
		<Dialog
			dismissible={!isPublishing}
			onOpenChange={onOpenChange}
			open={open}
		>
			<DialogContent
				className='border border-border-subtle bg-base p-4 shadow-2xl backdrop-blur-sm sm:max-w-[480px]'
				showCloseButton={!isPublishing}
			>
				<DialogHeader>
					<DialogTitle className='text-lg font-semibold text-text-primary'>
						Publish as template
					</DialogTitle>

					<DialogDescription className='text-text-secondary'>
						Creates a copy of this map in the template gallery for all users.
						Your map stays unchanged.
					</DialogDescription>
				</DialogHeader>

				<div className='mt-2 space-y-4'>
					<div className='space-y-2'>
						<Label className='text-text-primary' htmlFor='publish-template-title'>
							Template name <span className='text-error-500'>*</span>
						</Label>

						<Input
							disabled={isPublishing}
							id='publish-template-title'
							maxLength={255}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>

					<div className='space-y-2'>
						<Label
							className='text-text-primary'
							htmlFor='publish-template-description'
						>
							Description
						</Label>

						<Textarea
							className='resize-none'
							disabled={isPublishing}
							id='publish-template-description'
							maxLength={2000}
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<TemplateSettingsSection
						disabled={isPublishing}
						onChange={setSettings}
						value={settings}
					/>
				</div>

				<DialogFooter className='mt-4 gap-2'>
					<Button
						disabled={isPublishing}
						onClick={() => onOpenChange(false)}
						variant='ghost'
					>
						Cancel
					</Button>

					<Button disabled={!canPublish} onClick={handlePublish}>
						{isPublishing ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Publishing...
							</>
						) : (
							'Publish template'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
