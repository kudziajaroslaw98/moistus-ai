import type { AiContentPromptModalProps } from '@/types/ai-content-prompt-modal-props';
import { useState } from 'react';
import Modal from '../modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function AiContentPromptModal({
	isOpen,
	onClose,
	onGenerate,
	isLoading,
}: AiContentPromptModalProps) {
	const [prompt, setPrompt] = useState('');

	const handleGenerateClick = () => {
		onGenerate(prompt);
	};

	return (
		<Modal isOpen={isOpen} title='Generate Content (AI)' onClose={onClose}>
			<div className='flex flex-col gap-4'>
				<p className='text-sm text-zinc-300'>
					Enter an optional prompt to guide the AI content generation for the
					selected node. Leave blank for a general expansion based on current
					content.
				</p>

				<Input
					disabled={isLoading}
					placeholder='e.g., Explain in simpler terms, Add examples...'
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
				/>

				<Button
					disabled={isLoading}
					variant='default'
					onClick={handleGenerateClick}
				>
					{isLoading ? 'Generating...' : 'Generate Content'}
				</Button>
			</div>
		</Modal>
	);
}
