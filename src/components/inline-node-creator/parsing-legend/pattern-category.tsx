'use client';

import { memo } from 'react';
import type { PatternCategoryProps } from '../types';
import { PatternItem } from './pattern-item';

const theme = {
	category: {
		wrapper: 'space-y-2',
		title: 'text-xs font-semibold text-zinc-500 uppercase tracking-wider',
	},
};

const categoryLabels: Record<string, string> = {
	metadata: 'Metadata',
	formatting: 'Formatting',
	structure: 'Structure',
	content: 'Content',
};

export const PatternCategory: React.FC<PatternCategoryProps> = memo(
	({ category, patterns, onPatternClick }) => {
		if (!patterns || patterns.length === 0) {
			return null;
		}

		return (
			<div className={theme.category.wrapper}>
				<h3 className={theme.category.title}>
					{categoryLabels[category] || category}
				</h3>

				<div className='space-y-1'>
					{patterns.map((pattern, index) => (
						<PatternItem
							key={`${pattern.pattern}-${index}`}
							pattern={pattern}
							onClick={onPatternClick}
							isInteractive
						/>
					))}
				</div>
			</div>
		);
	}
);

PatternCategory.displayName = 'PatternCategory';
