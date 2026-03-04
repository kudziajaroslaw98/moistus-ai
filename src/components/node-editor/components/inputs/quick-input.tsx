'use client';

import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import useAppStore from '@/store/mind-map-store';
import type { MentionableUser } from '@/types/notification';
import { slugifyCollaborator } from '@/utils/collaborator-utils';
import { AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FC,
	type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { processNodeTypeSwitch } from '../../core/commands/command-executor';
import { commandRegistry } from '../../core/commands/command-registry';
import {
	getNodeSpecificParsingPatterns,
	getNodeTypeConfig,
	getUniversalParsingPatterns,
} from '../../core/config/node-type-config';
import { parseInput } from '../../core/parsers/pattern-extractor';
import { announceToScreenReader } from '../../core/utils/text-utils';
import {
	createOrUpdateNode,
	transformNodeToQuickInputString,
} from '../../node-updater';
import type { CollaboratorMention } from '../../integrations/codemirror/completions';
import type { QuickInputProps } from '../../types';
import { ActionBar } from '../action-bar';
import { ComponentHeader } from '../component-header';
import { ErrorDisplay } from '../error-display';
import { ExamplesSection } from '../examples-section';
import { ParentNodeReference } from '../parent-node-reference';
import { ParsingLegend } from '../parsing-legend';
import { PreviewSection } from '../preview-section';
import { EnhancedInput } from './enhanced-input';

const theme = {
	container: 'p-4',
	hint: 'text-xs text-zinc-500 mt-2',
};

// Helper function to determine if we should auto-process node type switch
const shouldAutoProcessSwitch = (
	text: string,
	currentNodeType?: string
): boolean => {
	// Check if text contains a node type trigger (e.g., $task, $note) anywhere
	// Pattern matches $command followed by space or end of string
	const nodeTypeTriggerPattern = /\$(\w+)(\s|$)/;
	const match = text.match(nodeTypeTriggerPattern);

	if (!match) return false;

	// Validate the trigger is a complete, valid command
	const trigger = `$${match[1]}`;
	const command = commandRegistry.getCommandByTrigger(trigger);

	return !!command?.nodeType;
};

export const QuickInput: FC<QuickInputProps> = ({
	nodeType: initialNodeType,
	parentNode,
	position,
	mode = 'create',
	existingNode,
}) => {
	// Local UI state
	const [preview, setPreview] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);

	const [referenceMetadata, setReferenceMetadata] = useState<{
		targetNodeId?: string;
		targetMapId?: string;
		targetMapTitle?: string;
		contentSnippet?: string;
	} | null>(null);
	const lastProcessedText = useRef('');

	const [legendCollapsed, setLegendCollapsed] = useState(
		() => localStorage.getItem('parsingLegendCollapsed') === 'true'
	);
	const [universalLegendCollapsed, setUniversalLegendCollapsed] = useState(
		() => localStorage.getItem('parsingLegendUniversalCollapsed') === 'true'
	);
	const [nodeSpecificLegendCollapsed, setNodeSpecificLegendCollapsed] =
		useState(
			() =>
				localStorage.getItem('parsingLegendNodeSpecificCollapsed') === 'true'
		);

	// Zustand state for persistence across remounts
	const {
		quickInputValue: value,
		quickInputNodeType: currentNodeType,
		quickInputCursorPosition: cursorPosition,
		setQuickInputValue: setValue,
		setQuickInputNodeType: setCurrentNodeType,
		setQuickInputCursorPosition: setCursorPosition,
		initializeQuickInput,
		currentShares,
		mapId,
	} = useAppStore(
		useShallow((state) => ({
			quickInputValue: state.quickInputValue,
			quickInputNodeType: state.quickInputNodeType,
			quickInputCursorPosition: state.quickInputCursorPosition,
			setQuickInputValue: state.setQuickInputValue,
			setQuickInputNodeType: state.setQuickInputNodeType,
			setQuickInputCursorPosition: state.setQuickInputCursorPosition,
			initializeQuickInput: state.initializeQuickInput,
			currentShares: state.currentShares,
			mapId: state.mapId,
		}))
	);

	const { closeNodeEditor, addNode, updateNode } = useAppStore(
		useShallow((state) => ({
			closeNodeEditor: state.closeNodeEditor,
			addNode: state.addNode,
			updateNode: state.updateNode,
		}))
	);

	const effectiveNodeType = currentNodeType || initialNodeType || 'defaultNode';
	const config = useMemo(
		() => getNodeTypeConfig(effectiveNodeType),
		[effectiveNodeType]
	);
	const universalPatterns = useMemo(
		() => getUniversalParsingPatterns(effectiveNodeType),
		[effectiveNodeType]
	);
	const nodeSpecificPatterns = useMemo(
		() => getNodeSpecificParsingPatterns(effectiveNodeType),
		[effectiveNodeType]
	);
	const hasSyntaxPatterns =
		universalPatterns.length > 0 || nodeSpecificPatterns.length > 0;

	const collaborators = useMemo<CollaboratorMention[]>(
		() => {
			if (mentionableUsers.length > 0) {
				return mentionableUsers.map((user) => ({
					slug: user.slug,
					displayName: user.displayName,
					avatarUrl: user.avatarUrl ?? '',
					role:
						user.role === 'owner' || user.role === 'editor'
							? 'editor'
							: 'viewer',
				}));
			}

			return (currentShares ?? []).map((u) => {
				const slug = slugifyCollaborator(u);
				const role: CollaboratorMention['role'] =
					u.share.role === 'owner' || u.share.role === 'editor'
						? 'editor'
						: 'viewer';
				return {
					slug,
					displayName: u.profile?.display_name || u.name || slug,
					avatarUrl: u.avatar_url ?? '',
					role,
				};
			});
		},
		[currentShares, mentionableUsers]
	);

	const mentionSlugToUserId = useMemo(() => {
		const map = new Map<string, string>();
		if (mentionableUsers.length > 0) {
			for (const user of mentionableUsers) {
				if (user.slug) {
					map.set(user.slug.toLowerCase(), user.userId);
				}
			}
			return map;
		}

		for (const share of currentShares ?? []) {
			const slug = slugifyCollaborator(share);
			if (slug) {
				map.set(slug.toLowerCase(), share.user_id);
			}
		}
		return map;
	}, [mentionableUsers, currentShares]);

	useEffect(() => {
		if (!mapId) {
			setMentionableUsers([]);
			return;
		}

		const abortController = new AbortController();
		const fetchMentionableUsers = async () => {
			try {
				const response = await fetch(`/api/maps/${mapId}/mentionable-users`, {
					signal: abortController.signal,
				});
				if (!response.ok) {
					return;
				}
				const result = await response.json();
				if (result?.status === 'success' && Array.isArray(result?.data?.users)) {
					setMentionableUsers(result.data.users as MentionableUser[]);
				}
			} catch (error) {
				if ((error as Error).name === 'AbortError') {
					return;
				}
				console.warn('[quick-input] failed to load mentionable users', error);
			}
		};

		void fetchMentionableUsers();
		return () => abortController.abort();
	}, [mapId]);

	// Check node limit (only affects create mode)
	const { isAtLimit, usage, limits } = useSubscriptionLimits();
	const isAtNodeLimit = mode === 'create' && isAtLimit('nodesPerMap');
	const nodeLimitInfo =
		limits.nodesPerMap !== -1
			? { current: usage.nodesPerMap, max: limits.nodesPerMap }
			: undefined;

	// Initialize QuickInput state when component mounts or mode changes
	useEffect(() => {
		if (mode === 'edit' && existingNode) {
			// Edit mode: initialize with existing node content (only once)
			const nodeType = initialNodeType || 'defaultNode';
			const initialContent = transformNodeToQuickInputString(
				existingNode,
				nodeType
			);
			initializeQuickInput(initialContent, nodeType);
		} else if (mode === 'create') {
			// Create mode: only set initial node type if none exists
			// Don't override user-selected node types from $nodeType switching
			if (!currentNodeType && initialNodeType) {
				setCurrentNodeType(initialNodeType);
			}
			// Don't reset value in create mode to preserve user input across remounts
		}
	}, [
		mode,
		existingNode?.id,
		initialNodeType,
		initializeQuickInput,
		setCurrentNodeType,
	]);

	// Save legend preference
	useEffect(() => {
		localStorage.setItem('parsingLegendCollapsed', String(legendCollapsed));
	}, [legendCollapsed]);
	useEffect(() => {
		localStorage.setItem(
			'parsingLegendUniversalCollapsed',
			String(universalLegendCollapsed)
		);
	}, [universalLegendCollapsed]);
	useEffect(() => {
		localStorage.setItem(
			'parsingLegendNodeSpecificCollapsed',
			String(nodeSpecificLegendCollapsed)
		);
	}, [nodeSpecificLegendCollapsed]);

	// Handle keyboard shortcut for legend toggle
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === '/') {
				e.preventDefault();
				setLegendCollapsed(!legendCollapsed);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [legendCollapsed]);

	// Process node type switches automatically (legacy fallback only)
	useEffect(() => {
		if (!value || !currentNodeType || lastProcessedText.current === value) {
			return;
		}

		// Only use legacy processing if commands are disabled or as fallback
		// The primary processing should happen via CodeMirror events
		if (shouldAutoProcessSwitch(value, currentNodeType)) {
			const processed = processNodeTypeSwitch(value);

			if (
				processed.hasSwitch &&
				processed.nodeType &&
				processed.nodeType !== currentNodeType
			) {
				// Update node type and clean text
				setCurrentNodeType(processed.nodeType as AvailableNodeTypes);
				setValue(processed.processedText);
				lastProcessedText.current = processed.processedText;

				// Announce the change
				const nodeTypeName = processed.nodeType
					.replace('Node', '')
					.toLowerCase();
				announceToScreenReader(`Switched to ${nodeTypeName} node type`);

				// Update cursor position if needed
				setCursorPosition(processed.cursorPosition);
				return;
			}
		}

		lastProcessedText.current = value;
	}, [
		value,
		cursorPosition,
		currentNodeType,
		setCurrentNodeType,
		setValue,
		setCursorPosition,
	]);

	// Parse input in real-time for preview using current node type
	useEffect(() => {
		// Clean the input by removing any $nodeType command (e.g., $task, $note) from anywhere
		const cleanValue = value.replace(/\$\w+\s*/, '').trim();

		if (!cleanValue) {
			setPreview(null);
			setError(null);
			return;
		}

		try {
			const parsed = parseInput(cleanValue);

			// Enhance preview with reference metadata for reference nodes
			if (effectiveNodeType === 'referenceNode' && referenceMetadata) {
				const enhancedPreview = {
					...parsed,
					referencePreview: {
						targetMapTitle: referenceMetadata.targetMapTitle,
						contentSnippet: referenceMetadata.contentSnippet,
					},
				};
				setPreview(enhancedPreview);
			} else {
				setPreview(parsed);
			}

			setError(null);
		} catch {
			setPreview(null);
			setError('Invalid input format');
		}
	}, [value, effectiveNodeType, referenceMetadata]);

	// Handle node creation with current node type
	const handleCreate = useCallback(async () => {
		// Guard: same checks as ActionBar canCreate prop
		if (value.trim().length === 0 || isAtNodeLimit || isCreating) return;

		try {
			setIsCreating(true);

			// Clean the input by removing any $nodeType command from anywhere
			const cleanValue = value.replace(/\$\w+\s*/, '').trim() || value;

			// Parse the input
			const nodeData = parseInput(cleanValue);
			const rawAssignees = Array.isArray(nodeData.metadata?.assignee)
				? nodeData.metadata.assignee
				: typeof nodeData.metadata?.assignee === 'string'
					? [nodeData.metadata.assignee]
					: [];
			const assigneeUserIds = Array.from(
				new Set(
					rawAssignees
						.filter((assignee): assignee is string => typeof assignee === 'string')
						.map((assignee) => mentionSlugToUserId.get(assignee.toLowerCase()))
						.filter((userId): userId is string => Boolean(userId))
				)
			);
			if (assigneeUserIds.length > 0) {
				nodeData.metadata = {
					...(nodeData.metadata || {}),
					assigneeUserIds,
				};
			}

			// Merge reference metadata for reference nodes
			if (effectiveNodeType === 'referenceNode' && referenceMetadata) {
				Object.assign(nodeData.metadata, {
					targetNodeId: referenceMetadata.targetNodeId,
					targetMapId: referenceMetadata.targetMapId,
					targetMapTitle: referenceMetadata.targetMapTitle,
					contentSnippet: referenceMetadata.contentSnippet,
				});
			}

			const result = await createOrUpdateNode({
				nodeType: effectiveNodeType,
				data: nodeData,
				mode,
				position,
				parentNode,
				existingNode,
				addNode,
				updateNode,
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to save node');
			}

			if (mapId && assigneeUserIds.length > 0) {
				void fetch('/api/notifications/emit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						events: [
							{
								type: 'node_mention',
								mapId,
								recipientUserIds: assigneeUserIds,
								nodeId: mode === 'edit' ? existingNode?.id : undefined,
								nodeContent: cleanValue,
							},
						],
					}),
				}).catch((notificationError: unknown) => {
					console.warn(
						'[quick-input] failed to emit node mention notification',
						notificationError
					);
				});
			}

			// Close the editor after successful creation/update
			closeNodeEditor();
		} catch (err) {
			console.error('Error creating/updating node:', err);
			setError(
				`An error occurred while ${mode === 'edit' ? 'updating' : 'creating'} the node`
			);
		} finally {
			setIsCreating(false);
		}
	}, [
		value,
		effectiveNodeType,
		position,
		parentNode,
		addNode,
		updateNode,
		closeNodeEditor,
		isCreating,
		isAtNodeLimit,
		mode,
		existingNode,
		referenceMetadata,
		mapId,
		mentionSlugToUserId,
	]);

	// Handle pattern insertion from legend
	const handlePatternInsert = useCallback(
		(pattern: string, insertText?: string) => {
			const textToInsert = insertText || pattern;
			// This would need access to the textarea ref from InputSection
			// For now, we'll append to the end of the value
			const newValue = value + textToInsert;
			setValue(newValue);

			// Announce insertion to screen readers
			announceToScreenReader(`Pattern ${pattern} inserted at cursor position`);
		},
		[value]
	);

	// Handle selection change
	const handleSelectionChange = useCallback(() => {
		// This would need access to the textarea ref from InputSection
		// For now, we'll track cursor position differently
		setCursorPosition(value.length);
	}, [value, setCursorPosition]);

	// Handle node type change from enhanced input (CodeMirror events)
	const handleNodeTypeChange = useCallback(
		(nodeType: AvailableNodeTypes) => {
			if (nodeType !== currentNodeType) {
				setCurrentNodeType(nodeType);

				// Update lastProcessedText to prevent legacy processing from interfering
				lastProcessedText.current = value;

				// Announce the change
				const nodeTypeName = nodeType.replace('Node', '').toLowerCase();
				announceToScreenReader(`Switched to ${nodeTypeName} node type`);
			}
		},
		[currentNodeType, value]
	);

	// Handle command execution from enhanced input
	const handleCommandExecuted = useCallback((commandData: any) => {
		if (commandData.id === 'reference-selected') {
			// Handle reference selection
			const referenceData = commandData.result;
			setReferenceMetadata({
				targetNodeId: referenceData.targetNodeId,
				targetMapId: referenceData.targetMapId,
				targetMapTitle: referenceData.targetMapTitle,
				contentSnippet: referenceData.contentSnippet,
			});
			announceToScreenReader(
				`Selected reference: ${referenceData.contentSnippet?.slice(0, 50) || 'Unknown content'}`
			);
		}
	}, []);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleCreate();
				return;
			}
		},
		[handleCreate]
	);

	// Handle example usage
	const handleUseExample = useCallback((example: string) => {
		setValue(example);
	}, []);

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className={theme.container}
			exit={{ opacity: 0, scale: 0.95 }}
			initial={{ opacity: 0, scale: 0.95 }}
			layoutId={config.label}
			transition={{ duration: 0.2, ease: 'easeOut' as const }}
		>
			<ComponentHeader icon={config.icon} label={config.label} />

			{/* Parent reference when creating a child node */}
			{parentNode && <ParentNodeReference parentNode={parentNode} />}

			{/* Input and Preview Side by Side - Fixed 50/50 Layout */}
			<div className='flex flex-col sm:flex-row items-stretch gap-3 sm:max-h-[400px] h-auto'>
				<EnhancedInput
					animate={{ opacity: 1, y: 0 }}
					className='min-w-0 mt-5 w-full sm:w-sm h-auto'
					collaborators={collaborators}
					disabled={isCreating}
					enableCommands={true}
					initial={{ opacity: 1, y: -20 }}
					onChange={setValue}
					onCommandExecuted={handleCommandExecuted}
					onKeyDown={handleKeyDown}
					onNodeTypeChange={handleNodeTypeChange}
					onSelectionChange={handleSelectionChange}
					placeholder={`Type naturally... ${config.examples?.[0] || ''}`}
					transition={{ duration: 0.25, ease: 'easeOut' as const }}
					value={value}
					whileFocus={{
						scale: 1.01,
						transition: { duration: 0.2 },
					}}
				/>

				<PreviewSection
					className='hidden sm:block'
					hasInput={value.trim().length > 0}
					nodeType={effectiveNodeType}
					preview={preview}
				/>
			</div>

			{/* Parsing Legend */}
			<AnimatePresence>
				{hasSyntaxPatterns && (
					<motion.div
						animate={{ opacity: 1, height: 'auto', y: 0 }}
						className='mt-3'
						exit={{ opacity: 0, height: 0, y: -20 }}
						initial={{ opacity: 0, height: 0, y: -20 }}
						transition={{
							duration: 0.2,
							delay: 0.1,
							ease: 'easeInOut' as const,
						}}
					>
						<ParsingLegend
							isCollapsed={legendCollapsed}
							isNodeSpecificCollapsed={nodeSpecificLegendCollapsed}
							isUniversalCollapsed={universalLegendCollapsed}
							nodeSpecificPatterns={nodeSpecificPatterns}
							onPatternClick={handlePatternInsert}
							onToggleCollapse={() => setLegendCollapsed(!legendCollapsed)}
							onToggleNodeSpecificCollapse={() =>
								setNodeSpecificLegendCollapsed(!nodeSpecificLegendCollapsed)
							}
							onToggleUniversalCollapse={() =>
								setUniversalLegendCollapsed(!universalLegendCollapsed)
							}
							universalPatterns={universalPatterns}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Show hint for nodes without patterns */}
			<AnimatePresence>
				{!hasSyntaxPatterns && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='mt-3 text-xs text-zinc-500'
						exit={{ opacity: 0, y: -10 }}
						initial={{ opacity: 0, y: -10 }}
						transition={{
							delay: 0.05,
							duration: 0.3,
							ease: 'easeOut' as const,
						}}
					>
						<p>
							This node type accepts plain text input without special syntax.
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			<ExamplesSection
				examples={config.examples || []}
				hasValue={value.length > 0}
				onUseExample={handleUseExample}
			/>

			<ErrorDisplay error={error} />

			{/* Node limit warning */}
			{isAtNodeLimit && nodeLimitInfo && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className='flex items-center gap-2 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400'
				>
					<AlertCircle className='w-4 h-4 shrink-0' />
					<span className='text-sm'>
						Node limit reached ({nodeLimitInfo.current}/{nodeLimitInfo.max}).
						Upgrade to Pro for unlimited nodes.
					</span>
				</motion.div>
			)}

			<ActionBar
				canCreate={value.trim().length > 0 && !isAtNodeLimit}
				isCreating={isCreating}
				mode={mode}
				onCreate={handleCreate}
			/>
		</motion.div>
	);
};
