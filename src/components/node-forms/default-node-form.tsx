import { ActiveUsers, getUserColor } from '@/components/realtime/active-users';
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

interface DefaultNodeFormProps {
	initialData: Partial<NodeData>;
	nodeId: string;
	onFieldLock?: (fieldName: string, userId: string) => void;
	onConflict?: (conflict: any) => void;
}

interface DefaultNodeFormRef {
	getFormData: () => Partial<NodeData> | null;
	lockField: (fieldName: string) => void;
	unlockField: (fieldName: string) => void;
	forceSync: () => void;
}

const DefaultNodeForm = forwardRef<DefaultNodeFormRef, DefaultNodeFormProps>(
	({ initialData, nodeId, onFieldLock, onConflict }, ref) => {
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
			getFieldState,
			lockField,
			unlockField,
			isFieldLocked,
			getFieldLocker,
			isConnected,
			activeUsers,
			conflicts,
			resolveConflict,
		} = useRealtimeForm(`node-form-${nodeId}`, 'newest-timestamp');

		// Local state for form initialization (hybrid approach)
		const [isInitialized, setIsInitialized] = useState(false);
		const [showConflictModal, setShowConflictModal] = useState(false);

		// Initialize form data with real-time sync
		useEffect(() => {
			if (!isInitialized && initialData) {
				// Initialize real-time form with initial data
				if (initialData.content !== undefined) {
					updateField('content', initialData.content || '');
				}
				if (initialData.tags !== undefined) {
					updateField('tags', initialData.tags || []);
				}
				if (initialData.status !== undefined) {
					updateField('status', initialData.status);
				}
				if (initialData.importance !== undefined) {
					updateField('importance', initialData.importance);
				}
				if (initialData.sourceUrl !== undefined) {
					updateField('sourceUrl', initialData.sourceUrl || '');
				}
				setIsInitialized(true);
			}
		}, [initialData, isInitialized, updateField]);

		// Handle conflicts if callback provided
		useEffect(() => {
			if (onConflict && conflicts.length > 0) {
				conflicts.forEach(onConflict);
			}
			// Show conflict modal when conflicts are detected
			setShowConflictModal(conflicts.length > 0);
		}, [conflicts, onConflict]);

		// Handle field locks if callback provided
		useEffect(() => {
			if (onFieldLock) {
				const fieldNames = [
					'content',
					'tags',
					'status',
					'importance',
					'sourceUrl',
				];
				fieldNames.forEach((fieldName) => {
					const locker = getFieldLocker(fieldName);
					if (locker && locker !== currentUser?.id) {
						onFieldLock(fieldName, locker);
					}
				});
			}
		}, [activeUsers, onFieldLock, getFieldLocker, currentUser?.id]);

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
			lockField,
			unlockField,
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
						updateField(fieldName, value);
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
		const getFieldUserColor = (fieldName: string) => {
			const locker = getFieldLocker(fieldName);
			return locker ? getUserColor(locker) : '#3b82f6';
		};

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
						isBeingEdited={isFieldLocked('content')}
						editedBy={getFieldLocker('content')}
						userColor={getFieldUserColor('content')}
					>
						<Textarea
							id='defaultNodeContent'
							value={content}
							onChange={(e) => updateField('content', e.target.value)}
							onFocus={() => lockField('content')}
							onBlur={() => unlockField('content')}
							placeholder='Enter node content...'
							className='min-h-[150px]'
							disabled={
								isFieldLocked('content') &&
								getFieldLocker('content') !== currentUser?.id
							}
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
								isBeingEdited={isFieldLocked('tags')}
								editedBy={getFieldLocker('tags')}
								userColor={getFieldUserColor('tags')}
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
										updateField('tags', newTags);
									}}
									onFocus={() => lockField('tags')}
									onBlur={() => unlockField('tags')}
									placeholder='e.g. idea, research'
									disabled={
										isFieldLocked('tags') &&
										getFieldLocker('tags') !== currentUser?.id
									}
								/>
							</FormField>

							{/* Status Select */}
							<FormField
								id='defaultNodeStatus'
								label='Status'
								isBeingEdited={isFieldLocked('status')}
								editedBy={getFieldLocker('status')}
								userColor={getFieldUserColor('status')}
							>
								<Select
									value={status || ''}
									onValueChange={(value) => updateField('status', value)}
									onOpenChange={(open) => {
										if (open) {
											lockField('status');
										} else {
											unlockField('status');
										}
									}}
									disabled={
										isFieldLocked('status') &&
										getFieldLocker('status') !== currentUser?.id
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
								isBeingEdited={isFieldLocked('importance')}
								editedBy={getFieldLocker('importance')}
								userColor={getFieldUserColor('importance')}
							>
								<Input
									id='defaultNodeImportance'
									type='number'
									value={Number.isFinite(importance) ? importance : ''}
									onChange={(e) => {
										const value = parseInt(e.target.value, 10);
										updateField('importance', isNaN(value) ? undefined : value);
									}}
									onFocus={() => lockField('importance')}
									onBlur={() => unlockField('importance')}
									min='1'
									max='5'
									placeholder='e.g. 3'
									disabled={
										isFieldLocked('importance') &&
										getFieldLocker('importance') !== currentUser?.id
									}
								/>
							</FormField>

							{/* Source URL Input */}
							<FormField
								id='defaultNodeSourceUrl'
								label='Source URL'
								isBeingEdited={isFieldLocked('sourceUrl')}
								editedBy={getFieldLocker('sourceUrl')}
								userColor={getFieldUserColor('sourceUrl')}
							>
								<Input
									id='defaultNodeSourceUrl'
									type='url'
									value={sourceUrl}
									onChange={(e) => updateField('sourceUrl', e.target.value)}
									onFocus={() => lockField('sourceUrl')}
									onBlur={() => unlockField('sourceUrl')}
									placeholder='http://example.com'
									disabled={
										isFieldLocked('sourceUrl') &&
										getFieldLocker('sourceUrl') !== currentUser?.id
									}
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
