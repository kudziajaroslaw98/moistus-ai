'use client';

import useAppStore from '@/store/mind-map-store';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

export function AIStreamMediator() {
	const { streamTrigger, abortStream, finishStream, streamingAPI, setStopStreamCallback, setPopoverOpen } =
		useAppStore(
			useShallow((state) => ({
				streamTrigger: state.streamTrigger,
				abortStream: state.abortStream,
				finishStream: state.finishStream,
				streamingAPI: state.streamingAPI,
				isStreaming: state.isStreaming,
				setStopStreamCallback: state.setStopStreamCallback,
				setPopoverOpen: state.setPopoverOpen,
			}))
		);

	const currentStreamIdRef = useRef<string | null>(null);

	const { sendMessage, setMessages, stop } = useChat({
		id: `${streamTrigger?.id || 'unknown'}`,
		transport: new DefaultChatTransport({
			api: streamingAPI ?? '/api/chat',
		}),
		onData: (data) => {
			streamTrigger?.onStreamChunk(data);
		},
		onError: (error) => {
			console.error('Chat error:', error);

			// Try to parse error for LIMIT_REACHED response
			let userMessage = error.message;
			try {
				const parsed = JSON.parse(error.message);
				userMessage = parsed.error ?? error.message;

				if (parsed.code === 'LIMIT_REACHED') {
					toast.error('AI feature limit reached', {
						description: 'Upgrade to Pro for unlimited AI features.',
						action: {
							label: 'Upgrade',
							onClick: () => setPopoverOpen({ upgradeUser: true }),
						},
						duration: 8000,
					});
				} else {
					// Parsed JSON but not LIMIT_REACHED - show generic error toast
					toast.error('AI request failed', {
						description: userMessage,
					});
				}
			} catch {
				// Not JSON, show generic error toast
				toast.error('AI request failed', {
					description: userMessage,
				});
			}

			if (currentStreamIdRef.current) {
				abortStream(userMessage);
				currentStreamIdRef.current = null;
			}
		},

		onFinish: () => {
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

	// Expose stop function to store whenever it changes
	useEffect(() => {
		setStopStreamCallback(() => stop);
	}, [stop, setStopStreamCallback]);

	return null; // This component is headless
}
