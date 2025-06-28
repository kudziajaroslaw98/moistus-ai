'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import useAppStore from '@/store/mind-map-store';
import type { AvailableNodeTypes } from '@/types/available-node-types';
import type { AppNode } from '@/types/app-node';
import { AnimatePresence, motion } from 'motion/react';
import {
	Brain,
	CheckCircle,
	FileText,
	HelpCircle,
	Lightbulb,
	Link2,
	Plus,
	Sparkles,
	Target,
	X,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

// Interface for node candidates extracted from chat
interface NodeCandidate {
	id: string;
	content: string;
	type: AvailableNodeTypes;
	confidence: number;
	reasoning: string;
	position?: { x: number; y: number };
	parentNodeId?: string;
	metadata?: {
		category?: string;
		tags?: string[];
		priority?: 'high' | 'medium' | 'low';
		extractedFrom?: string;
	};
}

// Props for the ChatToNodeCreator component
interface ChatToNodeCreatorProps {
	messageId: string;
	messageContent: string;
	isVisible: boolean;
	onClose: () => void;
	selectedNodeIds?: string[];
}

// Node type icons mapping
const nodeTypeIcons: Record<AvailableNodeTypes, React.ReactNode> = {
	defaultNode: <Brain className="h-4 w-4" />,
	textNode: <FileText className="h-4 w-4" />,
	questionNode: <HelpCircle className="h-4 w-4" />,
	taskNode: <Target className="h-4 w-4" />,
	resourceNode: <Link2 className="h-4 w-4" />,
	imageNode: <FileText className="h-4 w-4" />,
	annotationNode: <FileText className="h-4 w-4" />,
	codeNode: <FileText className="h-4 w-4" />,
	builderNode: <Plus className="h-4 w-4" />,
};

// Node candidate component
const NodeCandidateCard: React.FC<{
	candidate: NodeCandidate;
	onAccept: (candidate: NodeCandidate) => void;
	onReject: (candidateId: string) => void;
	isCreating: boolean;
}> = ({ candidate, onAccept, onReject, isCreating }) => {
	const getConfidenceColor = (confidence: number) => {
		if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
		if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
		return 'text-red-600 bg-red-50 border-red-200';
	};

	const getTypeColor = (type: AvailableNodeTypes) => {
		const colors: Record<AvailableNodeTypes, string> = {
			defaultNode: 'bg-blue-100 text-blue-700',
			textNode: 'bg-gray-100 text-gray-700',
			questionNode: 'bg-purple-100 text-purple-700',
			taskNode: 'bg-green-100 text-green-700',
			resourceNode: 'bg-orange-100 text-orange-700',
			imageNode: 'bg-pink-100 text-pink-700',
			annotationNode: 'bg-indigo-100 text-indigo-700',
			codeNode: 'bg-slate-100 text-slate-700',
			builderNode: 'bg-teal-100 text-teal-700',
		};
		return colors[type] || 'bg-gray-100 text-gray-700';
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.2 }}
		>
			<Card className="border border-gray-200 hover:border-gray-300 transition-colors">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1">
							{/* Node Type and Confidence */}
							<div className="flex items-center gap-2 mb-2">
								<div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(candidate.type)}`}>
									{nodeTypeIcons[candidate.type]}
									{candidate.type.replace('Node', '')}
								</div>
								<div className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(candidate.confidence)}`}>
									{Math.round(candidate.confidence * 100)}% confidence
								</div>
							</div>

							{/* Content Preview */}
							<p className="text-sm text-gray-900 mb-2 line-clamp-2">
								{candidate.content}
							</p>

							{/* Reasoning */}
							<p className="text-xs text-gray-600 mb-3">
								{candidate.reasoning}
							</p>

							{/* Metadata */}
							{candidate.metadata && (
								<div className="flex flex-wrap gap-1 mb-3">
									{candidate.metadata.category && (
										<span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
											{candidate.metadata.category}
										</span>
									)}
									{candidate.metadata.priority && (
										<span className={`px-2 py-1 text-xs rounded ${
											candidate.metadata.priority === 'high'
												? 'bg-red-50 text-red-700'
												: candidate.metadata.priority === 'medium'
													? 'bg-yellow-50 text-yellow-700'
													: 'bg-green-50 text-green-700'
										}`}>
											{candidate.metadata.priority} priority
										</span>
									)}
									{candidate.metadata.tags?.map((tag) => (
										<span
											key={tag}
											className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded"
										>
											#{tag}
										</span>
									))}
								</div>
							)}
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-2">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="sm"
											onClick={() => onAccept(candidate)}
											disabled={isCreating}
											className="h-8 w-8 p-0"
										>
											<CheckCircle className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Create node</TooltipContent>
								</Tooltip>
							</TooltipProvider>

							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="sm"
											variant="outline"
											onClick={() => onReject(candidate.id)}
											disabled={isCreating}
											className="h-8 w-8 p-0"
										>
											<X className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Reject suggestion</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
};

// Main ChatToNodeCreator component
export const ChatToNodeCreator: React.FC<ChatToNodeCreatorProps> = ({
	messageId,
	messageContent,
	isVisible,
	onClose,
	selectedNodeIds = [],
}) => {
	const [candidates, setCandidates] = useState<NodeCandidate[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isCreatingNode, setIsCreatingNode] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		addNode,
		nodes,
		edges,
		reactFlowInstance,
		selectedNodes,
	} = useAppStore();

	// Extract node candidates from message content
	const extractNodeCandidates = useCallback((content: string): NodeCandidate[] => {
		const candidates: NodeCandidate[] = [];

		// Split content into sentences and analyze each
		const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);

		sentences.forEach((sentence, index) => {
			const trimmedSentence = sentence.trim();
			if (!trimmedSentence) return;

			// Determine node type based on content patterns
			let nodeType: AvailableNodeTypes = 'defaultNode';
			let confidence = 0.5;
			let reasoning = 'General content';

			// Question detection
			if (trimmedSentence.includes('?') || trimmedSentence.toLowerCase().startsWith('how') ||
				trimmedSentence.toLowerCase().startsWith('what') || trimmedSentence.toLowerCase().startsWith('why') ||
				trimmedSentence.toLowerCase().startsWith('when') || trimmedSentence.toLowerCase().startsWith('where')) {
				nodeType = 'questionNode';
				confidence = 0.9;
				reasoning = 'Contains question patterns';
			}
			// Task detection
			else if (trimmedSentence.toLowerCase().includes('todo') || trimmedSentence.toLowerCase().includes('task') ||
				trimmedSentence.toLowerCase().includes('should') || trimmedSentence.toLowerCase().includes('need to') ||
				trimmedSentence.toLowerCase().includes('action') || trimmedSentence.toLowerCase().includes('implement')) {
				nodeType = 'taskNode';
				confidence = 0.8;
				reasoning = 'Contains action-oriented language';
			}
			// Resource detection
			else if (trimmedSentence.includes('http') || trimmedSentence.includes('www.') ||
				trimmedSentence.toLowerCase().includes('link') || trimmedSentence.toLowerCase().includes('reference') ||
				trimmedSentence.toLowerCase().includes('source') || trimmedSentence.toLowerCase().includes('documentation')) {
				nodeType = 'resourceNode';
				confidence = 0.85;
				reasoning = 'Contains references or links';
			}
			// Code detection
			else if (trimmedSentence.includes('`') || trimmedSentence.includes('function') ||
				trimmedSentence.includes('const') || trimmedSentence.includes('class') ||
				trimmedSentence.toLowerCase().includes('code') || trimmedSentence.toLowerCase().includes('syntax')) {
				nodeType = 'codeNode';
				confidence = 0.8;
				reasoning = 'Contains code-related content';
			}
			// Text node for detailed explanations
			else if (trimmedSentence.length > 100) {
				nodeType = 'textNode';
				confidence = 0.7;
				reasoning = 'Detailed text content';
			}

			// Skip very short or low-confidence candidates
			if (trimmedSentence.length < 15 || confidence < 0.5) return;

			// Extract potential tags and categories
			const tags: string[] = [];
			const words = trimmedSentence.toLowerCase().split(/\s+/);

			// Look for hashtags or keywords
			words.forEach(word => {
				if (word.startsWith('#')) {
					tags.push(word.substring(1));
				}
			});

			candidates.push({
				id: `candidate_${messageId}_${index}`,
				content: trimmedSentence,
				type: nodeType,
				confidence,
				reasoning,
				metadata: {
					extractedFrom: messageId,
					tags: tags.length > 0 ? tags : undefined,
					priority: confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low',
				},
			});
		});

		// Sort by confidence and limit to top 5
		return candidates
			.sort((a, b) => b.confidence - a.confidence)
			.slice(0, 5);
	}, [messageId]);

	// Load candidates when component becomes visible
	useEffect(() => {
		if (isVisible && messageContent) {
			setIsLoading(true);
			setError(null);

			try {
				const extracted = extractNodeCandidates(messageContent);
				setCandidates(extracted);
			} catch (err) {
				setError('Failed to extract node candidates');
				console.error('Error extracting candidates:', err);
			} finally {
				setIsLoading(false);
			}
		}
	}, [isVisible, messageContent, extractNodeCandidates]);

	// Handle accepting a candidate and creating a node
	const handleAcceptCandidate = useCallback(async (candidate: NodeCandidate) => {
		setIsCreatingNode(true);
		setError(null);

		try {
			// Determine position for the new node
			let position = { x: 100, y: 100 };

			if (selectedNodes.length > 0) {
				// Position near the selected node
				const selectedNode = selectedNodes[0];
				position = {
					x: selectedNode.position.x + 200,
					y: selectedNode.position.y,
				};
			} else if (reactFlowInstance) {
				// Position in the center of the viewport
				const viewport = reactFlowInstance.getViewport();
				const center = reactFlowInstance.screenToFlowPosition({
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
				});
				position = center;
			}

			// Find parent node if applicable
			let parentNode = null;
			if (selectedNodes.length > 0) {
				parentNode = selectedNodes[0];
			}

			// Create the node
			await addNode({
				parentNode,
				content: candidate.content,
				nodeType: candidate.type,
				position,
				data: {
					metadata: {
						...candidate.metadata,
						createdFromChat: true,
						originalMessageId: messageId,
					},
				},
			});

			// Remove the accepted candidate from the list
			setCandidates(prev => prev.filter(c => c.id !== candidate.id));

		} catch (err) {
			setError('Failed to create node');
			console.error('Error creating node:', err);
		} finally {
			setIsCreatingNode(false);
		}
	}, [selectedNodes, reactFlowInstance, addNode, messageId]);

	// Handle rejecting a candidate
	const handleRejectCandidate = useCallback((candidateId: string) => {
		setCandidates(prev => prev.filter(c => c.id !== candidateId));
	}, []);

	// Handle accepting all candidates
	const handleAcceptAll = useCallback(async () => {
		for (const candidate of candidates) {
			await handleAcceptCandidate(candidate);
		}
	}, [candidates, handleAcceptCandidate]);

	// Handle rejecting all candidates
	const handleRejectAll = useCallback(() => {
		setCandidates([]);
		onClose();
	}, [onClose]);

	if (!isVisible) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: 20 }}
				transition={{ duration: 0.2 }}
				className="fixed right-4 bottom-20 z-50 w-96 max-h-[500px] bg-white rounded-lg border border-gray-200 shadow-xl"
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="flex items-center gap-2 text-sm font-medium">
						<Sparkles className="h-4 w-4 text-blue-500" />
						Node Suggestions
						{candidates.length > 0 && (
							<span className="text-xs text-gray-500">
								({candidates.length} found)
							</span>
						)}
					</CardTitle>

					<div className="flex items-center gap-1">
						{candidates.length > 1 && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											onClick={handleAcceptAll}
											disabled={isCreatingNode}
											className="h-6 w-6 p-0"
										>
											<CheckCircle className="h-3 w-3" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Accept all</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={onClose}
										className="h-6 w-6 p-0"
									>
										<X className="h-3 w-3" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Close</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					{isLoading ? (
						<div className="flex items-center justify-center p-8">
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<Lightbulb className="h-4 w-4 animate-pulse" />
								Analyzing content...
							</div>
						</div>
					) : error ? (
						<div className="p-4">
							<div className="rounded-lg bg-red-50 border border-red-200 p-3">
								<p className="text-sm text-red-700">{error}</p>
							</div>
						</div>
					) : candidates.length === 0 ? (
						<div className="flex items-center justify-center p-8">
							<div className="text-center">
								<Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
								<p className="text-sm text-gray-600">No node suggestions found</p>
								<p className="text-xs text-gray-500 mt-1">
									Try messages with more specific content
								</p>
							</div>
						</div>
					) : (
						<ScrollArea className="max-h-[400px]">
							<div className="p-4 space-y-3">
								{candidates.map((candidate) => (
									<NodeCandidateCard
										key={candidate.id}
										candidate={candidate}
										onAccept={handleAcceptCandidate}
										onReject={handleRejectCandidate}
										isCreating={isCreatingNode}
									/>
								))}
							</div>
						</ScrollArea>
					)}

					{candidates.length > 0 && (
						<>
							<Separator />
							<div className="p-3 flex justify-between">
								<Button
									variant="outline"
									size="sm"
									onClick={handleRejectAll}
									disabled={isCreatingNode}
								>
									Reject All
								</Button>
								<Button
									size="sm"
									onClick={handleAcceptAll}
									disabled={isCreatingNode}
								>
									Accept All
								</Button>
							</div>
						</>
					)}
				</CardContent>
			</motion.div>
		</AnimatePresence>
	);
};

export default ChatToNodeCreator;
