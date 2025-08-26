'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface ExamplesSectionProps {
	examples: string[];
	hasValue: boolean;
	onUseExample: (example: string) => void;
	className?: string;
}

const theme = {
	container: 'text-xs text-zinc-500 mt-2',
	label: 'mb-2',
	examplesGrid: 'flex flex-wrap gap-2',
	exampleButton:
		'text-teal-500 hover:text-teal-400 cursor-pointer transition-colors px-2 py-1 rounded bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/50 hover:border-teal-500/30',
	expandButton: 'text-zinc-400 hover:text-zinc-300 cursor-pointer ml-2',
};

const MAX_VISIBLE_EXAMPLES = 3;

export const ExamplesSection: React.FC<ExamplesSectionProps> = ({
	examples,
	hasValue,
	onUseExample,
	className,
}) => {
	const [showAll, setShowAll] = useState(false);

	if (!examples || examples.length === 0 || hasValue) {
		return null;
	}

	const visibleExamples = showAll
		? examples
		: examples.slice(0, MAX_VISIBLE_EXAMPLES);
	const hasMoreExamples = examples.length > MAX_VISIBLE_EXAMPLES;

	return (
		<AnimatePresence>
			<motion.div
				className={`${theme.container} ${className || ''}`}
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.3, duration: 0.3, ease: 'easeOut' }}
			>
				<div className={theme.label}>
					<span>Try these examples:</span>

					{hasMoreExamples && (
						<motion.button
							onClick={() => setShowAll(!showAll)}
							className={theme.expandButton}
							type='button'
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ duration: 0.1 }}
						>
							{showAll ? 'Show less' : `Show all (${examples.length})`}
						</motion.button>
					)}
				</div>

				<div className={theme.examplesGrid}>
					{visibleExamples.map((example, index) => (
						<motion.button
							key={`${example}-${index}`}
							onClick={() => onUseExample(example)}
							className={theme.exampleButton}
							type='button'
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							initial={{ opacity: 0, y: 5 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 * index, duration: 0.2 }}
						>
							{example}
						</motion.button>
					))}
				</div>

				{hasMoreExamples && !showAll && (
					<motion.div
						className='mt-1 text-zinc-600'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4, duration: 0.2 }}
					>
						+{examples.length - MAX_VISIBLE_EXAMPLES} more examples
					</motion.div>
				)}
			</motion.div>
		</AnimatePresence>
	);
};
