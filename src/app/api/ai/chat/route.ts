export const maxDuration = 60;

export async function POST(request: Request) {
	// 	try {
	// 		// Apply rate limiting
	// 		const rateLimitResult = await withRateLimit(request, chatRateLimit);
	// 		if (!rateLimitResult.allowed) {
	// 			return rateLimitResult.response!;
	// 		}
	// 		// Parse and validate request body
	// 		const body = await request.json();
	// 		const validatedData = requestBodySchema.parse(body);
	// 		const { messages, context, modelPreferences = {} } = validatedData;
	// 		// Sanitize and validate all messages
	// 		const sanitizedMessages = [];
	// 		for (const message of messages) {
	// 			// Check for prompt injection
	// 			const injectionCheck = detectPromptInjection(message.content);
	// 			if (injectionCheck.detected && injectionCheck.severity === 'high') {
	// 				return new Response(
	// 					JSON.stringify({
	// 						error: 'Security violation detected',
	// 						message:
	// 							'Your message contains potentially harmful content and cannot be processed.',
	// 						code: 'PROMPT_INJECTION',
	// 					}),
	// 					{
	// 						status: 400,
	// 						headers: { 'Content-Type': 'application/json' },
	// 					}
	// 				);
	// 			}
	// 			// Sanitize message content
	// 			const sanitized = sanitizePrompt(message.content);
	// 			if (!sanitized.isValid) {
	// 				return new Response(
	// 					JSON.stringify({
	// 						error: 'Invalid message content',
	// 						message: sanitized.reason || 'Message content is not valid',
	// 						warnings: sanitized.warnings,
	// 					}),
	// 					{
	// 						status: 400,
	// 						headers: { 'Content-Type': 'application/json' },
	// 					}
	// 				);
	// 			}
	// 			sanitizedMessages.push({
	// 				...message,
	// 				content: sanitized.sanitized,
	// 			});
	// 		}
	// 		// Build enhanced context for AI
	// 		const mapContext = await buildMapContext({
	// 			...context,
	// 			conversationHistory: sanitizedMessages,
	// 			mapTitle: context.mapTitle,
	// 		});
	// 		// Prepare system message with context
	// 		const systemMessage = {
	// 			role: 'system' as const,
	// 			content: `You are an intelligent assistant helping users with their mind map. You have access to the current mind map context and can provide insights, suggestions, and help users expand their ideas.
	// Mind Map Context:
	// ${mapContext}
	// Guidelines:
	// - Be helpful, concise, and relevant to the mind map content
	// - Suggest actionable next steps when appropriate
	// - Reference specific nodes or connections when relevant
	// - Help users identify patterns, gaps, or opportunities in their mind map
	// - Provide creative and analytical insights based on the visible content
	// Current conversation focuses on: ${context.mapTitle || 'Untitled Mind Map'}
	// Selected nodes: ${context.selectedNodeIds.length > 0 ? context.selectedNodeIds.join(', ') : 'None'}`,
	// 		};
	// 		// Prepare messages for AI with sanitized content
	// 		const aiMessages = [systemMessage, ...sanitizedMessages];
	// 		// Log AI usage for analytics
	// 		await logAIUsage({
	// 			mapId: context.mapId,
	// 			messageCount: sanitizedMessages.length,
	// 			contextSize: mapContext.length,
	// 			model: modelPreferences.model || 'gpt-4o-mini',
	// 		});
	// 		// Stream response from AI
	// 		const result = streamText({
	// 			model: openai(modelPreferences.model || 'gpt-4o-mini'),
	// 			messages: aiMessages,
	// 			temperature: modelPreferences.temperature || 0.7,
	// 			maxTokens: modelPreferences.maxTokens || 1000,
	// 			onFinish: async (result) => {
	// 				// Validate AI response
	// 				if (result.text) {
	// 					const validation = validateAIResponse(result.text);
	// 					if (!validation.isValid) {
	// 						console.warn('AI response validation failed:', validation.warnings);
	// 					}
	// 				}
	// 				// Log completion metrics
	// 				await logAIUsage({
	// 					mapId: context.mapId,
	// 					messageCount: sanitizedMessages.length,
	// 					contextSize: mapContext.length,
	// 					model: modelPreferences.model || 'gpt-4o-mini',
	// 					completionTokens: result.usage?.completionTokens,
	// 					promptTokens: result.usage?.promptTokens,
	// 					totalTokens: result.usage?.totalTokens,
	// 				});
	// 			},
	// 		});
	// 		// Add security headers to response
	// 		const response = result.toDataStreamResponse();
	// 		response.headers.set('X-Content-Type-Options', 'nosniff');
	// 		response.headers.set('X-Frame-Options', 'DENY');
	// 		response.headers.set('X-XSS-Protection', '1; mode=block');
	// 		// Add rate limit headers
	// 		Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
	// 			response.headers.set(key, value);
	// 		});
	// 		return response;
	// 	} catch (error) {
	// 		console.error('Chat API Error:', error);
	// 		// Handle validation errors
	// 		if (error instanceof z.ZodError) {
	// 			return new Response(
	// 				JSON.stringify({
	// 					error: 'Invalid request data',
	// 					details: error.issues.map((issue) => ({
	// 						path: issue.path.join('.'),
	// 						message: issue.message,
	// 					})),
	// 					code: 'VALIDATION_ERROR',
	// 				}),
	// 				{
	// 					status: 400,
	// 					headers: {
	// 						'Content-Type': 'application/json',
	// 						'X-Content-Type-Options': 'nosniff',
	// 					},
	// 				}
	// 			);
	// 		}
	// 		// Handle other errors with security headers
	// 		return new Response(
	// 			JSON.stringify({
	// 				error: 'Failed to process chat request',
	// 				message:
	// 					process.env.NODE_ENV === 'development'
	// 						? error instanceof Error
	// 							? error.message
	// 							: 'Unknown error'
	// 						: 'Internal server error',
	// 				code: 'INTERNAL_ERROR',
	// 			}),
	// 			{
	// 				status: 500,
	// 				headers: {
	// 					'Content-Type': 'application/json',
	// 					'X-Content-Type-Options': 'nosniff',
	// 				},
	// 			}
	// 		);
	// 	}
	// }
	// // Build enhanced context from mind map data
	// async function buildMapContext(
	// 	context: z.infer<typeof contextSchema>
	// ): Promise<string> {
	// 	let contextString = '';
	// 	// Add map information
	// 	if (context.mapTitle) {
	// 		contextString += `Mind Map: ${context.mapTitle}\n\n`;
	// 	}
	// 	// Add selected nodes context
	// 	if (context.selectedNodeIds.length > 0 && context.nodes) {
	// 		const selectedNodes = context.nodes.filter((node: AppNode) =>
	// 			context.selectedNodeIds.includes(node.id)
	// 		);
	// 		if (selectedNodes.length > 0) {
	// 			contextString += 'Selected Nodes:\n';
	// 			selectedNodes.forEach((node: AppNode, index: number) => {
	// 				contextString += `${index + 1}. ${node.data.content || 'Untitled'} (Type: ${node.data.node_type || 'default'})\n`;
	// 				// Add metadata if available
	// 				if (node.data.metadata?.title) {
	// 					contextString += `   Title: ${node.data.metadata.title}\n`;
	// 				}
	// 				if (node.data.metadata?.summary) {
	// 					contextString += `   Summary: ${node.data.metadata.summary}\n`;
	// 				}
	// 				if (node.data.tags && node.data.tags.length > 0) {
	// 					contextString += `   Tags: ${node.data.tags.join(', ')}\n`;
	// 				}
	// 			});
	// 			contextString += '\n';
	// 		}
	// 	}
	// 	// Add nearby nodes for broader context
	// 	if (context.nodes && context.selectedNodeIds.length > 0) {
	// 		const nearbyNodes = getNearbyNodes(
	// 			context.nodes,
	// 			context.edges || [],
	// 			context.selectedNodeIds
	// 		);
	// 		if (nearbyNodes.length > 0) {
	// 			contextString += 'Related Nodes:\n';
	// 			nearbyNodes.slice(0, 5).forEach((node: AppNode, index: number) => {
	// 				contextString += `${index + 1}. ${node.data.content || 'Untitled'}\n`;
	// 			});
	// 			contextString += '\n';
	// 		}
	// 	}
	// 	// Add recent conversation history
	// 	if (context.conversationHistory.length > 0) {
	// 		contextString += 'Recent Conversation:\n';
	// 		context.conversationHistory.slice(-3).forEach((message, index) => {
	// 			const role = message.role === 'user' ? 'User' : 'Assistant';
	// 			contextString += `${role}: ${message.content.substring(0, 150)}${message.content.length > 150 ? '...' : ''}\n`;
	// 		});
	// 		contextString += '\n';
	// 	}
	// 	return contextString;
	// }
	// // Helper function to find nearby nodes
	// function getNearbyNodes(
	// 	nodes: AppNode[],
	// 	edges: AppEdge[],
	// 	selectedNodeIds: string[]
	// ): AppNode[] {
	// 	const nearbyNodeIds = new Set<string>();
	// 	// Find nodes connected to selected nodes
	// 	selectedNodeIds.forEach((nodeId) => {
	// 		edges.forEach((edge) => {
	// 			if (edge.source === nodeId) {
	// 				nearbyNodeIds.add(edge.target);
	// 			}
	// 			if (edge.target === nodeId) {
	// 				nearbyNodeIds.add(edge.source);
	// 			}
	// 		});
	// 	});
	// 	// Remove selected nodes from nearby set
	// 	selectedNodeIds.forEach((id) => nearbyNodeIds.delete(id));
	// 	// Return nodes that are nearby
	// 	return nodes.filter((node) => nearbyNodeIds.has(node.id));
	// }
	// // Log AI usage for analytics and monitoring
	// async function logAIUsage(data: {
	// 	mapId: string;
	// 	messageCount: number;
	// 	contextSize: number;
	// 	model: string;
	// 	completionTokens?: number;
	// 	promptTokens?: number;
	// 	totalTokens?: number;
	// }) {
	// 	try {
	// 		// This would typically integrate with your analytics system
	// 		console.log('AI Usage:', {
	// 			...data,
	// 			timestamp: new Date().toISOString(),
	// 		});
	// 		// Future: Store in database or send to analytics service
	// 		// await storeAIUsage(data);
	// 	} catch (error) {
	// 		console.error('Failed to log AI usage:', error);
	// 		// Don't throw - logging failures shouldn't break the main flow
	// 	}
}
