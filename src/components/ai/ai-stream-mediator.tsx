'use client';

import useAppStore from '@/store/mind-map-store';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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
				isStreaming: state.isStreaming,
			}))
		);

	const currentStreamIdRef = useRef<string | null>(null);

	const { sendMessage, setMessages } = useChat({
		id: `${streamTrigger?.id || 'unknown'}`,
		transport: new DefaultChatTransport({
			api: streamingAPI ?? '/api/chat',
		}),
		onData: (data) => {
			streamTrigger?.onStreamChunk(data);
		},
		onError: (error) => {
			console.error('Chat error:', error);

			if (currentStreamIdRef.current) {
				abortStream(error.message);
				currentStreamIdRef.current = null;
			}
		},

		onFinish: () => {
			console.log('stream finish');

			if (currentStreamIdRef.current) {
				finishStream(currentStreamIdRef.current);
				currentStreamIdRef.current = null;
			}
		},
	});

	useEffect(() => {
		if (
			streamTrigger &&
			streamingAPI !== null &&
			streamTrigger.id !== null &&
			streamTrigger.id !== currentStreamIdRef.current
		) {
			currentStreamIdRef.current = streamTrigger.id;
			setMessages([]);
			sendMessage({
				text: JSON.stringify(streamTrigger.body),
			});
		}
	}, [streamTrigger, setMessages, sendMessage, streamingAPI]);

	return null; // This component is headless
}
