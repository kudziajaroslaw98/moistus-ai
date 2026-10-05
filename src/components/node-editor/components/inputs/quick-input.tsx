'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMapNodeLimit } from '@/hooks/subscription/use-map-node-limit';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTouchFirst } from '@/hooks/use-touch-first';
import { findActivePluginKind } from '@/lib/plugins/active-plugins';
import {
	parsePluginFieldInput,
	serializePluginFieldInput,
	validatePluginData,
} from '@/lib/plugins/plugin-fields';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import useAppStore from '@/store/mind-map-store';
import type { MentionableUser } from '@/types/notification';
import { slugifyCollaborator } from '@/utils/collaborator-utils';
import { AlertCircle, CircleHelp, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FC,
	type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { cn } from '@/utils/cn';
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
	buildMentionMap,
	type CollaboratorMention,
} from '../../integrations/codemirror/completions';
import {
	createOrUpdateNode,
	transformNodeToQuickInputString,
} from '../../node-updater';
import type {
	EditorAutocompleteController,
	EditorAutocompleteState,
	QuickInputProps,
} from '../../types';
import { ActionBar } from '../action-bar';
import { ComponentHeader } from '../component-header';
import { ErrorDisplay } from '../error-display';
import { ExamplesSection } from '../examples-section';
import { ParentNodeReference } from '../parent-node-reference';
import { ParsingLegend } from '../parsing-legend';
import { PreviewSection } from '../preview-section';
import { PluginEditorPreview } from '../preview/plugin-editor-preview';
import { toPluginFieldSpecs } from '../../integrations/codemirror/plugin-fields';
import { buildPluginKindConfig, buildPluginNodeSaveData } from '../../plugin-kind-editor';
import { EnhancedInput } from './enhanced-input';
import { MobileCompletionTray } from './mobile-completion-tray';

const theme = {
	container: 'flex h-full min-h-0 flex-col p-0',
	hint: 'text-xs text-zinc-500 mt-2',
};

type RightPanelTab = 'preview' | 'syntax';

type QuickInputPreview = ReturnType<typeof parseInput> & {
	referencePreview?: {
		targetMapTitle?: string;
		contentSnippet?: string;
	};
};

interface ReferenceCommandData {
	targetNodeId?: string;
	targetMapId?: string;
	targetMapTitle?: string;
	contentSnippet?: string;
}

interface CommandExecutedPayload {
	id: string;
	result?: unknown;
}

function isReferenceCommandData(value: unknown): value is ReferenceCommandData {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Record<string, unknown>;
	return (
		(payload.targetNodeId === undefined ||
			typeof payload.targetNodeId === 'string') &&
		(payload.targetMapId === undefined ||
			typeof payload.targetMapId === 'string') &&
		(payload.targetMapTitle === undefined ||
			typeof payload.targetMapTitle === 'string') &&
		(payload.contentSnippet === undefined ||
			typeof payload.contentSnippet === 'string')
	);
}

function isReferenceSelectedCommand(
	value: unknown
): value is CommandExecutedPayload & {
	id: 'reference-selected';
	result: ReferenceCommandData;
} {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Record<string, unknown>;
	return (
		payload.id === 'reference-selected' &&
		isReferenceCommandData(payload.result)
	);
}

function sanitizeMentionableUsers(users: unknown[]): MentionableUser[] {
	const safeUsers: MentionableUser[] = [];

	for (const user of users) {
		if (!user || typeof user !== 'object') {
			continue;
		}

		const record = user as Record<string, unknown>;
		const userId =
			typeof record.userId === 'string' ? record.userId.trim() : '';
		const slug =
			typeof record.slug === 'string' ? record.slug.trim().toLowerCase() : '';

		if (!userId || !slug) {
			continue;
		}

		const displayName =
			typeof record.displayName === 'string' &&
			record.displayName.trim().length > 0
				? record.displayName.trim()
				: slug;
		const avatarUrl =
			typeof record.avatarUrl === 'string' && record.avatarUrl.trim().length > 0
				? record.avatarUrl.trim()
				: null;
		const role =
			record.role === 'owner' ||
			record.role === 'editor' ||
			record.role === 'commentator' ||
			record.role === 'viewer'
				? record.role
				: 'viewer';

		safeUsers.push({
			userId,
			slug,
			displayName,
			avatarUrl,
			role,
		});
	}

	return safeUsers;
}

// Helper function to determine if we should auto-process node type switch
const shouldAutoProcessSwitch = (text: string): boolean => {
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
	initialValue,
	onboardingSource,
	extensionKind: initialExtensionKind = null,
}) => {
	const isMobile = useIsMobile();
	const isTouchFirst = useTouchFirst();
	const usesTouchAutocompleteSurface = isMobile || isTouchFirst;

	// Local UI state
	const [preview, setPreview] = useState<QuickInputPreview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [autocompleteController, setAutocompleteController] =
		useState<EditorAutocompleteController | null>(null);
	const [autocompleteState, setAutocompleteState] =
		useState<EditorAutocompleteState>({
			status: null,
			options: [],
			selectedIndex: null,
			anchorRect: null,
			editorRect: null,
		});
	const [isEditorFocused, setIsEditorFocused] = useState(false);
	const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>(
		[]
	);

	const [referenceMetadata, setReferenceMetadata] = useState<{
		targetNodeId?: string;
		targetMapId?: string;
		targetMapTitle?: string;
		contentSnippet?: string;
	} | null>(null);
	const lastProcessedText = useRef('');

	const [legendCollapsed, setLegendCollapsed] = useState(false);
	const [universalLegendCollapsed, setUniversalLegendCollapsed] =
		useState(false);
	const [nodeSpecificLegendCollapsed, setNodeSpecificLegendCollapsed] =
		useState(false);
	const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview');

	// Zustand state for persistence across remounts
	const {
		quickInputValue: value,
		quickInputNodeType: currentNodeType,
		quickInputExtensionKind: currentExtensionKind,
		quickInputCursorPosition: cursorPosition,
		setQuickInputValue: setValue,
		setQuickInputNodeType: setCurrentNodeType,
		setQuickInputCursorPosition: setCursorPosition,
		initializeQuickInput,
		currentShares,
		mapId,
		loadedPlugins,
	} = useAppStore(
		useShallow((state) => ({
			quickInputValue: state.quickInputValue,
			quickInputNodeType: state.quickInputNodeType,
			quickInputExtensionKind: state.quickInputExtensionKind,
			quickInputCursorPosition: state.quickInputCursorPosition,
			setQuickInputValue: state.setQuickInputValue,
			setQuickInputNodeType: state.setQuickInputNodeType,
			setQuickInputCursorPosition: state.setQuickInputCursorPosition,
			initializeQuickInput: state.initializeQuickInput,
			currentShares: state.currentShares,
			mapId: state.mapId,
			loadedPlugins: state.loadedPlugins,
		}))
	);

	const {
		closeNodeEditor,
		addNode,
		updateNode,
		applyLayoutAroundNode,
		queueLocalLayoutOnResize,
		clearQueuedLocalLayoutOnResize,
		handleOnboardingNodeCreated,
		onboardingPatternStep,
	} = useAppStore(
		useShallow((state) => ({
			closeNodeEditor: state.closeNodeEditor,
			addNode: state.addNode,
			updateNode: state.updateNode,
			applyLayoutAroundNode: state.applyLayoutAroundNode,
			queueLocalLayoutOnResize: state.queueLocalLayoutOnResize,
			clearQueuedLocalLayoutOnResize: state.clearQueuedLocalLayoutOnResize,
			handleOnboardingNodeCreated: state.handleOnboardingNodeCreated,
			onboardingPatternStep: state.onboardingPatternStep,
		}))
	);

	const effectiveNodeType = currentNodeType || initialNodeType || 'defaultNode';
	// Plugin node kinds (`$metric`): fields, Syntax Help and preview come from the plugin.
	const effectiveExtensionKind =
		effectiveNodeType === 'extensionNode'
			? (currentExtensionKind ?? initialExtensionKind)
			: null;
	const activePluginKind = useMemo(
		() =>
			effectiveExtensionKind
				? findActivePluginKind(
						loadedPlugins,
						effectiveExtensionKind.pluginId,
						effectiveExtensionKind.kind
					)
				: null,
		[loadedPlugins, effectiveExtensionKind]
	);
	const isPluginNode = effectiveNodeType === 'extensionNode';
	const pluginFieldSpecs = useMemo(
		() => (activePluginKind ? toPluginFieldSpecs(activePluginKind.kind) : null),
		[activePluginKind]
	);
	const config = useMemo(
		() =>
			activePluginKind
				? buildPluginKindConfig(activePluginKind)
				: getNodeTypeConfig(effectiveNodeType),
		[effectiveNodeType, activePluginKind]
	);
	const universalPatterns = useMemo(
		() => (isPluginNode ? [] : getUniversalParsingPatterns(effectiveNodeType)),
		[effectiveNodeType, isPluginNode]
	);
	const nodeSpecificPatterns = useMemo(
		() =>
			isPluginNode
				? config.parsingPatterns
				: getNodeSpecificParsingPatterns(effectiveNodeType),
		[effectiveNodeType, isPluginNode, config]
	);
	const pluginDraft = useMemo(
		() =>
			activePluginKind
				? parsePluginFieldInput(
						value.replace(/\$\w+\s*/, '').trim(),
						activePluginKind.kind
					)
				: null,
		[value, activePluginKind]
	);
	const pluginDraftInvalid =
		isPluginNode && (!pluginDraft || pluginDraft.errors.length > 0);
	const hasSyntaxPatterns =
		universalPatterns.length > 0 || nodeSpecificPatterns.length > 0;
	const showOnboardingPatternHint =
		onboardingSource === 'onboarding-pattern' &&
		onboardingPatternStep === 'pattern-editor' &&
		hasSyntaxPatterns;
	const showMobileCompletionTray =
		usesTouchAutocompleteSurface &&
		autocompleteState.status === 'active' &&
		autocompleteState.options.length > 0;

	const collaborators = useMemo<CollaboratorMention[]>(() => {
		if (mentionableUsers.length > 0) {
			return mentionableUsers.map((user) => ({
				slug: user.slug,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl ?? '',
				role:
					user.role === 'owner' || user.role === 'editor' ? 'editor' : 'viewer',
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
	}, [currentShares, mentionableUsers]);

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
	const autocompleteMentionMap = useMemo(
		() => buildMentionMap(collaborators),
		[collaborators]
	);

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
				const result: unknown = await response.json();
				const payload =
					result && typeof result === 'object'
						? (result as {
								status?: unknown;
								data?: { users?: unknown };
							})
						: null;
				if (
					payload?.status === 'success' &&
					Array.isArray(payload.data?.users)
				) {
					setMentionableUsers(sanitizeMentionableUsers(payload.data.users));
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

	// Check node limit for the current map (owner plan + role aware)
	const {
		isAtLimit: isAtNodeLimit,
		isLoading: isNodeLimitLoading,
		limitInfo: nodeLimitInfo,
		limitMessage: nodeLimitMessage,
	} = useMapNodeLimit({
		enabled: mode === 'create',
	});
	const isCreateMode = mode === 'create';
	const isCreateBlockedByNodeLimit = isCreateMode && isAtNodeLimit;
	const isCreateLimitCheckLoading = isCreateMode && isNodeLimitLoading;

	// Initialize QuickInput state when component mounts or mode changes
	useEffect(() => {
		if (mode === 'edit' && existingNode) {
			// Edit mode: initialize with existing node content (only once)
			const nodeType = initialNodeType || 'defaultNode';
			const extension = existingNode.data.metadata?.extension;
			if (nodeType === 'extensionNode' && extension) {
				const active = findActivePluginKind(
					useAppStore.getState().loadedPlugins,
					extension.pluginId,
					extension.kind
				);
				const checked = active ? validatePluginData(active.kind, extension.data) : null;
				initializeQuickInput(
					active && checked?.ok
						? serializePluginFieldInput(active.kind, checked.data)
						: (existingNode.data.content ?? ''),
					nodeType,
					{ pluginId: extension.pluginId, kind: extension.kind }
				);
				return;
			}
			const initialContent = transformNodeToQuickInputString(
				existingNode,
				nodeType
			);
			initializeQuickInput(initialContent, nodeType);
		} else if (mode === 'create') {
			if (
				initialValue &&
				(onboardingSource === 'onboarding-pattern' || initialValue.length > 0)
			) {
				initializeQuickInput(
					initialValue,
					initialNodeType || 'defaultNode',
					initialExtensionKind
				);
				return;
			}

			// Create mode: only set initial node type if none exists
			// Don't override user-selected node types from $nodeType switching
			if (!currentNodeType && initialNodeType) {
				setCurrentNodeType(initialNodeType, initialExtensionKind);
			}
			// Don't reset value in create mode to preserve user input across remounts
		}
	}, [
		mode,
		existingNode?.id,
		initialValue,
		initialNodeType,
		initialExtensionKind,
		initializeQuickInput,
		onboardingSource,
		setCurrentNodeType,
	]);

	// Restore legend preferences on mount (client only).
	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		setLegendCollapsed(
			window.localStorage.getItem('parsingLegendCollapsed') === 'true'
		);
		setUniversalLegendCollapsed(
			window.localStorage.getItem('parsingLegendUniversalCollapsed') === 'true'
		);
		setNodeSpecificLegendCollapsed(
			window.localStorage.getItem('parsingLegendNodeSpecificCollapsed') ===
				'true'
		);
	}, []);

	const handleLegendCollapseToggle = useCallback(() => {
		setLegendCollapsed((current) => {
			const next = !current;
			if (typeof window !== 'undefined') {
				window.localStorage.setItem('parsingLegendCollapsed', String(next));
			}
			return next;
		});
	}, []);

	const handleUniversalLegendCollapseToggle = useCallback(() => {
		setUniversalLegendCollapsed((current) => {
			const next = !current;
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(
					'parsingLegendUniversalCollapsed',
					String(next)
				);
			}
			return next;
		});
	}, []);

	const handleNodeSpecificLegendCollapseToggle = useCallback(() => {
		setNodeSpecificLegendCollapsed((current) => {
			const next = !current;
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(
					'parsingLegendNodeSpecificCollapsed',
					String(next)
				);
			}
			return next;
		});
	}, []);

	// Handle keyboard shortcut for legend toggle
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === '/') {
				e.preventDefault();
				setRightPanelTab('syntax');
				setLegendCollapsed(false);
				if (typeof window !== 'undefined') {
					window.localStorage.setItem('parsingLegendCollapsed', 'false');
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Process node type switches automatically (legacy fallback only)
	useEffect(() => {
		if (!value || !currentNodeType || lastProcessedText.current === value) {
			return;
		}

		// Only use legacy processing if commands are disabled or as fallback
		// The primary processing should happen via CodeMirror events
		if (shouldAutoProcessSwitch(value)) {
			const processed = processNodeTypeSwitch(value);
			const nextKind = processed.extension ?? null;
			const kindChanged =
				nextKind?.pluginId !== currentExtensionKind?.pluginId ||
				nextKind?.kind !== currentExtensionKind?.kind;
			// M1: plugin nodes keep their type in edit mode, and existing nodes can't
			// become plugin nodes there.
			const blockedInEdit =
				mode === 'edit' && (currentNodeType === 'extensionNode' || Boolean(nextKind));

			if (
				processed.hasSwitch &&
				processed.nodeType &&
				!blockedInEdit &&
				(processed.nodeType !== currentNodeType || kindChanged)
			) {
				// Update node type and clean text
				setCurrentNodeType(processed.nodeType as AvailableNodeTypes, nextKind);
				setValue(processed.processedText);
				lastProcessedText.current = processed.processedText;

				// Announce the change
				const nodeTypeName = nextKind
					? nextKind.kind
					: processed.nodeType.replace('Node', '').toLowerCase();
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
		currentExtensionKind,
		mode,
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
	/**
	 * Creates or updates a node from the current quick-input state.
	 *
	 * Captures closure values (`value`, `effectiveNodeType`, `mode`, `position`,
	 * `parentNode`, `existingNode`, `referenceMetadata`, `mapId`,
	 * `mentionSlugToUserId`) to parse input, resolve assignee mentions, mutate
	 * `nodeData.metadata`, call `createOrUpdateNode`, emit notification events to
	 * `/api/notifications/emit`, and close the editor via `closeNodeEditor`.
	 *
	 * Returns early when input is empty, the node limit is reached, or creation is
	 * already in progress. On failure it logs and calls `setError`.
	 *
	 * @returns Promise<void> Performs state mutations and network requests; callers
	 * should account for concurrent invocation.
	 */
	const handleCreate = useCallback(async () => {
		// Guard: same checks as ActionBar canCreate prop
		if (
			value.trim().length === 0 ||
			isCreateBlockedByNodeLimit ||
			isCreateLimitCheckLoading ||
			isCreating ||
			pluginDraftInvalid
		) {
			return;
		}

		try {
			setIsCreating(true);

			// Clean the input by removing any $nodeType command from anywhere
			const cleanValue = value.replace(/\$\w+\s*/, '').trim() || value;

			// Parse the input (plugin node kinds use their own typed fields)
			let nodeData: ReturnType<typeof parseInput>;
			if (isPluginNode) {
				if (!activePluginKind || !pluginDraft) {
					throw new Error('This plugin isn’t running on this map');
				}
				// Save the plugin's view too, so people without the plugin see it.
				const rendered = await loadPluginHost()
					.then((host) =>
						host.render(activePluginKind.manifest.id, activePluginKind.kind, pluginDraft.data, {
							canEdit: true,
						})
					)
					.catch(() => null);
				nodeData = buildPluginNodeSaveData(
					activePluginKind,
					pluginDraft,
					rendered,
					existingNode?.data.metadata?.extension
				) as ReturnType<typeof parseInput>;
			} else {
				nodeData = parseInput(cleanValue);
			}
			const rawAssignees = Array.isArray(nodeData.metadata?.assignee)
				? nodeData.metadata.assignee
				: typeof nodeData.metadata?.assignee === 'string'
					? [nodeData.metadata.assignee]
					: [];
			const assigneeUserIds = Array.from(
				new Set(
					rawAssignees
						.filter(
							(assignee): assignee is string => typeof assignee === 'string'
						)
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

			if (mode === 'edit' && existingNode?.id) {
				queueLocalLayoutOnResize(existingNode.id);
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

			handleOnboardingNodeCreated({
				mode,
				usedPatterns: nodeData.patterns.length > 0,
				nodeId: result.nodeId ?? existingNode?.id ?? null,
			});

			if (mapId && assigneeUserIds.length > 0) {
				void (async () => {
					try {
						const response = await fetch('/api/notifications/emit', {
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
						});

						if (!response.ok) {
							const responseBody = await response.text();
							let parsedBody: unknown = responseBody;
							if (responseBody) {
								try {
									parsedBody = JSON.parse(responseBody) as unknown;
								} catch {
									// Keep raw text when response body is not JSON.
								}
							}

							console.warn(
								'[quick-input] node mention notification emit failed',
								{
									status: response.status,
									body: parsedBody || response.statusText,
								}
							);
						}
					} catch (notificationError: unknown) {
						console.warn(
							'[quick-input] failed to emit node mention notification',
							notificationError
						);
					}
				})();
			}

			if (mode === 'create' && result.nodeId) {
				void applyLayoutAroundNode(result.nodeId).catch(
					(layoutError: unknown) => {
						console.error(
							'[quick-input] failed to apply local layout after node creation',
							{
								nodeId: result.nodeId,
								error: layoutError,
							}
						);
					}
				);
			}

			// Close the editor after successful creation/update
			closeNodeEditor();
		} catch (err) {
			if (mode === 'edit' && existingNode?.id) {
				clearQueuedLocalLayoutOnResize(existingNode.id);
			}
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
		applyLayoutAroundNode,
		queueLocalLayoutOnResize,
		clearQueuedLocalLayoutOnResize,
		isCreating,
		isCreateBlockedByNodeLimit,
		isCreateLimitCheckLoading,
		mode,
		existingNode,
		referenceMetadata,
		mapId,
		mentionSlugToUserId,
		handleOnboardingNodeCreated,
		isPluginNode,
		activePluginKind,
		pluginDraft,
		pluginDraftInvalid,
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
	const handleCommandExecuted = useCallback((commandData: unknown) => {
		if (!isReferenceSelectedCommand(commandData)) {
			return;
		}

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
	}, []);

	const handleAutocompleteStateChange = useCallback(
		(nextAutocompleteState: EditorAutocompleteState) => {
			setAutocompleteState(nextAutocompleteState);
		},
		[]
	);

	const handleAutocompleteControllerReady = useCallback(
		(controller: EditorAutocompleteController | null) => {
			setAutocompleteController(controller);
			if (!controller) {
				setAutocompleteState({
					status: null,
					options: [],
					selectedIndex: null,
					anchorRect: null,
					editorRect: null,
				});
			}
		},
		[]
	);

	const handleMobileAutocompleteSelect = useCallback(
		(index: number) => {
			autocompleteController?.acceptOption(index);
		},
		[autocompleteController]
	);

	const handleMobileAutocompleteHighlight = useCallback(
		(index: number) => {
			autocompleteController?.setSelectedIndex(index);
		},
		[autocompleteController]
	);

	const handleMobileAutocompleteClose = useCallback(() => {
		autocompleteController?.close();
	}, [autocompleteController]);

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
			data-testid='quick-input-shell'
			exit={{ opacity: 0, scale: 0.95 }}
			initial={{ opacity: 0, scale: 0.95 }}
			layoutId={config.label}
			transition={{ duration: 0.2, ease: 'easeOut' as const }}
		>
			<Tabs
				className='flex h-full min-h-0 flex-col gap-0'
				value={rightPanelTab}
				onValueChange={(nextValue) =>
					setRightPanelTab(nextValue as RightPanelTab)
				}
			>
				<div
					className='grid shrink-0 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]'
					data-testid='quick-input-header-grid'
				>
					<div
						className='flex min-w-0 items-center px-4 py-3'
						data-testid='quick-input-header-row'
					>
						<ComponentHeader
							className='mb-0 min-w-0'
							icon={config.icon}
							label={config.label}
							showSparkles={false}
						/>

						{activePluginKind && (
							<span className='ml-2 shrink-0 text-xs text-zinc-500'>
								{`· ${activePluginKind.manifest.name} plugin`}
							</span>
						)}
					</div>

					<div className='hidden bg-zinc-800/80 sm:block' />

					<div
						className='flex h-11 min-w-0 items-stretch justify-start border-t border-zinc-800/80 px-0 py-0 sm:h-auto sm:border-t-0'
						data-testid='quick-input-tabs-row'
					>
						<TabsList className='grid h-full w-full grid-cols-[max-content_max-content] justify-start gap-0 border-b border-zinc-700/80 bg-transparent p-0 sm:w-fit sm:grid-cols-2'>
							<TabsTrigger
								className='!h-full !rounded-none !border-0 !border-b-2 !border-transparent gap-1.5 px-4 text-sm text-zinc-400 [@media(hover:hover)]:hover:!bg-zinc-900/45 [@media(hover:hover)]:hover:text-zinc-100 aria-selected:!border-b-zinc-100 aria-selected:!bg-zinc-900/45 aria-selected:text-zinc-50 data-[active]:!border-b-zinc-100 data-[active]:!bg-zinc-900/45 data-[active]:text-zinc-50 sm:px-2 sm:text-xs'
								value='preview'
							>
								<Eye className='size-3.5' />
								Preview
							</TabsTrigger>

							<TabsTrigger
								className='!h-full !rounded-none !border-0 !border-b-2 !border-transparent gap-1.5 px-4 text-sm text-zinc-400 [@media(hover:hover)]:hover:!bg-zinc-900/45 [@media(hover:hover)]:hover:text-zinc-100 aria-selected:!border-b-zinc-100 aria-selected:!bg-zinc-900/45 aria-selected:text-zinc-50 data-[active]:!border-b-zinc-100 data-[active]:!bg-zinc-900/45 data-[active]:text-zinc-50 sm:px-2 sm:text-xs'
								value='syntax'
							>
								<CircleHelp className='size-3.5' />
								Syntax Help
							</TabsTrigger>
						</TabsList>
					</div>
				</div>

				<div className='border-t border-zinc-800/80' />

				{/* Parent reference when creating a child node */}
				{parentNode && (
					<div className='shrink-0 border-b border-zinc-800/80 px-4 py-3'>
						<ParentNodeReference
							parentNode={parentNode}
							label={
								effectiveNodeType === 'annotationNode' &&
								parentNode.data?.node_type !== 'annotationNode'
									? 'Anchored to:'
									: undefined
							}
						/>
					</div>
				)}

				<div
					data-testid='quick-input-body'
					className={cn(
						'grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(150px,0.48fr)_1px_minmax(170px,0.52fr)] overflow-hidden sm:h-[min(420px,calc(100dvh-10rem))] sm:max-h-[calc(100dvh-10rem)] sm:min-h-[min(360px,calc(100dvh-10rem))] sm:flex-none sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] sm:grid-rows-1',
						// Full-screen editor on phones (incl. landscape): fill the height instead of the dialog's fixed body.
						isMobile && 'sm:h-auto sm:max-h-none sm:min-h-0 sm:flex-1'
					)}
				>
					<div
						className='flex min-h-0 min-w-0 flex-col overflow-hidden'
						data-testid='quick-input-editor-panel'
					>
						<EnhancedInput
							className='min-h-0 min-w-0 w-full flex-1'
							collaborators={collaborators}
							disabled={isCreating}
							enableCommands={true}
							onAutocompleteControllerReady={handleAutocompleteControllerReady}
							onAutocompleteStateChange={handleAutocompleteStateChange}
							onChange={setValue}
							onCommandExecuted={handleCommandExecuted}
							onFocusChange={setIsEditorFocused}
							onKeyDown={handleKeyDown}
							onNodeTypeChange={handleNodeTypeChange}
							onSelectionChange={handleSelectionChange}
							pluginFields={pluginFieldSpecs}
							placeholder={`Type naturally... ${config.examples?.[0] || ''}`}
							showNativeAutocomplete={!usesTouchAutocompleteSurface}
							value={value}
						/>

						<ExamplesSection
							className='shrink-0 border-t border-zinc-800/80 px-4 py-3'
							examples={config.examples || []}
							hasValue={value.length > 0}
							onUseExample={handleUseExample}
						/>
					</div>

					<div className='bg-zinc-800/80' />

					<div
						className='min-h-0 min-w-0 overflow-hidden'
						data-testid='quick-input-right-panel'
					>
						<TabsContent
							className='mt-0 h-full min-h-0 overflow-hidden'
							value='preview'
						>
							{isPluginNode ? (
								<PluginEditorPreview
									active={activePluginKind}
									hasInput={value.trim().length > 0}
									parsed={pluginDraft}
								/>
							) : (
								<PreviewSection
									className='h-full'
									hasInput={value.trim().length > 0}
									nodeType={effectiveNodeType}
									preview={preview}
								/>
							)}
						</TabsContent>

						<TabsContent
							className='mt-0 h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5'
							value='syntax'
						>
							{showOnboardingPatternHint && (
								<div className='mb-3 rounded-sm bg-primary-500/8 px-3 py-2 text-xs leading-5 text-text-secondary'>
									<span className='font-medium text-text-primary'>
										Try more patterns in Syntax Help below.
									</span>{' '}
									Use the examples to swap in tags, dates, assignees, or a
									different node type.
								</div>
							)}

							{hasSyntaxPatterns ? (
								<ParsingLegend
									isCollapsed={legendCollapsed}
									isNodeSpecificCollapsed={nodeSpecificLegendCollapsed}
									isUniversalCollapsed={universalLegendCollapsed}
									nodeSpecificPatterns={nodeSpecificPatterns}
									onPatternClick={handlePatternInsert}
									onToggleCollapse={handleLegendCollapseToggle}
									universalPatterns={universalPatterns}
									variant='panel'
									onToggleNodeSpecificCollapse={
										handleNodeSpecificLegendCollapseToggle
									}
									onToggleUniversalCollapse={
										handleUniversalLegendCollapseToggle
									}
								/>
							) : (
								<div className='rounded-sm bg-zinc-950/20 p-4 text-xs leading-5 text-zinc-500'>
									This node type accepts plain text input without special
									syntax.
								</div>
							)}
						</TabsContent>
					</div>
				</div>

				<MobileCompletionTray
					isOpen={showMobileCompletionTray}
					anchorRect={autocompleteState.anchorRect}
					editorRect={autocompleteState.editorRect}
					isEditorFocused={isEditorFocused}
					mentionMap={autocompleteMentionMap}
					onClose={handleMobileAutocompleteClose}
					onHighlight={handleMobileAutocompleteHighlight}
					onSelect={handleMobileAutocompleteSelect}
					options={autocompleteState.options}
					selectedIndex={autocompleteState.selectedIndex}
				/>

				<div className='shrink-0 px-4'>
					<ErrorDisplay error={error} />
				</div>

				{/* Node limit warning */}
				{isCreateBlockedByNodeLimit &&
					(nodeLimitInfo || Boolean(nodeLimitMessage)) && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className='mx-4 mb-3 flex shrink-0 items-center gap-2 rounded-sm bg-amber-500/10 p-3 text-amber-400'
						>
							<AlertCircle className='w-4 h-4 shrink-0' />

							<span className='text-sm'>
								{nodeLimitMessage ||
									(nodeLimitInfo
										? `Node limit reached (${nodeLimitInfo.current}/${nodeLimitInfo.max}).`
										: '')}
							</span>
						</motion.div>
					)}

				<div
					data-testid='quick-input-footer-row'
					className={cn(
						'shrink-0',
						isMobile && 'pb-[env(safe-area-inset-bottom,0px)]'
					)}
				>
					<ActionBar
						className='mt-0 border-t border-zinc-800/80 px-4 py-3'
						onCancel={isMobile ? closeNodeEditor : undefined}
						showKeyboardHints={!usesTouchAutocompleteSurface}
						isCreating={isCreating}
						isCheckingLimit={isCreateLimitCheckLoading}
						mode={mode}
						onCreate={handleCreate}
						canCreate={
							value.trim().length > 0 &&
							!pluginDraftInvalid &&
							(!isCreateMode ||
								(!isCreateBlockedByNodeLimit && !isCreateLimitCheckLoading))
						}
					/>
				</div>
			</Tabs>
		</motion.div>
	);
};
