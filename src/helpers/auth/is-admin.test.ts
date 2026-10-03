import type { SupabaseClient } from '@supabase/supabase-js';
import { isUserAdmin } from './is-admin';

function mockClient(result: { data: unknown; error: unknown }) {
	const maybeSingle = jest.fn().mockResolvedValue(result);
	const eq = jest.fn(() => ({ maybeSingle }));
	const select = jest.fn(() => ({ eq }));
	const from = jest.fn(() => ({ select }));
	return { client: { from } as unknown as SupabaseClient, from, eq };
}

describe('isUserAdmin', () => {
	it('returns true for admin role', async () => {
		const { client, from, eq } = mockClient({
			data: { role: 'admin' },
			error: null,
		});

		await expect(isUserAdmin(client, 'user-1')).resolves.toBe(true);
		expect(from).toHaveBeenCalledWith('user_profiles');
		expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
	});

	it('returns false for non-admin role or missing profile', async () => {
		await expect(
			isUserAdmin(mockClient({ data: { role: 'user' }, error: null }).client, 'u')
		).resolves.toBe(false);
		await expect(
			isUserAdmin(mockClient({ data: null, error: null }).client, 'u')
		).resolves.toBe(false);
	});

	it('returns false on lookup error', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
		await expect(
			isUserAdmin(
				mockClient({ data: null, error: { message: 'boom' } }).client,
				'u'
			)
		).resolves.toBe(false);
		spy.mockRestore();
	});

	it('returns false without a user id', async () => {
		const { client, from } = mockClient({ data: null, error: null });
		await expect(isUserAdmin(client, null)).resolves.toBe(false);
		expect(from).not.toHaveBeenCalled();
	});
});
