'use client';

import { DeleteMapConfirmationDialog } from '@/components/mind-map/delete-map-confirmation-dialog';
import { DiscardSettingsChangesDialog } from '@/components/mind-map/discard-settings-changes-dialog';
import { NodeTypeSelector } from '@/components/settings/node-type-selector';
import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import useAppStore from '@/store/mind-map-store';
import type { MindMapData } from '@/types/mind-map-data';
import { AlertTriangle, Loader2, PenTool, Save } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
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

function isValidUrl(value: string): boolean {
	if (!value) return true;

	try {
		new URL(value);
		return true;
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
		}))
	);

	const [formData, setFormData] = useState<FormData>({
		title: '',
		description: '',
		tags: [],
		thumbnailUrl: '',
	});

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showDiscardDialog, setShowDiscardDialog] = useState(false);
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

	// Track changes
	useEffect(() => {
		if (!mindMap) return;

		const initialTitle = normalizeText(mindMap.title);
		const initialDescription = normalizeText(mindMap.description);
		const initialThumbnail = normalizeText(mindMap.thumbnailUrl);

		const hasChanged =
			normalizedTitle !== initialTitle ||
			normalizedDescription !== initialDescription ||
			JSON.stringify(formData.tags) !== JSON.stringify(mindMap.tags || []) ||
			normalizedThumbnail !== initialThumbnail;

		setHasChanges(hasChanged);
	}, [
		formData.tags,
		mindMap,
		normalizedDescription,
		normalizedThumbnail,
		normalizedTitle,
	]);

	const requestClose = () => {
		if (isSaving) return;
		if (hasChanges) {
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
		if (!hasChanges || !isFormValid || isSaving) return;

		// Build updates object (only changed fields)
		const updates: Partial<MindMapData> = {};
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

		await updateMindMap(mindMap.id, updates);
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
								<p className='text-xs text-error-500' role='alert'>
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
								<p className='text-xs text-error-500' role='alert'>
									{descriptionError}
								</p>
							)}
						</div>
					</motion.section>

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
								<p className='text-xs text-error-500' role='alert'>
									{thumbnailError}
								</p>
							)}
						</div>
					</motion.section>

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
										Irreversible actions that affect this mind map
									</p>
								</div>

								<Button
									className='w-full bg-error-600 hover:bg-error-700'
									disabled={isDeleting}
									onClick={() => setShowDeleteDialog(true)}
									variant='destructive'
								>
									{isDeleting ? (
										<>
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											Deleting...
										</>
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

			<DiscardSettingsChangesDialog
				onContinueEditing={() => setShowDiscardDialog(false)}
				onDiscardChanges={handleDiscardChanges}
				onOpenChange={setShowDiscardDialog}
				open={showDiscardDialog}
			/>
		</>
	);
}
