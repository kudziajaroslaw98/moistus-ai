import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionNode from './question-node';

let mockCanEdit = true;
const mockUpdateNode = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => ({ canEdit: mockCanEdit }),
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector({ updateNode: mockUpdateNode, selectedNodes: [] }),
}));

jest.mock('./components/node-toolbar', () => ({
	SharedNodeToolbar: () => null,
}));

jest.mock('./base-node-wrapper', () => ({
	BaseNodeWrapper: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

function renderQuestion(content: string, metadata: Record<string, unknown> = {}) {
	const props = {
		id: 'question-1',
		selected: false,
		data: {
			id: 'question-1',
			content,
			node_type: 'questionNode',
			metadata,
		},
	} as unknown as React.ComponentProps<typeof QuestionNode>;

	return render(<QuestionNode {...props} />);
}

describe('QuestionNode answers', () => {
	beforeEach(() => {
		mockCanEdit = true;
		mockUpdateNode.mockClear();
	});

	it('records an answer for someone who can edit', async () => {
		renderQuestion('Ship it? [yes/no]', { questionType: 'binary' });
		mockUpdateNode.mockClear();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Yes' }));

		expect(mockUpdateNode).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: 'question-1',
				data: {
					metadata: expect.objectContaining({
						userResponse: true,
						isAnswered: true,
					}),
				},
			})
		);
	});

	it('shows the answer buttons disabled for someone who cannot edit', () => {
		mockCanEdit = false;
		renderQuestion('Ship it? [yes/no]', { questionType: 'binary' });

		expect(screen.getByRole('button', { name: 'Yes' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'No' })).toBeDisabled();
	});

	it('disables multiple-choice options for someone who cannot edit', () => {
		mockCanEdit = false;
		renderQuestion('Pick one [Red, Green]', { questionType: 'multiple' });

		for (const option of screen.getAllByRole('button')) {
			expect(option).toBeDisabled();
		}
	});

	it('writes nothing on mount for someone who cannot edit', () => {
		mockCanEdit = false;
		renderQuestion('Pick one [Red, Green]');

		expect(mockUpdateNode).not.toHaveBeenCalled();
	});

	it('still normalizes the options on mount for someone who can edit', () => {
		renderQuestion('Pick one [Red, Green]');

		expect(mockUpdateNode).toHaveBeenCalledTimes(1);
	});
});
