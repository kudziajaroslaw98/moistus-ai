import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PreviewNodeRenderer } from './preview-node-renderer';

const mockTaskContentProps: Array<Record<string, unknown>> = [];

jest.mock('@/components/nodes/content/task-content', () => ({
	TaskContent: (props: Record<string, unknown>) => {
		mockTaskContentProps.push(props);
		return (
			<div
				data-animate-tasks={String(props.animateTasks)}
				data-testid='task-content'
			/>
		);
	},
}));

jest.mock('@/components/nodes/content/annotation-content', () => ({
	AnnotationContent: () => <div />,
}));

jest.mock('@/components/nodes/content/code-content', () => ({
	CodeContent: () => <div />,
}));

jest.mock('@/components/nodes/content/image-content', () => ({
	ImageContent: () => <div />,
}));

jest.mock('@/components/nodes/content/markdown-content', () => ({
	MarkdownContent: () => <div />,
}));

jest.mock('@/components/nodes/content/question-content', () => ({
	QuestionContent: () => <div />,
}));

jest.mock('@/components/nodes/content/reference-content', () => ({
	ReferenceContent: () => <div />,
}));

jest.mock('@/components/nodes/content/resource-content', () => ({
	ResourceContent: () => <div />,
}));

jest.mock('@/components/nodes/content/text-content', () => ({
	TextContent: () => <div />,
}));

jest.mock('./preview-node-frame', () => ({
	PreviewNodeFrame: ({ children }: { children: ReactNode }) => (
		<div data-testid='preview-node-frame'>{children}</div>
	),
}));

jest.mock('./preview-scale-container', () => ({
	PreviewScaleContainer: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}));

jest.mock('./preview-mode-context', () => ({
	PreviewModeProvider: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}));

jest.mock('./transform-preview-data', () => ({
	transformPreviewToNodeData: () => ({
		id: 'preview-node',
		map_id: 'preview-map',
		parent_id: null,
		content: 'Tasks',
		position_x: 0,
		position_y: 0,
		node_type: 'taskNode',
		created_at: '2026-04-26T00:00:00.000Z',
		updated_at: '2026-04-26T00:00:00.000Z',
		metadata: {
			tasks: [{ id: 'task-1', text: 'Review layout', isComplete: false }],
		},
	}),
}));

describe('PreviewNodeRenderer', () => {
	beforeEach(() => {
		mockTaskContentProps.length = 0;
	});

	it('disables task row animation for task node previews', () => {
		render(
			<PreviewNodeRenderer
				nodeType='taskNode'
				preview={{ content: 'Review layout' }}
			/>
		);

		expect(screen.getByTestId('task-content')).toHaveAttribute(
			'data-animate-tasks',
			'false'
		);
		expect(mockTaskContentProps[0]).toEqual(
			expect.objectContaining({ animateTasks: false })
		);
	});
});
