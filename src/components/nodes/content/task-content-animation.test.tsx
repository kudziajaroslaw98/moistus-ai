import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { TaskContent } from './task-content';

jest.mock('motion/react', () => {
	const React = require('react') as typeof import('react');

	type MotionDivProps = ComponentProps<'div'> & {
		animate?: unknown;
		children?: ReactNode;
		initial?: unknown;
		transition?: unknown;
	};

	const serializeMotionProp = (value: unknown) => {
		if (value === false) return 'false';
		if (!value) return '';
		return JSON.stringify(value);
	};

	return {
		motion: {
			div: ({
				animate,
				children,
				initial,
				transition: _transition,
				...props
			}: MotionDivProps) =>
				React.createElement(
					'div',
					{
						...props,
						'data-motion-animate': serializeMotionProp(animate),
						'data-motion-initial': serializeMotionProp(initial),
					},
					children
				),
		},
	};
});

describe('TaskContent task animation defaults', () => {
	it('animates task rows by default outside preview mode', () => {
		render(
			<TaskContent
				tasks={[{ id: 'task-1', text: 'Default animation', isComplete: false }]}
			/>
		);

		expect(
			screen.getByRole('checkbox', { name: /default animation/i })
		).toHaveAttribute(
			'data-motion-initial',
			JSON.stringify({ opacity: 0, x: -10 })
		);
	});

	it('can render task rows without entry animation', () => {
		render(
			<TaskContent
				animateTasks={false}
				tasks={[{ id: 'task-1', text: 'Static preview', isComplete: false }]}
			/>
		);

		expect(
			screen.getByRole('checkbox', { name: /static preview/i })
		).toHaveAttribute('data-motion-initial', 'false');
	});
});
