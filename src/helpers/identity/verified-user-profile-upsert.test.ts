import { buildVerifiedUserProfileUpsert } from './verified-user-profile-upsert';

describe('buildVerifiedUserProfileUpsert', () => {
	it('upserts on user_id and preserves existing canonical profile identity', () => {
		const upsert = buildVerifiedUserProfileUpsert(
			{
				id: 'user-12345678',
				email: 'new-email@test.local',
				user_metadata: { pending_display_name: 'New signup name' },
			},
			{
				display_name: 'Canonical display name',
				full_name: 'Canonical full name',
			}
		);

		expect(upsert.options).toEqual({ onConflict: 'user_id' });
		expect(upsert.profile).toEqual({
			user_id: 'user-12345678',
			email: 'new-email@test.local',
			display_name: 'Canonical display name',
			full_name: 'Canonical full name',
			is_anonymous: false,
		});
	});

	it('creates a complete first-time profile from pending signup identity', () => {
		const upsert = buildVerifiedUserProfileUpsert(
			{
				id: 'user-12345678',
				email: 'new-user@test.local',
				user_metadata: { pending_display_name: 'New user' },
			},
			null
		);

		expect(upsert.profile).toMatchObject({
			user_id: 'user-12345678',
			display_name: 'New user',
			full_name: 'New user',
			is_anonymous: false,
		});
	});
});
