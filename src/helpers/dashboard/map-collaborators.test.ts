import {
	groupMapCollaborators,
	type CollaboratorRow,
} from './map-collaborators';

const row = (
	mapId: string,
	userId: string | null,
	extra: Partial<CollaboratorRow> = {}
): CollaboratorRow => ({
	map_id: mapId,
	user_id: userId,
	display_name: null,
	full_name: null,
	avatar_url: null,
	email: null,
	...extra,
});

describe('groupMapCollaborators', () => {
	it('groups rows by map and excludes the current user', () => {
		const result = groupMapCollaborators(
			[
				row('m1', 'me'),
				row('m1', 'u1', { display_name: 'Maya' }),
				row('m2', 'u2', { full_name: 'Jonas Berg' }),
			],
			'me'
		);

		expect(result.m1.collaboratorCount).toBe(1);
		expect(result.m1.collaborators[0]).toMatchObject({
			userId: 'u1',
			displayName: 'Maya',
		});
		expect(result.m2.collaborators[0].displayName).toBe('Jonas Berg');
	});

	it('dedupes a user listed twice on the same map', () => {
		const result = groupMapCollaborators(
			[row('m1', 'u1'), row('m1', 'u1')],
			'me'
		);

		expect(result.m1.collaboratorCount).toBe(1);
	});

	it('caps the list but keeps the full count', () => {
		const result = groupMapCollaborators(
			['a', 'b', 'c', 'd', 'e'].map((id) => row('m1', id)),
			'me',
			3
		);

		expect(result.m1.collaborators).toHaveLength(3);
		expect(result.m1.collaboratorCount).toBe(5);
	});

	it('keeps insertion order so callers can put the owner first', () => {
		const result = groupMapCollaborators(
			[row('m1', 'owner'), row('m1', 'u1')],
			'me'
		);

		expect(result.m1.collaborators.map((c) => c.userId)).toEqual([
			'owner',
			'u1',
		]);
	});

	it('ignores rows without a user id', () => {
		const result = groupMapCollaborators([row('m1', null)], 'me');

		expect(result.m1).toBeUndefined();
	});

	it('always resolves a display name and avatar', () => {
		const result = groupMapCollaborators(
			[row('m1', 'u1', { email: 'sam@example.com' })],
			'me'
		);
		const [collaborator] = result.m1.collaborators;

		expect(collaborator.displayName).toBe('sam');
		expect(collaborator.avatarUrl).toBeTruthy();
	});
});
