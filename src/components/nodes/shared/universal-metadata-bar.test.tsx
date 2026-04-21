import type { SharedUser } from '@/types/sharing-types';
import { render, screen } from '@testing-library/react';
import {
	__resetWarnOnceCache,
	UniversalMetadataBar,
} from './universal-metadata-bar';

let mockCurrentShares: SharedUser[] = [];

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) =>
		selector({
			currentShares: mockCurrentShares,
		})
	),
}));

function createSharedUser(overrides: Partial<SharedUser> = {}): SharedUser {
	const base: SharedUser = {
		id: 'share-1',
		user_id: 'user-1',
		name: 'User One',
		email: 'user1@example.com',
		avatar_url: '',
		share: {
			id: 'share-1',
			map_id: 'map-1',
			user_id: 'user-1',
			can_edit: true,
			can_comment: true,
			can_view: true,
			role: 'editor',
			shared_by: 'owner-1',
			shared_at: '2026-04-20T10:00:00.000Z',
			created_at: '2026-04-20T10:00:00.000Z',
			updated_at: '2026-04-20T10:00:00.000Z',
		},
		isAnonymous: false,
		profile: {
			display_name: 'User One',
			role: 'editor',
		},
	};

	return {
		...base,
		...overrides,
		share: { ...base.share, ...(overrides.share ?? {}) },
		profile: { ...base.profile, ...(overrides.profile ?? {}) },
	};
}

describe('UniversalMetadataBar assignee resolution', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		__resetWarnOnceCache();
		mockCurrentShares = [];
	});

	it('resolves assignee display by slug match', () => {
		mockCurrentShares = [
			createSharedUser({
				user_id: 'user-speed',
				name: 'Speed Dota',
				profile: { display_name: 'Speed Dota', role: 'editor' },
			}),
		];

		render(
			<UniversalMetadataBar
				metadata={{ assignee: ['speed-dota'] }}
				nodeType='taskNode'
			/>
		);

		expect(screen.getByText('Speed Dota')).toBeInTheDocument();
	});

	it('resolves assignee by assigneeUserIds when slug is stale', () => {
		mockCurrentShares = [
			createSharedUser({
				user_id: 'user-2',
				name: 'Renamed User',
				profile: { display_name: 'Renamed User', role: 'editor' },
			}),
		];

		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

		render(
			<UniversalMetadataBar
				metadata={{
					assignee: ['old-stale-slug'],
					assigneeUserIds: ['user-2'],
				}}
				nodeType='taskNode'
			/>
		);

		expect(screen.getByText('Renamed User')).toBeInTheDocument();
		expect(warnSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
	});

	it('warns unresolved assignee only once per key in development', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const envReplace = jest.replaceProperty(process, 'env', {
			...process.env,
			NODE_ENV: 'development',
		});

		try {
			const { rerender } = render(
				<UniversalMetadataBar
					metadata={{ assignee: ['speededota2'] }}
					nodeType='taskNode'
				/>
			);

			rerender(
				<UniversalMetadataBar
					metadata={{ assignee: ['speededota2'] }}
					nodeType='taskNode'
				/>
			);

			rerender(
				<UniversalMetadataBar
					metadata={{ assignee: ['speededota2'] }}
					nodeType='taskNode'
				/>
			);

			expect(warnSpy).toHaveBeenCalledTimes(1);
		} finally {
			envReplace.restore();
			warnSpy.mockRestore();
		}
	});
});
