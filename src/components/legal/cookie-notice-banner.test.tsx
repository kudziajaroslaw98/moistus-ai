let mockPathname = '/';
jest.mock('next/navigation', () => ({
	usePathname: () => mockPathname,
}));

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookieNoticeBanner } from './cookie-notice-banner';

const STORAGE_KEY = 'shiko_cookie_notice_acknowledged';

const getNotice = () => screen.queryByRole('region', { name: 'About cookies' });

describe('CookieNoticeBanner', () => {
	beforeEach(() => {
		mockPathname = '/';
		localStorage.clear();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('explains what is stored and links to the policy section', async () => {
		render(<CookieNoticeBanner />);

		expect(await screen.findByRole('region', { name: 'About cookies' })).toBeInTheDocument();
		expect(screen.getByText(/only stores what it needs/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'What we store' })).toHaveAttribute(
			'href',
			'/privacy#cookies'
		);
	});

	it.each(['/', '/auth/sign-in', '/auth/sign-up', '/join', '/join/some-token'])(
		'shows on the public entry page %s',
		async (path) => {
			mockPathname = path;
			render(<CookieNoticeBanner />);

			expect(await screen.findByRole('region', { name: 'About cookies' })).toBeInTheDocument();
		}
	);

	it.each([
		'/privacy',
		'/terms',
		'/subprocessors',
		'/dashboard',
		'/dashboard/plugins',
		'/mind-map/abc123',
	])('stays hidden on %s', async (path) => {
		mockPathname = path;
		render(<CookieNoticeBanner />);

		// let the mount effect read storage before asserting absence
		await waitFor(() => expect(getNotice()).not.toBeInTheDocument());
	});

	it('hides and remembers the choice after "Got it"', async () => {
		const user = userEvent.setup();
		render(<CookieNoticeBanner />);

		await user.click(await screen.findByRole('button', { name: 'Got it' }));

		expect(getNotice()).not.toBeInTheDocument();
		expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
	});

	it('stays hidden for people who already dismissed the first notice', async () => {
		localStorage.setItem(STORAGE_KEY, 'true');
		render(<CookieNoticeBanner />);

		await waitFor(() => expect(getNotice()).not.toBeInTheDocument());
	});

	it('hides when another tab dismisses it', async () => {
		render(<CookieNoticeBanner />);
		expect(await screen.findByRole('region', { name: 'About cookies' })).toBeInTheDocument();

		act(() => {
			localStorage.setItem(STORAGE_KEY, 'true');
			window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
		});

		expect(getNotice()).not.toBeInTheDocument();
	});

	it('does not crash when browser storage is blocked', async () => {
		const user = userEvent.setup();
		jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError');
		});
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError');
		});

		render(<CookieNoticeBanner />);

		await user.click(await screen.findByRole('button', { name: 'Got it' }));

		expect(getNotice()).not.toBeInTheDocument();
	});
});
