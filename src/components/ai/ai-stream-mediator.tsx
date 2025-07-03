'use client';

import { suggestionObjectSchema } from '@/app/api/ai/suggestions/route';
import useAppStore from '@/store/mind-map-store';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
import z from 'zod';
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

	// const { completion, complete, isLoading, error } = useCompletion({
	// 	api: streamTrigger?.api,
	// });
	const { object, submit } = useObject({
		api: streamTrigger?.api ?? '',
		schema: z.array(suggestionObjectSchema),
		onFinish: (event) => {
			console.dir(event, { depth: 0 });
			finishStream(streamTrigger?.id);
			currentStreamIdRef.current = '';
		},
		onError: (error) => {
			abortStream(error.message);
			currentStreamIdRef.current = '';
		},
	});
	const currentStreamIdRef = useRef<string>('');
	const chunks = useRef<unknown[]>([]);

	// This effect triggers the AI generation when the store state changes.
	useEffect(() => {
		if (
			streamTrigger &&
			streamTrigger !== null &&
			currentStreamIdRef.current !== streamTrigger.id &&
			isStreaming
		) {
			const bodyPayload = {
				...streamTrigger.body,
				// Include any other data your API needs, like nodes/edges
			};
			currentStreamIdRef.current = streamTrigger.id;

			submit(bodyPayload);
			// complete('', {
			// 	body: bodyPayload,
			// 	// You can add headers if needed
			// });
		}
	}, [streamTrigger?.id, streamTrigger?.body, isStreaming, submit]);

	// This effect listens for changes from the hook and updates the store.
	useEffect(() => {
		if (!streamTrigger || streamTrigger === null) return;

		if (object) {
			chunks.current = object;

			if (chunks.current.length > 0) {
				streamTrigger.onStreamChunk({
					...object?.[chunks.current.length - 1],
					index: chunks.current.length - 1,
				});
			}
			// updateStreamContent(streamTrigger.id, object);
		}
	}, [object, streamTrigger]);

	// // This effect handles the end of the stream (success or error).
	// useEffect(() => {
	// 	if (!streamTrigger) return;

	// 	if (!isLoading && (object || error)) {
	// 		if (error) {
	// 			console.error('AI Stream Error:', error);
	// 			abortStream(error.message);
	// 			currentStreamIdRef.current = '';
	// 		} else {
	// 			finishStream(streamTrigger.id);
	// 			currentStreamIdRef.current = '';
	// 		}
	// 	}
	// }, [isLoading, object, error, streamTrigger, finishStream, abortStream]);

	// This component does not render anything.
	return null;
}
