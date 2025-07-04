import { ActiveUsers } from '@/components/realtime/active-users';
import { ConflictResolutionModal } from '@/components/realtime/conflict-resolution-modal';
import { ConnectionStatus } from '@/components/realtime/connection-status';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRealtimeForm } from '@/hooks/realtime/use-realtime-form';
import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { FieldActivityStack } from '../realtime/field-activity-stack';

interface DefaultNodeFormProps {
	initialData: Partial<NodeData>;
	nodeId: string;
	onConflict?: (conflict: any) => void;
}

interface DefaultNodeFormRef {
	getFormData: () => Partial<NodeData> | null;
	forceSync: () => void;
}

const DefaultNodeForm = forwardRef<DefaultNodeFormRef, DefaultNodeFormProps>(
	({ initialData, nodeId, onConflict }, ref) => {
		// Get current user for presence tracking
		const { currentUser } = useAppStore(
			useShallow((state) => ({
				currentUser: state.currentUser,
			}))
		);

		// Initialize real-time form hook
		const {
			updateField,
			getFieldValue,
			isConnected,
			activeUsers,
			conflicts,
			resolveConflict,
			trackFieldBlur,
			trackFieldFocus,
		} = useRealtimeForm(`form:${nodeId}`, 'newest-timestamp');

		// Local state for form initialization (hybrid approach)
		const [isInitialized, setIsInitialized] = useState(false);
		const [showConflictModal, setShowConflictModal] = useState(false);

		// Initialize form data with real-time sync
		useEffect(() => {
			if (!isInitialized && initialData) {
				// Initialize real-time form with initial data
				if (initialData.content !== undefined) {
					updateField('content', initialData.content || '', nodeId);
				}
				if (initialData.tags !== undefined) {
					updateField('tags', initialData.tags || [], nodeId);
				}
				if (initialData.status !== undefined) {
					updateField('status', initialData.status, nodeId);
				}
				if (initialData.importance !== undefined) {
					updateField('importance', initialData.importance, nodeId);
				}
				if (initialData.sourceUrl !== undefined) {
					updateField('sourceUrl', initialData.sourceUrl || '', nodeId);
				}
				setIsInitialized(true);
			}
		}, [initialData, isInitialized, updateField, nodeId]);

		// Handle conflicts if callback provided
		useEffect(() => {
			if (onConflict && conflicts.length > 0) {
				conflicts.forEach(onConflict);
			}
			// Show conflict modal when conflicts are detected
			setShowConflictModal(conflicts.length > 0);
		}, [conflicts, onConflict]);

		useImperativeHandle(ref, () => ({
			getFormData: () => {
				const content = getFieldValue('content') || '';
				const tags = getFieldValue('tags') || [];
				const status = getFieldValue('status');
				const importance = getFieldValue('importance');
				const sourceUrl = getFieldValue('sourceUrl') || '';

				const formData: Partial<NodeData> = {
					content: content.trim() === '' ? null : content.trim(),
					tags: tags.length > 0 ? tags : undefined,
					status: status || undefined,
					importance: importance ?? undefined,
					sourceUrl: sourceUrl.trim() === '' ? undefined : sourceUrl.trim(),
				};
				return formData;
			},
			forceSync: () => {
				// Force sync by updating all fields with current values
				const fieldNames = [
					'content',
					'tags',
					'status',
					'importance',
					'sourceUrl',
				];
				fieldNames.forEach((fieldName) => {
					const value = getFieldValue(fieldName);
					if (value !== undefined) {
						updateField(fieldName, value, nodeId);
					}
				});
			},
		}));

		// Get current field values from real-time state
		const content = getFieldValue('content') || '';
		const tags = getFieldValue('tags') || [];
		const status = getFieldValue('status');
		const importance = getFieldValue('importance');
		const sourceUrl = getFieldValue('sourceUrl') || '';

		// Helper function to get user color for field indicators

		return (
			<>
				<div className='flex flex-col gap-6'>
					{/* Real-time collaboration header */}
					<div className='flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800'>
						<div className='flex items-center gap-4'>
							<ConnectionStatus isConnected={isConnected} showLabel={true} />
							<ActiveUsers
								users={activeUsers}
								currentUserId={currentUser?.id}
								maxDisplay={3}
							/>
						</div>
						{conflicts.length > 0 && (
							<div className='text-xs text-amber-500 flex items-center gap-2'>
								<div className='w-2 h-2 bg-amber-500 rounded-full animate-pulse' />
								{conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
							</div>
						)}
					</div>

					{/* General Content Field */}
					<FormField
						id='defaultNodeContent'
						label='Content'
						avatarStacks={
							<FieldActivityStack
								fieldName={'content'}
								size='sm'
								showLabels={false}
							/>
						}
					>
						<Textarea
							id='defaultNodeContent'
							value={content}
							onChange={(e) => updateField('content', e.target.value, nodeId)}
							onFocus={() => trackFieldFocus('content', nodeId)}
							onBlur={() => trackFieldBlur('content', nodeId)}
							placeholder='Enter node content...'
							className='min-h-[150px]'
						/>
					</FormField>

					{/* General Node Properties Section */}
					<div>
						<h3 className='text-md mb-2 font-semibold text-zinc-200'>
							Properties
						</h3>

						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
							{/* Tags Input */}
							<FormField
								id='defaultNodeTags'
								label='Tags (comma-separated)'
								avatarStacks={
									<FieldActivityStack
										fieldName={'tags'}
										size='sm'
										showLabels={false}
									/>
								}
							>
								<Input
									id='defaultNodeTags'
									type='text'
									value={tags.join(', ')}
									onChange={(e) => {
										const newTags = e.target.value
											.split(',')
											.map((tag) => tag.trim())
											.filter((tag) => tag.length > 0);
										updateField('tags', newTags, nodeId);
									}}
									onFocus={() => trackFieldFocus('tags', nodeId)}
									onBlur={() => trackFieldBlur('tags', nodeId)}
									placeholder='e.g. idea, research'
								/>
							</FormField>

							{/* Status Select */}
							<FormField
								id='defaultNodeStatus'
								label='Status'
								avatarStacks={
									<FieldActivityStack
										fieldName={'status'}
										size='sm'
										showLabels={false}
									/>
								}
							>
								<Select
									value={status || ''}
									onValueChange={(value) =>
										updateField('status', value, nodeId)
									}
									onOpenChange={(open) =>
										open
											? trackFieldFocus('status', nodeId)
											: trackFieldBlur('status', nodeId)
									}
								>
									<SelectTrigger className='bg-zinc-900 border-zinc-700'>
										<SelectValue placeholder='Select Status' />
									</SelectTrigger>

									<SelectContent>
										<SelectItem value='draft'>Draft</SelectItem>

										<SelectItem value='in-progress'>In Progress</SelectItem>

										<SelectItem value='completed'>Completed</SelectItem>

										<SelectItem value='on-hold'>On Hold</SelectItem>
									</SelectContent>
								</Select>
							</FormField>

							{/* Importance Input */}
							<FormField
								id='defaultNodeImportance'
								label='Importance (1-5)'
								avatarStacks={
									<FieldActivityStack
										fieldName={'importance'}
										size='sm'
										showLabels={false}
									/>
								}
							>
								<Input
									id='defaultNodeImportance'
									type='number'
									value={Number.isFinite(importance) ? importance : ''}
									onChange={(e) => {
										const value = parseInt(e.target.value, 10);
										updateField(
											'importance',
											isNaN(value) ? undefined : value,
											nodeId
										);
									}}
									onFocus={() => trackFieldFocus('importance', nodeId)}
									onBlur={() => trackFieldBlur('importance', nodeId)}
									min='1'
									max='5'
									step='1'
									placeholder='3'
								/>
							</FormField>

							{/* Source URL Input */}
							<FormField
								id='defaultNodeSourceUrl'
								label='Source URL'
								avatarStacks={
									<FieldActivityStack
										fieldName={'sourceUrl'}
										size='sm'
										showLabels={false}
									/>
								}
							>
								<Input
									id='defaultNodeSourceUrl'
									type='url'
									value={sourceUrl}
									onChange={(e) =>
										updateField('sourceUrl', e.target.value, nodeId)
									}
									onFocus={() => trackFieldFocus('sourceUrl', nodeId)}
									onBlur={() => trackFieldBlur('sourceUrl', nodeId)}
									placeholder='http://example.com'
								/>
							</FormField>
						</div>
					</div>
				</div>

				{/* Conflict Resolution Modal */}
				<ConflictResolutionModal
					conflicts={conflicts}
					onResolve={resolveConflict}
					onClose={() => setShowConflictModal(false)}
					isOpen={showConflictModal}
				/>
			</>
		);
	}
);

DefaultNodeForm.displayName = 'DefaultNodeForm';

export default DefaultNodeForm;
