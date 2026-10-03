'use client';

import { DeleteMapConfirmationDialog } from '@/components/mind-map/delete-map-confirmation-dialog';
import { DiscardSettingsChangesDialog } from '@/components/mind-map/discard-settings-changes-dialog';
import { PublishTemplateDialog } from '@/components/mind-map/publish-template-dialog';
import {
	TemplateSettingsSection,
	type TemplateSettingsValue,
} from '@/components/mind-map/template-settings-section';
import { NodeTypeSelector } from '@/components/settings/node-type-selector';
import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import {
	TEMPLATE_CATEGORY_VALUES,
	type TemplateCategoryValue,
} from '@/constants/template-options';
import useAppStore from '@/store/mind-map-store';
import type { MindMapUpdates } from '@/types/mind-map-data';
import { AlertTriangle, LayoutTemplate, Loader2, PenTool, Save } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 2000;

interface MapSettingsPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

interface FormData {
	title: string;
	description: string;
	tags: string[];
	thumbnailUrl: string;
}

interface SectionMotionProps {
	initial: false | { opacity: number; y?: number };
	animate: { opacity: number; y?: number };
	transition: { delay: number; duration: number; ease?: 'easeOut' };
}

function normalizeText(value: string | null | undefined): string {
	return (value || '').trim();
}

function toTemplateCategory(
	value: string | null | undefined
): TemplateCategoryValue | null {
	return TEMPLATE_CATEGORY_VALUES.includes(value as TemplateCategoryValue)
		? (value as TemplateCategoryValue)
		: null;
}

function isSameTemplateSettings(
	a: TemplateSettingsValue | null,
	b: TemplateSettingsValue | null
): boolean {
	if (!a || !b) return a === b;
	return (
		a.category === b.category &&
		a.icon === b.icon &&
		JSON.stringify(a.previewColors) === JSON.stringify(b.previewColors)
	);
}

function isValidUrl(value: string): boolean {
	if (!value) return true;

	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export function MapSettingsPanel({ isOpen, onClose }: MapSettingsPanelProps) {
	const shouldReduceMotion = useReducedMotion();

	const {
		mindMap,
		updateMindMap,
		deleteMindMap,
		loadingStates,
		nodes,
		edges,
		updatePreferences,
		getDefaultNodeType,
		canEditMap,
		isAdmin,
	} = useAppStore(
		useShallow((state) => ({
			mindMap: state.mindMap,
			updateMindMap: state.updateMindMap,
			deleteMindMap: state.deleteMindMap,
			loadingStates: state.loadingStates,
			nodes: state.nodes,
			edges: state.edges,
			updatePreferences: state.updatePreferences,
			getDefaultNodeType: state.getDefaultNodeType,
			canEditMap: Boolean(state.permissions?.can_edit),
			isAdmin: state.userProfile?.role === 'admin',
		}))
	);

	// Only admins receive can_edit on system templates (see /api/maps/[id]/permissions).
	const isTemplateAdmin = Boolean(mindMap?.is_template) && canEditMap;
	const [templateSettings, setTemplateSettings] =
		useState<TemplateSettingsValue | null>(null);
	const [initialTemplateSettings, setInitialTemplateSettings] =
		useState<TemplateSettingsValue | null>(null);

	const [formData, setFormData] = useState<FormData>({
		title: '',
		description: '',
		tags: [],
		thumbnailUrl: '',
	});

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showDiscardDialog, setShowDiscardDialog] = useState(false);
	const [showPublishDialog, setShowPublishDialog] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [titleTouched, setTitleTouched] = useState(false);
	const [descriptionTouched, setDescriptionTouched] = useState(false);
	const [thumbnailTouched, setThumbnailTouched] = useState(false);

	const titleCharCount = formData.title.length;
	const descriptionCharCount = formData.description.length;

	const normalizedTitle = normalizeText(formData.title);
	const normalizedDescription = normalizeText(formData.description);
	const normalizedThumbnail = normalizeText(formData.thumbnailUrl);

	const isTitleValid =
		normalizedTitle.length > 0 && titleCharCount <= TITLE_MAX_LENGTH;
	const isDescriptionValid = descriptionCharCount <= DESCRIPTION_MAX_LENGTH;
	const isThumbnailValid = isValidUrl(normalizedThumbnail);
	const isFormValid = isTitleValid && isDescriptionValid && isThumbnailValid;

	const titleError =
		normalizedTitle.length === 0
			? 'Title is required'
			: `Title must be ${TITLE_MAX_LENGTH} characters or less`;
	const descriptionError = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`;
	const thumbnailError = 'Please enter a valid URL (including https://)';
	const titleErrorId = 'title-error';
	const descriptionErrorId = 'description-error';
	const thumbnailErrorId = 'thumbnail-error';

	const getSectionMotionProps = (delay: number): SectionMotionProps => {
		if (shouldReduceMotion) {
			return {
				initial: { opacity: 1 },
				animate: { opacity: 1 },
				transition: { delay: 0, duration: 0 },
			};
		}

		return {
			initial: { opacity: 0, y: 10 },
			animate: { opacity: 1, y: 0 },
			transition: { delay, duration: 0.25, ease: 'easeOut' },
		};
	};

	/**
	 * Computes whether save/discard controls should be enabled.
	 * Normalizes title/description/thumbnail via `normalizeText`, compares tags
	 * with `JSON.stringify(formData.tags)` against `JSON.stringify(mindMap.tags || [])`,
	 * and returns `false` when `mindMap` is unavailable.
	 */
	const computeHasChanges = useCallback((): boolean => {
		if (!mindMap) return false;

		const initialTitle = normalizeText(mindMap.title);
		const initialDescription = normalizeText(mindMap.description);
		const initialThumbnail = normalizeText(mindMap.thumbnailUrl);

		return (
			normalizedTitle !== initialTitle ||
			normalizedDescription !== initialDescription ||
			JSON.stringify(formData.tags) !== JSON.stringify(mindMap.tags || []) ||
			normalizedThumbnail !== initialThumbnail ||
			!isSameTemplateSettings(templateSettings, initialTemplateSettings)
		);
	}, [
		formData.tags,
		initialTemplateSettings,
		mindMap,
		templateSettings,
		normalizedDescription,
		normalizedThumbnail,
		normalizedTitle,
	]);

	// Initialize form data from mindMap
	useEffect(() => {
		if (mindMap && isOpen) {
			setFormData({
				title: mindMap.title || '',
				description: mindMap.description || '',
				tags: mindMap.tags || [],
				thumbnailUrl: mindMap.thumbnailUrl || '',
			});
			setHasChanges(false);
			setShowDiscardDialog(false);
			setTitleTouched(false);
			setDescriptionTouched(false);
			setThumbnailTouched(false);
		}
	}, [mindMap, isOpen]);

	// Template metadata (icon/preview colors) lives in mind_maps.metadata, which the
	// editor's map payload doesn't carry, so admins load it from the template API.
	const mapId = mindMap?.id;
	const mapTemplateCategory = mindMap?.template_category;
	useEffect(() => {
		if (!isOpen || !isTemplateAdmin || !mapId) {
			setTemplateSettings(null);
			setInitialTemplateSettings(null);
			return;
		}

		let cancelled = false;
		const fallback: TemplateSettingsValue = {
			category: toTemplateCategory(mapTemplateCategory),
			icon: 'FileText',
			previewColors: ['#6366f1', '#8b5cf6', '#a855f7'],
		};

		fetch(`/api/templates/${mapId}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((result) => {
				if (cancelled) return;
				const template = result?.data?.template;
				const loaded: TemplateSettingsValue = template
					? {
							category: toTemplateCategory(template.category),
							icon: template.icon || fallback.icon,
							previewColors: Array.isArray(template.previewColors)
								? template.previewColors
								: fallback.previewColors,
						}
					: fallback;
				setTemplateSettings(loaded);
				setInitialTemplateSettings(loaded);
			})
			.catch(() => {
				if (cancelled) return;
				setTemplateSettings(fallback);
				setInitialTemplateSettings(fallback);
			});

		return () => {
			cancelled = true;
		};
	}, [isOpen, isTemplateAdmin, mapId, mapTemplateCategory]);

	// Track changes
	useEffect(() => {
		setHasChanges(computeHasChanges());
	}, [computeHasChanges]);

	const requestClose = () => {
		if (isSaving) return;
		if (computeHasChanges()) {
			setShowDiscardDialog(true);
			return;
		}
		onClose();
	};

	const handleDiscardChanges = () => {
		setShowDiscardDialog(false);
		onClose();
	};

	const handleSave = async () => {
		if (!mindMap) return;

		setTitleTouched(true);
		setDescriptionTouched(true);
		setThumbnailTouched(true);
		const hasLatestChanges = computeHasChanges();
		if (!hasLatestChanges || !isFormValid || isSaving) return;

		// Build updates object (only changed fields)
		const updates: MindMapUpdates = {};
		const currentTitle = normalizeText(mindMap.title);
		const currentDescription = normalizeText(mindMap.description);
		const currentThumbnail = normalizeText(mindMap.thumbnailUrl);

		if (normalizedTitle !== currentTitle) updates.title = normalizedTitle;
		if (normalizedDescription !== currentDescription)
			updates.description = normalizedDescription || null;
		if (JSON.stringify(formData.tags) !== JSON.stringify(mindMap.tags || []))
			updates.tags = formData.tags;
		if (normalizedThumbnail !== currentThumbnail)
			updates.thumbnailUrl = normalizedThumbnail || null;
		if (isTemplateAdmin && templateSettings && initialTemplateSettings) {
			if (
				templateSettings.category &&
				templateSettings.category !== initialTemplateSettings.category
			)
				updates.template_category = templateSettings.category;
			if (templateSettings.icon !== initialTemplateSettings.icon)
				updates.template_icon = templateSettings.icon;
			if (
				JSON.stringify(templateSettings.previewColors) !==
				JSON.stringify(initialTemplateSettings.previewColors)
			)
				updates.template_preview_colors = templateSettings.previewColors;
		}

		await updateMindMap(mindMap.id, updates);
		setInitialTemplateSettings(templateSettings);
		setFormData((prev) => ({
			...prev,
			title: normalizedTitle,
			description: normalizedDescription,
			thumbnailUrl: normalizedThumbnail,
		}));
		setHasChanges(false);
	};

	const handleDelete = async () => {
		if (!mindMap) return;
		await deleteMindMap(mindMap.id);
		setShowDeleteDialog(false);
		onClose();
	};

	const isSaving = loadingStates.isUpdatingMapSettings;
	const isDeleting = loadingStates.isDeletingMap;
	const footerStatus = hasChanges
		? isFormValid
			? 'You have unsaved changes'
			: 'Fix validation errors to save changes'
		: 'All changes are saved';

	if (!mindMap) return null;

	const footer = (
		<div className='flex items-center justify-between gap-3'>
			<p className='text-sm text-text-secondary'>{footerStatus}</p>

			<div className='flex gap-2'>
				<Button disabled={isSaving} onClick={requestClose} variant='ghost'>
					Close
				</Button>

				<Button
					className='min-w-25'
					disabled={!hasChanges || !isFormValid || isSaving}
					onClick={handleSave}
				>
					{isSaving ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Saving...
						</>
					) : (
						<>
							<Save className='mr-2 h-4 w-4' />
							Save Changes
						</>
					)}
				</Button>
			</div>
		</div>
	);

	return (
		<>
			<SidePanel
				footer={footer}
				isOpen={isOpen}
				onClose={requestClose}
				title='Map Settings'
			>
				{/* Scrollable Content */}
				<div className='flex flex-col gap-5 p-6'>
					{/* General Section */}
					<motion.section
						{...getSectionMotionProps(0)}
						className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
					>
						<div className='space-y-1'>
							<h3 className='text-lg font-semibold text-text-primary'>
								General
							</h3>
							<p className='text-xs text-text-secondary'>
								Name and describe your mind map for easier discovery.
							</p>
						</div>

						<div className='space-y-2'>
							<div className='flex items-center justify-between gap-3'>
								<Label className='text-text-primary' htmlFor='title'>
									Title <span className='text-error-500'>*</span>
								</Label>
								<span
									className={`text-xs tabular-nums ${
										titleCharCount > TITLE_MAX_LENGTH
											? 'text-error-500'
											: 'text-text-secondary'
									}`}
								>
									{titleCharCount}/{TITLE_MAX_LENGTH}
								</span>
							</div>

							<Input
								aria-invalid={titleTouched && !isTitleValid}
								aria-describedby={
									titleTouched && !isTitleValid ? titleErrorId : undefined
								}
								disabled={isSaving}
								error={titleTouched && !isTitleValid}
								id='title'
								placeholder='My Mind Map'
								value={formData.title}
								onBlur={() => setTitleTouched(true)}
								onChange={(e) =>
									setFormData({ ...formData, title: e.target.value })
								}
							/>

							{titleTouched && !isTitleValid && (
								<p
									className='text-xs text-error-500'
									id={titleErrorId}
									role='alert'
								>
									{titleError}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<div className='flex items-center justify-between gap-3'>
								<Label className='text-text-primary' htmlFor='description'>
									Description
								</Label>
								<span
									className={`text-xs tabular-nums ${
										descriptionCharCount > DESCRIPTION_MAX_LENGTH
											? 'text-error-500'
											: 'text-text-secondary'
									}`}
								>
									{descriptionCharCount}/{DESCRIPTION_MAX_LENGTH}
								</span>
							</div>

							<Textarea
								aria-invalid={descriptionTouched && !isDescriptionValid}
								aria-describedby={
									descriptionTouched && !isDescriptionValid
										? descriptionErrorId
										: undefined
								}
								className='resize-none'
								disabled={isSaving}
								error={descriptionTouched && !isDescriptionValid}
								id='description'
								placeholder='Describe your mind map...'
								rows={4}
								value={formData.description}
								onBlur={() => setDescriptionTouched(true)}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
							/>

							<p className='text-xs text-text-secondary'>
								Optional summary shown in the dashboard and share views.
							</p>

							{descriptionTouched && !isDescriptionValid && (
								<p
									className='text-xs text-error-500'
									id={descriptionErrorId}
									role='alert'
								>
									{descriptionError}
								</p>
							)}
						</div>
					</motion.section>

					{isTemplateAdmin && (
						<motion.section
							{...getSectionMotionProps(0.025)}
							className='space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4'
						>
							<div className='space-y-1'>
								<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
									<LayoutTemplate className='size-5 text-primary' />
									Template
								</h3>

								<p className='text-xs text-text-secondary'>
									Admin only. Controls how this template appears in the
									template gallery.
								</p>
							</div>

							<TemplateSettingsSection
								disabled={isSaving}
								onChange={setTemplateSettings}
								value={templateSettings}
							/>
						</motion.section>
					)}

					{/* Organization Section */}
					<motion.section
						{...getSectionMotionProps(0.05)}
						className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
					>
						<div className='space-y-1'>
							<h3 className='text-lg font-semibold text-text-primary'>
								Organization
							</h3>
							<p className='text-xs text-text-secondary'>
								Use tags to group related maps and improve search.
							</p>
						</div>

						<div className='space-y-2'>
							<Label className='text-text-primary' htmlFor='tags'>
								Tags
							</Label>

							<TagInput
								className={isSaving ? 'pointer-events-none opacity-60' : ''}
								maxTags={20}
								onChange={(tags) => setFormData({ ...formData, tags })}
								placeholder='Add tags...'
								value={formData.tags}
							/>

							<p className='text-xs text-text-secondary'>
								Press Enter or comma to add tags
							</p>
						</div>
					</motion.section>

					{/* Appearance Section */}
					<motion.section
						{...getSectionMotionProps(0.1)}
						className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
					>
						<div className='space-y-1'>
							<h3 className='text-lg font-semibold text-text-primary'>
								Appearance
							</h3>
							<p className='text-xs text-text-secondary'>
								Set a preview image URL used in map cards and metadata previews.
							</p>
						</div>

						<div className='space-y-2'>
							<Label className='text-text-primary' htmlFor='thumbnail'>
								Thumbnail URL
							</Label>

							<Input
								aria-invalid={thumbnailTouched && !isThumbnailValid}
								aria-describedby={
									thumbnailTouched && !isThumbnailValid
										? thumbnailErrorId
										: undefined
								}
								disabled={isSaving}
								error={thumbnailTouched && !isThumbnailValid}
								id='thumbnail'
								placeholder='https://example.com/thumbnail.jpg'
								type='url'
								value={formData.thumbnailUrl}
								onBlur={() => setThumbnailTouched(true)}
								onChange={(e) =>
									setFormData({ ...formData, thumbnailUrl: e.target.value })
								}
							/>

							<p className='text-xs text-text-secondary'>
								Optional preview image for your mind map
							</p>

							{thumbnailTouched && !isThumbnailValid && (
								<p
									className='text-xs text-error-500'
									id={thumbnailErrorId}
									role='alert'
								>
									{thumbnailError}
								</p>
							)}
						</div>
					</motion.section>

					{isAdmin && !mindMap.is_template && (
						<motion.section
							{...getSectionMotionProps(0.125)}
							className='space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4'
						>
							<div className='space-y-1'>
								<h3 className='flex items-center gap-2 text-lg font-semibold text-text-primary'>
									<LayoutTemplate className='size-5 text-primary' />
									Template Gallery
								</h3>

								<p className='text-xs text-text-secondary'>
									Admin only. Publish a copy of this map as a template for all
									users.
								</p>
							</div>

							<Button
								className='w-full'
								disabled={isSaving}
								onClick={() => setShowPublishDialog(true)}
								variant='outline'
							>
								Publish as template
							</Button>
						</motion.section>
					)}

					{/* Editor Preferences Section */}
					<motion.section
						{...getSectionMotionProps(0.15)}
						className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
					>
						<h3 className='text-lg font-semibold text-text-primary flex items-center gap-2'>
							<PenTool className='size-5 text-primary' />
							Editor Preferences
						</h3>

						<p className='text-xs text-text-secondary'>
							These preferences apply to all maps you edit.
						</p>

						<div className='space-y-4 rounded-lg border border-border-subtle bg-base p-4'>
							<div className='space-y-2'>
								<Label className='text-text-primary'>Default Node Type</Label>
								<p className='text-xs text-text-secondary'>
									The default type for new nodes when using the node editor
									(applies to all maps)
								</p>
								<NodeTypeSelector
									disabled={isSaving}
									value={
										getDefaultNodeType() as
											| 'defaultNode'
											| 'textNode'
											| 'taskNode'
											| 'imageNode'
											| 'resourceNode'
											| 'questionNode'
											| 'codeNode'
											| 'annotationNode'
											| 'referenceNode'
									}
									onChange={(value) =>
										updatePreferences({ defaultNodeType: value })
									}
								/>
							</div>
						</div>
					</motion.section>

					{/* Danger Zone */}
					<motion.section
						{...getSectionMotionProps(0.2)}
						className='space-y-4 rounded-lg border border-error-800/30 bg-error-950/20 p-4'
					>
						<div className='flex items-start gap-3'>
							<div className='flex-1 space-y-3'>
								<div>
									<div className='flex gap-2 items-center'>
										<AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-error-500' />

										<h3 className='text-lg font-semibold text-error-500'>
											Danger Zone
										</h3>
									</div>

									<p className='text-sm text-error-300/70'>
										{mindMap.is_template
											? 'Deleting this template removes it from the gallery for everyone. Maps already created from it are not affected.'
											: 'Irreversible actions that affect this mind map'}
									</p>
								</div>

								<Button
									className='w-full bg-error-600 hover:bg-error-700'
									disabled={isDeleting}
									onClick={() => setShowDeleteDialog(true)}
									variant='normal' state='destructive'
								>
									{isDeleting ? (
										<>
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											Deleting...
										</>
									) : mindMap.is_template ? (
										'Delete Template'
									) : (
										'Delete Mind Map'
									)}
								</Button>
							</div>
						</div>
					</motion.section>
				</div>
			</SidePanel>

			{/* Delete Confirmation Dialog */}
			<DeleteMapConfirmationDialog
				edgeCount={edges.length}
				isDeleting={isDeleting}
				mapTitle={mindMap.title}
				nodeCount={nodes.length}
				onConfirm={handleDelete}
				onOpenChange={setShowDeleteDialog}
				open={showDeleteDialog}
			/>

			{isAdmin && !mindMap.is_template && (
				<PublishTemplateDialog
					defaultDescription={mindMap.description}
					defaultTitle={mindMap.title}
					onOpenChange={setShowPublishDialog}
					open={showPublishDialog}
					sourceMapId={mindMap.id}
				/>
			)}

			<DiscardSettingsChangesDialog
				onContinueEditing={() => setShowDiscardDialog(false)}
				onDiscardChanges={handleDiscardChanges}
				onOpenChange={setShowDiscardDialog}
				open={showDiscardDialog}
			/>
		</>
	);
}
