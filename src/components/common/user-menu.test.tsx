import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './user-menu';

jest.mock('@/components/auth/upgrade-anonymous', () => ({
	UpgradeAnonymousPrompt: () => null,
}));

jest.mock('@/components/common/use-account-menu-actions', () => ({
	useAccountMenuActions: () => ({
		name: 'Ada',
		isAnonymous: false,
		subtitle: 'ada@example.com',
		isPro: false,
		hasResolvedSubscription: true,
		isLoggingOut: false,
		showUpgradeAnonymous: false,
		handleRestartOnboarding: jest.fn(),
		handleUpgradeToPro: jest.fn(),
		handleLogout: jest.fn(),
		openUpgradeAnonymousPrompt: jest.fn(),
		closeUpgradeAnonymousPrompt: jest.fn(),
		handleAnonymousUpgradeSuccess: jest.fn(),
	}),
}));

describe('UserMenu legal links', () => {
	it('links the Privacy Policy and Terms of Service in a new tab, so the editor stays open', async () => {
		const user = userEvent.setup();
		render(
			<UserMenu
				user={{ user_id: 'u1', display_name: 'Ada' } as never}
				trigger={<button type='button'>Account menu</button>}
			/>
		);

		await user.click(screen.getByRole('button', { name: 'Account menu' }));

		const privacy = await screen.findByRole('menuitem', {
			name: 'Privacy Policy',
		});
		const terms = screen.getByRole('menuitem', { name: 'Terms of Service' });

		expect(privacy).toHaveAttribute('href', '/privacy');
		expect(terms).toHaveAttribute('href', '/terms');
		for (const item of [privacy, terms]) {
			expect(item).toHaveAttribute('target', '_blank');
			expect(item).toHaveAttribute('rel', expect.stringContaining('noopener'));
		}
	});
});
