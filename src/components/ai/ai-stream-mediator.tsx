'use client';

import useAppStore from '@/store/mind-map-store';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';

export function AIStreamMediator() {
	const { streamTrigger, abortStream, finishStream, streamingAPI } =
		useAppStore(
			useShallow((state) => ({
				streamTrigger: state.streamTrigger,
				abortStream: state.abortStream,
				finishStream: state.finishStream,
				streamingAPI: state.streamingAPI,
			}))
		);

	const processedChunksCountRef = useRef(0);
	const currentStreamIdRef = useRef<string | null>(null);

	const { messages, sendMessage, setMessages, error } = useChat({
		transport: new DefaultChatTransport({
			api: '/api/ai/suggest-connections',
		}),
		onFinish: () => {
			if (currentStreamIdRef.current) {
				finishStream(currentStreamIdRef.current);
				currentStreamIdRef.current = null;
			}
		},
	});

	// Effect 1: Trigger the stream when requested by the store
	useEffect(() => {
		if (
			streamTrigger &&
			streamingAPI !== null &&
			streamTrigger.id !== null &&
			streamTrigger.id !== currentStreamIdRef.current
		) {
			currentStreamIdRef.current = streamTrigger.id;
			processedChunksCountRef.current = 0; // Reset chunk count for the new stream
			setMessages([]); // Start with a clean slate for this new process

			sendMessage({
				text: JSON.stringify(streamTrigger.body),
			});
		}
	}, [streamTrigger, sendMessage, streamingAPI, setMessages]);

	// Effect 2: Process new chunks from the stream as they arrive
	useEffect(() => {
		if (!streamTrigger) return;

		const lastMessage = messages[messages.length - 1];

		console.dir(lastMessage, { depth: null });

		if (lastMessage?.role === 'assistant' && Array.isArray(lastMessage.parts)) {
			const allChunks = lastMessage.parts;
			const newChunks: UIMessage['parts'] = allChunks.slice(
				processedChunksCountRef.current
			);

			if (newChunks.length > 0) {
				for (const chunk of newChunks) {
					// The mediator calls the specific callback provided by the trigger
					streamTrigger.onStreamChunk(chunk);
				}

				processedChunksCountRef.current = allChunks.length;
			}
		}
	}, [messages, streamTrigger]);

	// Effect 3: Handle any top-level stream errors
	useEffect(() => {
		if (error) {
			abortStream(error.message);
			currentStreamIdRef.current = null;
		}
	}, [error, abortStream]);

	return null; // This component is headless
}
