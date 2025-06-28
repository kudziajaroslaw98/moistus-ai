'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import useAppStore from '@/store/mind-map-store';
import type { AppNode } from '@/types/app-node';
import { AnimatePresence, motion } from 'motion/react';
import {
	Bot,
	Clock,
	MessageSquare,
	Sparkles,
	Tag,
	User,
	Zap,
} from 'lucide-react';
import React, { useMemo } from 'react';

// Props for the NodeContextIndicator component
interface NodeContextIndicatorProps {
	node: AppNode;
	position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	showDetails?: boolean;
	onChatClick?: (nodeId: string) => void;
}

// Chat context metadata interface
interface ChatContextMetadata {
	createdFromChat?: boolean;
	originalMessageId?: string;
	chatSessionId?: string;
	aiGenerated?: boolean;
	lastChatInteraction?: string;
	chatConfidence?: number;
	relatedMessages?: string[];
	extractionMethod?: 'manual' | 'auto' | 'suggested';
}

// Main NodeContextIndicator component
export const NodeContextIndicator: React.FC<NodeContextIndicatorProps> = ({
	node,
	position = 'top-right',
	showDetails = false,
	onChatClick,
}) => {
	const { currentSession, context } = useAppStore();

	// Extract chat-related metadata from node
	const chatMetadata = useMemo((): ChatContextMetadata | null => {
		if (!node.data.metadata) return null;

		const metadata = node.data.metadata as any;

		// Check for various chat-related indicators
		const chatContext: ChatContextMetadata = {};

		if (metadata.createdFromChat) chatContext.createdFromChat = true;
		if (metadata.originalMessageId) chatContext.originalMessageId = metadata.originalMessageId;
		if (metadata.chatSessionId) chatContext.chatSessionId = metadata.chatSessionId;
		if (metadata.aiGenerated) chatContext.aiGenerated = true;
		if (metadata.lastChatInteraction) chatContext.lastChatInteraction = metadata.lastChatInteraction;
		if (metadata.chatConfidence) chatContext.chatConfidence = metadata.chatConfidence;
		if (metadata.relatedMessages) chatContext.relatedMessages = metadata.relatedMessages;
		if (metadata.extractionMethod) chatContext.extractionMethod = metadata.extractionMethod;

		// Return null if no chat-related metadata found
		return Object.keys(chatContext).length > 0 ? chatContext : null;
	}, [node.data.metadata]);

	// Check if node is currently selected in chat context
	const isSelectedInChat = useMemo(() => {
		return context?.selectedNodeIds.includes(node.id) || false;
	}, [context?.selectedNodeIds, node.id]);

	// Check if node has recent chat activity
	const hasRecentChatActivity = useMemo(() => {
		if (!chatMetadata?.lastChatInteraction) return false;

		const lastInteraction = new Date(chatMetadata.lastChatInteraction);
		const now = new Date();
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

		return lastInteraction > fiveMinutesAgo;
	}, [chatMetadata?.lastChatInteraction]);

	// Determine indicator type and styling
	const indicatorInfo = useMemo(() => {
		if (isSelectedInChat) {
			return {
				type: 'selected',
				icon: <MessageSquare className="h-3 w-3" />,
				color: 'bg-blue-500 text-white',
				label: 'Selected in Chat',
				priority: 3,
			};
		}

		if (hasRecentChatActivity) {
			return {
				type: 'recent',
				icon: <Zap className="h-3 w-3" />,
				color: 'bg-yellow-500 text-white',
				label: 'Recent Chat Activity',
				priority: 2,
			};
		}

		if (chatMetadata?.aiGenerated) {
			return {
				type: 'ai-generated',
				icon: <Bot className="h-3 w-3" />,
				color: 'bg-green-500 text-white',
				label: 'AI Generated',
				priority: 2,
			};
		}

		if (chatMetadata?.createdFromChat) {
			return {
				type: 'chat-created',
				icon: <Sparkles className="h-3 w-3" />,
				color: 'bg-purple-500 text-white',
				label: 'Created from Chat',
				priority: 1,
			};
		}

		return null;
	}, [isSelectedInChat, hasRecentChatActivity, chatMetadata]);

	// Handle click to open chat with node context
	const handleChatClick = () => {
		if (onChatClick) {
			onChatClick(node.id);
		} else {
			// Default behavior: open chat and select this node
			const { openChat, setSelectedNodes } = useAppStore.getState();
			setSelectedNodes([node.id]);
			openChat();
		}
	};

	// Don't render if no chat context
	if (!indicatorInfo && !chatMetadata) return null;

	// Position classes
	const positionClasses = {
		'top-right': 'top-1 right-1',
		'top-left': 'top-1 left-1',
		'bottom-right': 'bottom-1 right-1',
		'bottom-left': 'bottom-1 left-1',
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.8 }}
				transition={{ duration: 0.2 }}
				className={`absolute ${positionClasses[position]} z-10`}
			>
				{showDetails ? (
					// Detailed view with metadata
					<Card className="w-64 border border-gray-200 shadow-lg">
						<CardContent className="p-3">
							<div className="flex items-center gap-2 mb-2">
								{indicatorInfo?.icon}
								<span className="text-sm font-medium">Chat Context</span>
							</div>

							<div className="space-y-2">
								{indicatorInfo && (
									<Badge
										className={`${indicatorInfo.color} text-xs`}
									>
										{indicatorInfo.label}
									</Badge>
								)}

								{chatMetadata?.chatConfidence && (
									<div className="flex items-center gap-1 text-xs text-gray-600">
										<Tag className="h-3 w-3" />
										Confidence: {Math.round(chatMetadata.chatConfidence * 100)}%
									</div>
								)}

								{chatMetadata?.extractionMethod && (
									<div className="flex items-center gap-1 text-xs text-gray-600">
										<User className="h-3 w-3" />
										Method: {chatMetadata.extractionMethod}
									</div>
								)}

								{chatMetadata?.lastChatInteraction && (
									<div className="flex items-center gap-1 text-xs text-gray-600">
										<Clock className="h-3 w-3" />
										Last: {new Date(chatMetadata.lastChatInteraction).toLocaleTimeString()}
									</div>
								)}

								{chatMetadata?.relatedMessages && chatMetadata.relatedMessages.length > 0 && (
									<div className="text-xs text-gray-600">
										Related to {chatMetadata.relatedMessages.length} message{chatMetadata.relatedMessages.length !== 1 ? 's' : ''}
									</div>
								)}
							</div>

							<Button
								size="sm"
								onClick={handleChatClick}
								className="w-full mt-3 h-7 text-xs"
							>
								Open Chat
							</Button>
						</CardContent>
					</Card>
				) : (
					// Simple indicator badge
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="sm"
									onClick={handleChatClick}
									className={`h-6 w-6 p-0 rounded-full shadow-sm ${
										indicatorInfo?.color || 'bg-gray-500 text-white'
									} hover:scale-110 transition-transform`}
								>
									{indicatorInfo?.icon || <MessageSquare className="h-3 w-3" />}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-xs">
								<div className="text-center">
									<div className="font-medium">
										{indicatorInfo?.label || 'Chat Context'}
									</div>
									{chatMetadata?.chatConfidence && (
										<div className="text-xs opacity-80">
											Confidence: {Math.round(chatMetadata.chatConfidence * 100)}%
										</div>
									)}
									{chatMetadata?.originalMessageId && (
										<div className="text-xs opacity-80">
											From message: {chatMetadata.originalMessageId.substring(0, 8)}...
										</div>
									)}
									<div className="text-xs opacity-80 mt-1">
										Click to open chat
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</motion.div>
		</AnimatePresence>
	);
};

export default NodeContextIndicator;
