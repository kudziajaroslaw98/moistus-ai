'use client';

import {
	TemplatePicker,
	type PickedTemplate,
} from '@/components/dashboard/template-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Panel,
	PanelField,
	PanelFooterActions,
	PanelFooterNote,
	PanelSection,
	panelButtonClass,
	panelInputClass,
	panelTextareaClass,
} from '@/components/ui/panel';
import { Textarea } from '@/components/ui/textarea';
import { useTouchFirst } from '@/hooks/use-touch-first';
import { cn } from '@/utils/cn';
import { Loader2, Plus } from 'lucide-react';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

interface CreateMapDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		title: string;
		description?: string;
		templateId?: string;
	}) => Promise<void>;
	disabled?: boolean;
	/** Opens with this template slug selected and its name as the title. */
	initialTemplate?: { templateId: string; name: string } | null;
}

function validateTitle(value: string): string | null {
	const trimmed = value.trim();

	if (!trimmed) return 'Title is required';

	if (trimmed.length > TITLE_MAX_LENGTH) {
		return `Title must be ${TITLE_MAX_LENGTH} characters or less`;
	}

	return null;
}

/**
 * New-map panel: name the map, then optionally start from a template. A modal
 * `Panel` like Map settings, so it looks and behaves like every other drawer.
 * (The name says "dialog" because that is what the dashboard calls it.)
 */
export function CreateMapDialog({
	open,
	onOpenChange,
	onSubmit,
	disabled = false,
	initialTemplate = null,
}: CreateMapDialogProps) {
	const [selectedTemplate, setSelectedTemplate] =
		useState<PickedTemplate | null>(null);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [titleTouched, setTitleTouched] = useState(false);

	const titleInputRef = useRef<HTMLInputElement>(null);
	const isTouchFirst = useTouchFirst();
	const formId = useId();
	const titleId = useId();
	const titleErrorId = useId();
	const descriptionId = useId();
	const descriptionErrorId = useId();

	// Reset the form when the panel closes, and start with the template chosen
	// outside the panel (dashboard template chips) selected. Both adjust state
	// during render (not in an effect) to avoid an extra pass.
	const [wasOpen, setWasOpen] = useState(open);
	const [appliedTemplate, setAppliedTemplate] =
		useState<CreateMapDialogProps['initialTemplate']>(null);
	if (open !== wasOpen) {
		setWasOpen(open);

		if (!open) {
			setSelectedTemplate(null);
			setTitle('');
			setDescription('');
			setTitleTouched(false);
			setAppliedTemplate(null);
		}
	}
	if (open && initialTemplate && appliedTemplate !== initialTemplate) {
		setAppliedTemplate(initialTemplate);
		setSelectedTemplate(initialTemplate);
		setTitle(initialTemplate.name);
	}

	// Focus the title once the panel has slid in. On touch devices that would
	// open the keyboard over the template list, so leave focus alone there.
	useEffect(() => {
		if (!open || isTouchFirst) return;

		const timer = setTimeout(() => titleInputRef.current?.focus(), 100);

		return () => clearTimeout(timer);
	}, [open, isTouchFirst]);

	const titleError = validateTitle(title);
	const descriptionTooLong = description.length > DESCRIPTION_MAX_LENGTH;
	const isDisabled = disabled || isSubmitting;
	const canSubmit = !titleError && !descriptionTooLong && !isDisabled;
	const showTitleError = titleTouched && titleError;

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();

		if (titleError) {
			setTitleTouched(true);
			titleInputRef.current?.focus();
			return;
		}

		if (descriptionTooLong || isDisabled) return;

		setIsSubmitting(true);

		try {
			await onSubmit({
				title: title.trim(),
				description: description.trim() || undefined,
				templateId: selectedTemplate?.templateId,
			});
		} catch {
			// Error handling done in parent, keep the panel open.
		} finally {
			setIsSubmitting(false);
		}
	};

	const footer = (
		<>
			<PanelFooterNote className='truncate'>
				{selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Blank map'}
			</PanelFooterNote>

			<PanelFooterActions>
				<Button
					className={panelButtonClass}
					disabled={isSubmitting}
					onClick={() => onOpenChange(false)}
					type='button'
					variant='ghost'
				>
					Cancel
				</Button>

				<Button
					aria-busy={isSubmitting}
					className={panelButtonClass}
					disabled={!canSubmit}
					form={formId}
					type='submit'
				>
					{isSubmitting ? (
						<>
							<Loader2 className='mr-2 size-4 animate-spin' />
							Creating...
						</>
					) : (
						<>
							<Plus className='mr-2 size-4' />
							Create map
						</>
					)}
				</Button>
			</PanelFooterActions>
		</>
	);

	return (
		<Panel
			data-testid='create-map-panel'
			footer={footer}
			onOpenChange={onOpenChange}
			open={open}
			title='New map'
			width='lg'
		>
			<form id={formId} onSubmit={handleSubmit}>
				<PanelSection
					description='Give it a name. You can change both later in Map settings.'
					label='Details'
				>
					<PanelField
						required
						count={{ value: title.length, max: TITLE_MAX_LENGTH }}
						error={showTitleError ? titleError : undefined}
						errorId={titleErrorId}
						htmlFor={titleId}
						label='Title'
					>
						<Input
							aria-describedby={showTitleError ? titleErrorId : undefined}
							aria-invalid={Boolean(showTitleError)}
							aria-required='true'
							className={panelInputClass}
							disabled={isDisabled}
							error={Boolean(showTitleError)}
							id={titleId}
							onBlur={() => setTitleTouched(true)}
							onChange={(event) => setTitle(event.target.value)}
							placeholder='My new mind map'
							ref={titleInputRef}
							type='text'
							value={title}
						/>
					</PanelField>

					<PanelField
						count={{ value: description.length, max: DESCRIPTION_MAX_LENGTH }}
						errorId={descriptionErrorId}
						htmlFor={descriptionId}
						label='Description'
						error={
							descriptionTooLong
								? `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`
								: undefined
						}
						hint={
							descriptionTooLong
								? undefined
								: 'Optional. Shown on the map card in your dashboard.'
						}
					>
						<Textarea
							aria-invalid={descriptionTooLong}
							className={cn(panelTextareaClass, 'mt-0 resize-none')}
							disabled={isDisabled}
							error={descriptionTooLong}
							id={descriptionId}
							placeholder='What is this mind map about?'
							rows={3}
							value={description}
							aria-describedby={
								descriptionTooLong ? descriptionErrorId : undefined
							}
							onChange={(event) =>
								setDescription(
									event.target.value.slice(0, DESCRIPTION_MAX_LENGTH + 50)
								)
							}
						/>
					</PanelField>
				</PanelSection>

				<TemplatePicker
					onSelectTemplate={setSelectedTemplate}
					selectedTemplateId={selectedTemplate?.templateId ?? null}
				/>
			</form>
		</Panel>
	);
}
