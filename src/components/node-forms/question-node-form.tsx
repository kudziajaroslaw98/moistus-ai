import { NodeData } from '@/types/node-data';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface QuestionNodeFormProps {
	initialData: Partial<NodeData>;
}

const QuestionNodeForm = forwardRef<
	{ getFormData: () => Partial<NodeData> | null },
	QuestionNodeFormProps
>(({ initialData }, ref) => {
	const [content, setContent] = useState(initialData?.content || '');
	const [requestAiAnswer, setRequestAiAnswer] = useState(
		initialData.aiData?.requestAiAnswer === true && !initialData.aiData.aiAnswer
	);
	const [existingAiAnswer, setExistingAiAnswer] = useState(
		(initialData.aiData?.aiAnswer as string) ?? null
	);

	useEffect(() => {
		setContent(initialData?.content || '');
		const hasAnswer = !!initialData.aiData?.aiAnswer;
		setExistingAiAnswer((initialData.aiData?.aiAnswer as string) ?? null);
		setRequestAiAnswer(
			initialData.aiData?.requestAiAnswer === true && !hasAnswer
		);
	}, [initialData]);

	const handleClearAiAnswer = () => {
		setExistingAiAnswer('');
		setRequestAiAnswer(false); // Reset request flag as well, user can re-check if needed
	};

	useImperativeHandle(ref, () => ({
		getFormData: () => {
			const aiDataUpdate: Record<string, unknown> = {
				...(initialData.aiData || {}),
				requestAiAnswer: requestAiAnswer,
				aiAnswer: existingAiAnswer,
			};

			if (!existingAiAnswer) {
				aiDataUpdate.aiAnswer = null;
			}

			return {
				content: content.trim(),
				aiData: aiDataUpdate,
			};
		},
	}));

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-2'>
				<label
					htmlFor='questionContent'
					className='text-sm font-medium text-zinc-400'
				>
					Question Content
				</label>

				<textarea
					id='questionContent'
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={6}
					className='w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none'
					placeholder='Enter your question here...'
				/>
			</div>

			{existingAiAnswer && (
				<div className='flex flex-col gap-2'>
					<div className='flex justify-between items-center'>
						<label className='text-sm font-medium text-zinc-400'>
							AI Generated Answer
						</label>

						<button
							type='button'
							onClick={handleClearAiAnswer}
							className='text-xs text-red-400 hover:text-red-300 disabled:opacity-50'
						>
							Clear Answer
						</button>
					</div>

					<div className='prose prose-sm prose-invert max-w-none rounded-md border border-zinc-700 bg-zinc-800 p-3 text-zinc-200'>
						<p>{existingAiAnswer}</p>
					</div>
				</div>
			)}

			<div className='flex items-center gap-2'>
				<input
					type='checkbox'
					id='requestAiAnswer'
					checked={requestAiAnswer}
					onChange={(e) => setRequestAiAnswer(e.target.checked)}
					disabled={!!existingAiAnswer}
					className='h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500 disabled:opacity-50'
				/>

				<label
					htmlFor='requestAiAnswer'
					className={`text-sm ${!!existingAiAnswer ? 'text-zinc-500' : 'text-zinc-300'}`}
				>
					Generate answer with AI
				</label>
			</div>
		</div>
	);
});

QuestionNodeForm.displayName = 'QuestionNodeForm';

export default QuestionNodeForm;
