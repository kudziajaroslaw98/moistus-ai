let mockPathname = '/dashboard/plugins';
jest.mock('next/navigation', () => ({
	usePathname: () => mockPathname,
}));

import { render, screen } from '@testing-library/react';
import { PluginsPageFrame, PluginsPageTabs } from './plugins-page-tabs';

describe('PluginsPageTabs', () => {
	it.each([
		['/dashboard/plugins', 'Library'],
		['/dashboard/plugins/mine', 'My plugins'],
		['/dashboard/plugins/build', 'Build a plugin'],
	])('marks the tab for %s', (pathname, label) => {
		mockPathname = pathname;
		render(<PluginsPageTabs />);

		expect(screen.getByRole('link', { name: label })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(
			screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))
		).toHaveLength(1);
	});
});

describe('PluginsPageFrame', () => {
	it('keeps the title and tabs around the tab content, wider for the guide', () => {
		mockPathname = '/dashboard/plugins/build';
		const view = render(
			<PluginsPageFrame>
				<p>Guide body</p>
			</PluginsPageFrame>
		);

		expect(screen.getByRole('heading', { name: 'Plugins' })).toBeInTheDocument();
		expect(screen.getByText('Guide body')).toBeInTheDocument();
		expect(screen.getByText('Guide body').parentElement).toHaveClass('max-w-5xl');

		mockPathname = '/dashboard/plugins/mine';
		view.rerender(
			<PluginsPageFrame>
				<p>Guide body</p>
			</PluginsPageFrame>
		);
		expect(screen.getByText('Guide body').parentElement).toHaveClass('max-w-3xl');
	});
});
