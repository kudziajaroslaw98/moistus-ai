import type { HistoryPresentation } from '@/helpers/history/presentation';
import { toHistoryEntryViewModel } from './history-entry-view-model';

describe('toHistoryEntryViewModel', () => {
	it('prefers server/client presentation summaries over raw action names', () => {
		const presentation: HistoryPresentation = {
			title: 'Tags updated',
			summary: 'Tags updated',
			summaryDetail: 'Tags updated on 1 node.',
			subjectPreview: 'Default node #abc12345',
			subjects: [],
			movedNodeCount: 0,
			reroutedConnectionCount: 0,
			technicalChanges: [],
		};

		const viewModel = toHistoryEntryViewModel({
			meta: {
				id: 'event-1',
				type: 'event',
				actionName: 'saveNodeProperties',
				timestamp: 1_775_000_000_000,
			},
			delta: null,
			presentation,
			currentUserId: 'user-1',
		});

		expect(viewModel.headline).toBe('Tags updated');
		expect(viewModel.headline).not.toBe('saveNodeProperties');
		expect(viewModel.subjectPreview).toBe('Default node #abc12345');
	});

	it('keeps one affected subject inline with its focus target', () => {
		const viewModel = toHistoryEntryViewModel({
			meta: {
				id: 'event-1',
				type: 'event',
				actionName: 'moveNodes',
				timestamp: 1_775_000_000_000,
				subjects: [
					{
						id: '582c4ca1-full',
						type: 'node',
						label: 'Default node #582c4ca1',
						nodeType: 'default node',
						position: { x: 10, y: 20 },
					},
				],
			},
			delta: null,
			presentation: null,
			currentUserId: 'user-1',
		});

		expect(viewModel.inlineSubject?.label).toBe('Default node #582c4ca1');
		expect(viewModel.mobileFocusTarget).toMatchObject({
			type: 'node',
			nodeId: '582c4ca1-full',
		});
	});
});
