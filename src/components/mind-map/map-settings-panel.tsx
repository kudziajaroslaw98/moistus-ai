'use client';

import { DeleteMapConfirmationDialog } from '@/components/mind-map/delete-map-confirmation-dialog';
import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import useAppStore from '@/store/mind-map-store';
import type { MindMapData } from '@/types/mind-map-data';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface MapSettingsPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

interface FormData {
	title: string;
	description: string;
	tags: string[];
	thumbnailUrl: string;
	team_id: string | null;
	is_template: boolean;
	template_category: string;
}

export function MapSettingsPanel({ isOpen, onClose }: MapSettingsPanelProps) {
	const { mindMap, updateMindMap, deleteMindMap, loadingStates, nodes, edges } =
		useAppStore(
			useShallow((state) => ({
				mindMap: state.mindMap,
				updateMindMap: state.updateMindMap,
				deleteMindMap: state.deleteMindMap,
				loadingStates: state.loadingStates,
				nodes: state.nodes,
				edges: state.edges,
			}))
		);

	const [formData, setFormData] = useState<FormData>({
		title: '',
		description: '',
		tags: [],
		thumbnailUrl: '',
		team_id: null,
		is_template: false,
		template_category: '',
	});

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	// Initialize form data from mindMap
	useEffect(() => {
		if (mindMap && isOpen) {
			setFormData({
				title: mindMap.title || '',
				description: mindMap.description || '',
				tags: mindMap.tags || [],
				thumbnailUrl: mindMap.thumbnailUrl || '',
				team_id: mindMap.team_id || null,
				is_template: mindMap.is_template || false,
				template_category: mindMap.template_category || '',
			});
			setHasChanges(false);
		}
	}, [mindMap, isOpen]);

	// Track changes
	useEffect(() => {
		if (!mindMap) return;

		const hasChanged =
			formData.title !== (mindMap.title || '') ||
			formData.description !== (mindMap.description || '') ||
			JSON.stringify(formData.tags) !== JSON.stringify(mindMap.tags || []) ||
			formData.thumbnailUrl !== (mindMap.thumbnailUrl || '') ||
			formData.team_id !== (mindMap.team_id || null) ||
			formData.is_template !== (mindMap.is_template || false) ||
			formData.template_category !== (mindMap.template_category || '');

		setHasChanges(hasChanged);
	}, [formData, mindMap]);

	const handleSave = async () => {
		if (!mindMap || !hasChanges) return;

		// Build updates object (only changed fields)
		const updates: Partial<MindMapData> = {};

		if (formData.title !== mindMap.title) updates.title = formData.title;
		if (formData.description !== (mindMap.description || ''))
			updates.description = formData.description || null;
		if (JSON.stringify(formData.tags) !== JSON.stringify(mindMap.tags || []))
			updates.tags = formData.tags;
		if (formData.thumbnailUrl !== (mindMap.thumbnailUrl || ''))
			updates.thumbnailUrl = formData.thumbnailUrl || null;
		if (formData.team_id !== (mindMap.team_id || null))
			updates.team_id = formData.team_id;
		if (formData.is_template !== (mindMap.is_template || false))
			updates.is_template = formData.is_template;
		if (formData.template_category !== (mindMap.template_category || ''))
			updates.template_category = formData.template_category || null;

		await updateMindMap(mindMap.id, updates);
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

	if (!mindMap) return null;

	const footer = (
		<div className='flex items-center justify-between gap-3'>
			<p className='text-sm text-zinc-500'>
				{hasChanges ? 'You have unsaved changes' : 'All changes are saved'}
			</p>

			<div className='flex gap-2'>
				<Button variant='ghost' onClick={onClose} disabled={isSaving}>
					Close
				</Button>
				<Button
					onClick={handleSave}
					disabled={!hasChanges || !formData.title.trim() || isSaving}
					className='min-w-[100px]'
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
				isOpen={isOpen}
				onClose={onClose}
				title='Map Settings'
				footer={footer}
				className='w-[400px]'
			>
				{/* Scrollable Content */}
				<div className='flex flex-col gap-6 p-6'>
					{/* General Section */}
					<motion.section
						animate={{ opacity: 1, y: 0 }}
						className='space-y-4'
						initial={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.3 }}
					>
						<h3 className='text-lg font-semibold text-zinc-100'>General</h3>

						<div className='space-y-2'>
							<Label htmlFor='title' className='text-zinc-300'>
								Title <span className='text-rose-400'>*</span>
							</Label>
							<Input
								id='title'
								value={formData.title}
								onChange={(e) =>
									setFormData({ ...formData, title: e.target.value })
								}
								placeholder='My Mind Map'
								disabled={isSaving}
								error={!formData.title.trim()}
							/>
							{!formData.title.trim() && (
								<p className='text-xs text-rose-400'>Title is required</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='description' className='text-zinc-300'>
								Description
							</Label>
							<Textarea
								id='description'
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								placeholder='Describe your mind map...'
								rows={3}
								disabled={isSaving}
								className='resize-none'
							/>
						</div>
					</motion.section>

					{/* Organization Section */}
					<motion.section
						animate={{ opacity: 1, y: 0 }}
						className='space-y-4'
						initial={{ opacity: 0, y: 10 }}
						transition={{ delay: 0.1, duration: 0.3 }}
					>
						<h3 className='text-lg font-semibold text-zinc-100'>
							Organization
						</h3>

						<div className='space-y-2'>
							<Label htmlFor='tags' className='text-zinc-300'>
								Tags
							</Label>
							<TagInput
								value={formData.tags}
								onChange={(tags) => setFormData({ ...formData, tags })}
								placeholder='Add tags...'
								maxTags={20}
							/>
							<p className='text-xs text-zinc-500'>
								Press Enter or comma to add tags
							</p>
						</div>
					</motion.section>

					{/* Appearance Section */}
					<motion.section
						animate={{ opacity: 1, y: 0 }}
						className='space-y-4'
						initial={{ opacity: 0, y: 10 }}
						transition={{ delay: 0.2, duration: 0.3 }}
					>
						<h3 className='text-lg font-semibold text-zinc-100'>Appearance</h3>

						<div className='space-y-2'>
							<Label htmlFor='thumbnail' className='text-zinc-300'>
								Thumbnail URL
							</Label>
							<Input
								id='thumbnail'
								type='url'
								value={formData.thumbnailUrl}
								onChange={(e) =>
									setFormData({ ...formData, thumbnailUrl: e.target.value })
								}
								placeholder='https://example.com/thumbnail.jpg'
								disabled={isSaving}
							/>
							<p className='text-xs text-zinc-500'>
								Optional preview image for your mind map
							</p>
						</div>
					</motion.section>

					{/* Template Section */}
					<motion.section
						animate={{ opacity: 1, y: 0 }}
						className='space-y-4'
						initial={{ opacity: 0, y: 10 }}
						transition={{ delay: 0.3, duration: 0.3 }}
					>
						<h3 className='text-lg font-semibold text-zinc-100'>Template</h3>

						<div className='space-y-4'>
							<label className='flex items-start gap-3'>
								<Input
									type='checkbox'
									checked={formData.is_template}
									onChange={(e) =>
										setFormData({
											...formData,
											is_template: e.target.checked,
										})
									}
									disabled={isSaving}
								/>
								<div className='flex-1'>
									<span className='text-sm font-medium text-zinc-300'>
										Mark as template
									</span>
									<p className='text-xs text-zinc-500'>
										Allow others to use this mind map as a starting point
									</p>
								</div>
							</label>

							{formData.is_template && (
								<motion.div
									animate={{ opacity: 1, height: 'auto' }}
									className='space-y-2'
									initial={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.2 }}
								>
									<Label htmlFor='category' className='text-zinc-300'>
										Template Category
									</Label>
									<Input
										id='category'
										value={formData.template_category}
										onChange={(e) =>
											setFormData({
												...formData,
												template_category: e.target.value,
											})
										}
										placeholder='e.g., Project Planning, Brainstorming'
										disabled={isSaving}
									/>
								</motion.div>
							)}
						</div>
					</motion.section>

					{/* Danger Zone */}
					<motion.section
						animate={{ opacity: 1, y: 0 }}
						className='space-y-4 rounded-lg border border-rose-900/50 bg-rose-950/10 p-4'
						initial={{ opacity: 0, y: 10 }}
						transition={{ delay: 0.4, duration: 0.3 }}
					>
						<div className='flex items-start gap-3'>
							<div className='flex-1 space-y-3'>
								<div>
									<div className='flex gap-2 items-center'>
										<AlertTriangle className='mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500' />
										<h3 className='text-lg font-semibold text-rose-400'>
											Danger Zone
										</h3>
									</div>

									<p className='text-sm text-zinc-400'>
										Irreversible actions that affect this mind map
									</p>
								</div>

								<Button
									variant='destructive'
									onClick={() => setShowDeleteDialog(true)}
									disabled={isDeleting}
									className='w-full bg-rose-600 hover:bg-rose-700'
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
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				onConfirm={handleDelete}
				mapTitle={mindMap.title}
				nodeCount={nodes.length}
				edgeCount={edges.length}
				isDeleting={isDeleting}
			/>
		</>
	);
}
