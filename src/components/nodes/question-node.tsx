'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import {
	AlertCircle,
	CheckCircle,
	CircleHelp,
	Clock,
	RefreshCw,
	Sparkles,
	X,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { Toggle } from '../ui/toggle';
import { BaseNodeWrapper } from './base-node-wrapper';

type QuestionNodeProps = NodeProps<Node<NodeData>>;

const QuestionNodeComponent = (props: QuestionNodeProps) => {
	const { id, data } = props;

	const { updateNode } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
		}))
	);

	const [isGenerating, setIsGenerating] = useState(false);
	const aiAnswer = data.aiData?.aiAnswer as string | undefined;
	const requestAiAnswer = Boolean(data.aiData?.requestAiAnswer);

	const handleNodeChange = useCallback(
		(change: Partial<NodeData['aiData']>) => {
			updateNode({
				nodeId: id,
				data: {
					aiData: {
						...data.aiData,
						...change,
					},
				},
			});
		},
		[updateNode, id, data.aiData]
	);

	const handleGenerateAnswer = useCallback(async () => {
		if (!data.content?.trim()) {
			toast.error('Please add a question first');
			return;
		}

		setIsGenerating(true);

		try {
			const response = await fetch('/api/generate-answer', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					nodeId: id,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to generate AI answer');
			}

			const reader = response.body?.getReader();

			if (!reader) {
				throw new Error('No response body');
			}

			let accumulatedAnswer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = new TextDecoder().decode(value);
				accumulatedAnswer += chunk;

				// Update the answer in real-time as it streams
				handleNodeChange({
					aiAnswer: accumulatedAnswer,
					requestAiAnswer: false,
				});
			}

			toast.success('AI answer generated successfully');
		} catch (error) {
			console.error('Error generating AI answer:', error);
			toast.error('Failed to generate AI answer');
			handleNodeChange({ requestAiAnswer: false });
		} finally {
			setIsGenerating(false);
		}
	}, [id, data.content, handleNodeChange]);

	const handleClearAnswer = useCallback(() => {
		handleNodeChange({
			aiAnswer: undefined,
			requestAiAnswer: false,
		});
		toast.success('AI answer cleared');
	}, [handleNodeChange]);

	const handleToggleRequest = useCallback(
		(pressed: boolean) => {
			if (pressed && !aiAnswer) {
				handleGenerateAnswer();
			} else {
				handleNodeChange({ requestAiAnswer: pressed });
			}
		},
		[aiAnswer, handleGenerateAnswer, handleNodeChange]
	);

	// Determine answer status
	const getAnswerStatus = useCallback(() => {
		if (isGenerating) return 'pending';
		if (aiAnswer) return 'answered';
		return 'none';
	}, [isGenerating, aiAnswer]);

	const answerStatus = getAnswerStatus();

	const toolbarContent = useMemo(
		() => (
			<>
				{/* AI Answer Toggle */}
				<Toggle
					size={'sm'}
					variant={'outline'}
					pressed={requestAiAnswer || !!aiAnswer}
					onPressedChange={handleToggleRequest}
					disabled={isGenerating}
					title={aiAnswer ? 'AI answer exists' : 'Request AI answer'}
				>
					<Sparkles className='w-4 h-4' />
				</Toggle>

				{/* Answer Status Indicator */}
				{answerStatus === 'pending' && (
					<div className='flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-600/20 text-yellow-400'>
						<Clock className='w-3 h-3 animate-spin' />
						Pending
					</div>
				)}

				{answerStatus === 'answered' && (
					<div className='flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-600/20 text-green-400'>
						<CheckCircle className='w-3 h-3' />
						Answered
					</div>
				)}

				{answerStatus === 'none' && (
					<div className='flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-600/20 text-gray-400'>
						<AlertCircle className='w-3 h-3' />
						None
					</div>
				)}

				{/* Regenerate Answer Button */}
				{aiAnswer && (
					<Button
						onClick={handleGenerateAnswer}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2'
						disabled={isGenerating}
						title='Regenerate AI answer'
					>
						<RefreshCw
							className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
						/>
					</Button>
				)}

				{/* Clear Answer Button */}
				{aiAnswer && (
					<Button
						onClick={handleClearAnswer}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2 text-red-400 hover:text-red-300'
						disabled={isGenerating}
						title='Clear AI answer'
					>
						<X className='w-4 h-4' />
					</Button>
				)}
			</>
		),
		[
			requestAiAnswer,
			aiAnswer,
			isGenerating,
			answerStatus,
			handleToggleRequest,
			handleGenerateAnswer,
			handleClearAnswer,
		]
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='question-node'
			nodeType='Question'
			nodeIcon={<CircleHelp className='size-4' />}
			toolbarContent={toolbarContent}
		>
			{/* Content Area - now display only */}
			<div className='text-node-text-main text-xl font-bold tracking-tight leading-5 text-center'>
				{data.content || (
					<span className='text-zinc-500 italic'>
						Double click or click the menu to add content...
					</span>
				)}
			</div>

			{aiAnswer && (
				<div className='mt-4 flex flex-col gap-4 w-full'>
					<div className='text-center text-sm font-medium text-node-text-secondary w-full relative'>
						<hr className='bg-node-accent w-full h-0.5 border-0 top-1/2 left-0 absolute z-1' />

						<span className='relative px-4 py-1 font-lora font-semibold bg-node-accent rounded-md text-node-text-main z-10'>
							AI Answer
						</span>
					</div>

					<div className='w-full text-left text-sm text-node-text-secondary whitespace-normal'>
						{aiAnswer}
					</div>
				</div>
			)}
		</BaseNodeWrapper>
	);
};

const QuestionNode = memo(QuestionNodeComponent);
QuestionNode.displayName = 'QuestionNode';
export default QuestionNode;
