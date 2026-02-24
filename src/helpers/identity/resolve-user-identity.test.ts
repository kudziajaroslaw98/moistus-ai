import { generateFallbackAvatar } from '@/helpers/user-profile-helpers';
import {
	resolveAvatarUrl,
	resolveDisplayName,
} from './resolve-user-identity';

describe('resolve-user-identity helper', () => {
	it('prefers display_name over full_name for labels', () => {
		expect(
			resolveDisplayName({
				displayName: 'Chosen Name',
				fullName: 'Legal Name',
				email: 'user@example.com',
				userId: 'user-1234',
			})
		).toBe('Chosen Name');
	});

	it('falls back from full_name to email prefix to user fallback', () => {
		expect(
			resolveDisplayName({
				displayName: null,
				fullName: 'Full Name',
				email: 'user@example.com',
				userId: 'user-1234',
			})
		).toBe('Full Name');

		expect(
			resolveDisplayName({
				displayName: null,
				fullName: null,
				email: 'user@example.com',
				userId: 'user-1234',
			})
		).toBe('user');

		expect(
			resolveDisplayName({
				displayName: null,
				fullName: null,
				email: null,
				userId: 'abc123456789',
			})
		).toBe('User abc12345');
	});

	it('ignores blank strings during precedence checks', () => {
		expect(
			resolveDisplayName({
				displayName: '   ',
				fullName: '\n',
				email: 'fallback@example.com',
				userId: 'user-1',
			})
		).toBe('fallback');
	});

	it('resolves avatar url with profile > metadata > deterministic fallback', () => {
		expect(
			resolveAvatarUrl({
				profileAvatarUrl: 'https://cdn.example.com/profile.png',
				metadataAvatarUrl: 'https://cdn.example.com/meta.png',
				userId: 'user-1',
			})
		).toBe('https://cdn.example.com/profile.png');

		expect(
			resolveAvatarUrl({
				profileAvatarUrl: '  ',
				metadataAvatarUrl: 'https://cdn.example.com/meta.png',
				userId: 'user-1',
			})
		).toBe('https://cdn.example.com/meta.png');

		expect(
			resolveAvatarUrl({
				profileAvatarUrl: null,
				metadataAvatarUrl: ' ',
				userId: 'user-1',
			})
		).toBe(generateFallbackAvatar('user-1'));
	});
});

