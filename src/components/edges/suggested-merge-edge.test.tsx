import useAppStore from '@/store/mind-map-store';
import { render, screen } from '@testing-library/react';
import { Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import { SuggestedMergeEdge } from './suggested-merge-edge';

jest.mock('@xyflow/react', () => ({
	BaseEdge: ({
		path,
	}: {
		path?: string;
	}) => <div data-testid='base-edge' data-path={path} />,
	EdgeLabelRenderer: ({ children }: { children?: ReactNode }) => <>{children}</>,
	getSmoothStepPath: jest.fn(() => ['M 0 0 L 1 1', 120, 60]),
	Position: {
		Top: 'top',
		Bottom: 'bottom',
		Left: 'left',
		Right: 'right',
	},
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUseAppStore = useAppStore as unknown as jest.Mock;

describe('SuggestedMergeEdge', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAppStore.mockImplementation((selector) =>
			selector({
				acceptMerge: jest.fn().mockResolvedValue(undefined),
				rejectMerge: jest.fn(),
			})
		);
	});

	it('renders merge label wrapper with elevated z-index', () => {
		const { container } = render(
			<SuggestedMergeEdge
				id='merge-edge-1'
				source='node-1'
				target='node-2'
				sourceX={20}
				sourceY={30}
				targetX={240}
				targetY={150}
				sourcePosition={Position.Right}
				targetPosition={Position.Left}
				selected={false}
				data={{
					id: 'merge-edge-1',
					map_id: 'map-1',
					user_id: 'system',
					source: 'node-1',
					target: 'node-2',
					type: 'suggestedMerge',
					label: null,
					created_at: '2026-04-20T00:00:00.000Z',
					updated_at: '2026-04-20T00:00:00.000Z',
					animated: true,
					metadata: {
						pathType: 'smoothstep',
						interactionMode: 'both',
					},
					aiData: {
						isSuggested: true,
						suggestion: {
							node1Id: 'node-1',
							node2Id: 'node-2',
							reason: 'Merge duplicates',
							confidence: 0.9,
							similarityScore: 0.88,
						},
						confidence: 0.9,
						reason: 'Merge duplicates',
						similarityScore: 0.88,
					},
				}}
			/>
		);

		expect(screen.getByText('Merge Suggestion')).toBeInTheDocument();
		const wrappers = container.querySelectorAll('div[style*="z-index: 51000"]');
		expect(wrappers.length).toBeGreaterThan(0);
	});
});
