'use client';

import useAppStore from '@/store/mind-map-store';
import { useCompletion } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';

export function AIStreamMediator() {
	const streamTrigger = useAppStore((state) => state.streamTrigger);
	const { updateStreamContent, finishStream, abortStream, isStreaming } =
		useAppStore(
			useShallow((state) => ({
				isStreaming: state.isStreaming,
				updateStreamContent: state.updateStreamContent,
				finishStream: state.finishStream,
				abortStream: state.abortStream,
			}))
		);

	const { completion, complete, isLoading, error } = useCompletion({
		api: streamTrigger?.api,
	});
	const currentStreamIdRef = useRef<string>('');

	// This effect triggers the AI generation when the store state changes.
	useEffect(() => {
		console.log('trigger effect');
		console.dir(streamTrigger, { depth: 0 });
		console.log(currentStreamIdRef.current !== streamTrigger?.id);

		if (
			streamTrigger &&
			currentStreamIdRef.current !== streamTrigger.id &&
			isStreaming
		) {
			console.log('trigger effect in');
			const bodyPayload = {
				...streamTrigger.body,
				// Include any other data your API needs, like nodes/edges
			};

			complete('', {
				body: bodyPayload,
				// You can add headers if needed
			});
		}
	}, [streamTrigger, isStreaming, complete]);

	// This effect listens for changes from the hook and updates the store.
	useEffect(() => {
		if (!streamTrigger) return;

		if (completion) {
			updateStreamContent(streamTrigger.id, completion);
		}
	}, [completion, streamTrigger, updateStreamContent]);

	// This effect handles the end of the stream (success or error).
	useEffect(() => {
		if (!streamTrigger) return;

		if (!isLoading && (completion || error)) {
			if (error) {
				console.error('AI Stream Error:', error);
				abortStream(error.message);
				currentStreamIdRef.current = '';
			} else {
				finishStream(streamTrigger.id);
				currentStreamIdRef.current = '';
			}
		}
	}, [isLoading, completion, error, streamTrigger, finishStream, abortStream]);

	// This component does not render anything.
	return null;
}
