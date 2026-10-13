'use client';

import { DeleteMapConfirmationDialog } from '@/components/mind-map/delete-map-confirmation-dialog';
import { DiscardSettingsChangesDialog } from '@/components/mind-map/discard-settings-changes-dialog';
import { PublishTemplateDialog } from '@/components/mind-map/publish-template-dialog';
import {
	TemplateSettingsSection,
	type TemplateSettingsValue,
} from '@/components/mind-map/template-settings-section';
import { DeveloperModeSetting } from '@/components/plugins/developer-mode-switch';
import { PluginsSettingsLink } from '@/components/plugins/plugins-settings-link';
import { NodeTypeSelector } from '@/components/settings/node-type-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Panel,
	PanelField,
	PanelFooterActions,
	PanelFooterNote,
	PanelRow,
	PanelSection,
	panelButtonClass,
	panelButtonSmClass,
	panelInputClass,
	panelTextareaClass,
} from '@/components/ui/panel';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import {
	TEMPLATE_CATEGORY_VALUES,
	type TemplateCategoryValue,
} from '@/constants/template-options';
import useAppStore from '@/store/mind-map-store';
import type { MindMapUpdates } from '@/types/mind-map-data';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
	const {
		mindMap,
		updateMindMap,
		deleteMindMap,
		loadingStates,
		nodes,
		edges,
		updatePreferences,
		getDefaultNodeType,
		openPluginsPanel,
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
			openPluginsPanel: state.openPluginsPanel,
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
		if (!isOpen || !isTemplateAdmin || !mapId) return;

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
			// Clear on close or map change so a reopened panel never shows the last map's values.
			setTemplateSettings(null);
			setInitialTemplateSettings(null);
		};
	}, [isOpen, isTemplateAdmin, mapId, mapTemplateCategory]);

	// Track changes
	useEffect(() => {
		setHasChanges(computeHasChanges());
	}, [computeHasChanges]);

	// Runs once the panel has closed (after a discard if there were unsaved edits).
	const afterCloseRef = useRef<(() => void) | null>(null);

	const finishClose = () => {
		const after = afterCloseRef.current;
		afterCloseRef.current = null;
		onClose();
		after?.();
	};

	const requestCloseThen = (after: (() => void) | null) => {
		if (isSaving) return;
		afterCloseRef.current = after;
		if (computeHasChanges()) {
			setShowDiscardDialog(true);
			return;
		}
		finishClose();
	};

	const requestClose = () => requestCloseThen(null);

	const handleDiscardChanges = () => {
		setShowDiscardDialog(false);
		finishClose();
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
		<>
			<PanelFooterNote>{footerStatus}</PanelFooterNote>

			<PanelFooterActions>
				<Button
					className={panelButtonClass}
					disabled={isSaving}
					onClick={requestClose}
					variant='ghost'
				>
					Close
				</Button>

				<Button
					className={panelButtonClass}
					disabled={!hasChanges || !isFormValid || isSaving}
					onClick={handleSave}
				>
					{isSaving ? (
						<>
							<Loader2 className='mr-2 size-4 animate-spin' />
							Saving...
						</>
					) : (
						'Save changes'
					)}
				</Button>
			</PanelFooterActions>
		</>
	);

	return (
		<>
			<Panel
				footer={footer}
				onOpenChange={(open) => {
					if (!open) requestClose();
				}}
				open={isOpen}
				subtitle={mindMap.title}
				title='Map settings'
			>
				<PanelSection
					description='Name and describe your mind map for easier discovery.'
					label='General'
				>
					<PanelField
						count={{ value: titleCharCount, max: TITLE_MAX_LENGTH }}
						error={titleTouched && !isTitleValid ? titleError : undefined}
						errorId={titleErrorId}
						htmlFor='title'
						label='Title'
						required
					>
						<Input
							aria-describedby={
								titleTouched && !isTitleValid ? titleErrorId : undefined
							}
							aria-invalid={titleTouched && !isTitleValid}
							className={panelInputClass}
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
					</PanelField>

					<PanelField
						count={{ value: descriptionCharCount, max: DESCRIPTION_MAX_LENGTH }}
						error={
							descriptionTouched && !isDescriptionValid
								? descriptionError
								: undefined
						}
						errorId={descriptionErrorId}
						hint='Optional summary shown in the dashboard and share views.'
						htmlFor='description'
						label='Description'
					>
						<Textarea
							aria-describedby={
								descriptionTouched && !isDescriptionValid
									? descriptionErrorId
									: undefined
							}
							aria-invalid={descriptionTouched && !isDescriptionValid}
							className={cn(panelTextareaClass, 'mt-0 resize-none')}
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
					</PanelField>
				</PanelSection>

				{isTemplateAdmin && (
					<PanelSection
						description='Admin only. Controls how this template appears in the template gallery.'
						label='Template'
					>
						<TemplateSettingsSection
							disabled={isSaving}
							onChange={setTemplateSettings}
							value={templateSettings}
						/>
					</PanelSection>
				)}

				<PanelSection
					description='Use tags to group related maps and improve search.'
					label='Organization'
				>
					<PanelField
						hint='Press Enter or comma to add tags.'
						htmlFor='tags'
						label='Tags'
					>
						<TagInput
							className={isSaving ? 'pointer-events-none opacity-60' : ''}
							maxTags={20}
							onChange={(tags) => setFormData({ ...formData, tags })}
							placeholder='Add tags...'
							value={formData.tags}
						/>
					</PanelField>
				</PanelSection>

				<PanelSection
					description='A preview image used in map cards and link previews.'
					label='Appearance'
				>
					<PanelField
						error={
							thumbnailTouched && !isThumbnailValid ? thumbnailError : undefined
						}
						errorId={thumbnailErrorId}
						hint='Optional preview image for your mind map.'
						htmlFor='thumbnail'
						label='Thumbnail URL'
					>
						<Input
							aria-describedby={
								thumbnailTouched && !isThumbnailValid
									? thumbnailErrorId
									: undefined
							}
							aria-invalid={thumbnailTouched && !isThumbnailValid}
							className={panelInputClass}
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
					</PanelField>
				</PanelSection>

				{isAdmin && !mindMap.is_template && (
					<PanelSection
						description='Admin only. Publish a copy of this map as a template for all users.'
						label='Template gallery'
					>
						<Button
							className={cn(panelButtonClass, 'w-full')}
							disabled={isSaving}
							onClick={() => setShowPublishDialog(true)}
							variant='outline'
						>
							Publish as template
						</Button>
					</PanelSection>
				)}

				{/* Plugins (owner only): managed in the Plugins panel */}
				<PluginsSettingsLink onManage={() => requestCloseThen(openPluginsPanel)} />

				<PanelSection
					description='These preferences apply to all maps you edit.'
					label='Editor preferences'
				>
					<PanelField
						hint='The type new nodes get in the node editor.'
						label='Default node type'
					>
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
							onChange={(value) => updatePreferences({ defaultNodeType: value })}
						/>
					</PanelField>

					<div className='mt-4'>
						<DeveloperModeSetting id='map-settings-developer-mode' />
					</div>
				</PanelSection>

				<PanelSection label='Danger zone'>
					<PanelRow
						title={mindMap.is_template ? 'Delete template' : 'Delete mind map'}
						tone='danger'
						description={
							mindMap.is_template
								? 'Removes this template from the gallery for everyone. Maps already created from it are not affected.'
								: 'Permanently removes this map, its nodes and its history.'
						}
						trailing={
							<Button
								className={cn(panelButtonSmClass, 'gap-1.5')}
								disabled={isDeleting}
								onClick={() => setShowDeleteDialog(true)}
								state='destructive'
								variant='outline'
							>
								{isDeleting ? (
									<>
										<Loader2 className='size-3.5 animate-spin' />
										Deleting...
									</>
								) : (
									'Delete'
								)}
							</Button>
						}
					/>
				</PanelSection>
			</Panel>

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
				onDiscardChanges={handleDiscardChanges}
				onOpenChange={setShowDiscardDialog}
				open={showDiscardDialog}
				onContinueEditing={() => {
					afterCloseRef.current = null;
					setShowDiscardDialog(false);
				}}
			/>
		</>
	);
}
