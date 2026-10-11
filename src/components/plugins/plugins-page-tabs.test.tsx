let mockPathname = '/dashboard/plugins';
jest.mock('next/navigation', () => ({
	usePathname: () => mockPathname,
}));

import { render, screen } from '@testing-library/react';
import {
	PluginsPageFrame,
	PluginsPageTabs,
	PluginsSlot,
} from './plugins-page-tabs';

describe('PluginsPageTabs', () => {
	it.each([
		['/dashboard/plugins', 'Library'],
		['/dashboard/plugins/build', 'Write a plugin'],
		['/dashboard/plugins/mine', 'My plugins'],
	])('marks the tab for %s', (pathname, label) => {
		mockPathname = pathname;
		render(<PluginsPageTabs />);

		expect(screen.getByRole('link', { name: label })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(
			screen
				.getAllByRole('link')
				.filter((link) => link.hasAttribute('aria-current'))
		).toHaveLength(1);
	});
});

describe('PluginsPageTabs order', () => {
	it('goes from browsing to writing to managing', () => {
		mockPathname = '/dashboard/plugins';
		render(<PluginsPageTabs />);

		expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
			'Library',
			'Write a plugin',
			'My plugins',
		]);
	});
});

describe('PluginsPageFrame', () => {
	it('keeps the title, the tab-specific intro and the tabs around the tab content', () => {
		mockPathname = '/dashboard/plugins/mine';
		const view = render(
			<PluginsPageFrame>
				<p>Tab body</p>
			</PluginsPageFrame>
		);

		expect(
			screen.getByRole('heading', { name: 'Plugins' })
		).toBeInTheDocument();
		expect(screen.getByText('Tab body')).toBeInTheDocument();
		expect(screen.getByText(/Plugins you’re writing/)).toBeInTheDocument();

		mockPathname = '/dashboard/plugins';
		view.rerender(
			<PluginsPageFrame>
				<p>Tab body</p>
			</PluginsPageFrame>
		);
		expect(screen.getByText(/New kinds of nodes/)).toBeInTheDocument();
	});

	it('lets a tab put its button next to the title', () => {
		mockPathname = '/dashboard/plugins/mine';
		render(
			<PluginsPageFrame>
				<PluginsSlot slot='heading'>
					<button type='button'>Submit a version</button>
				</PluginsSlot>
			</PluginsPageFrame>
		);

		expect(
			screen.getByRole('button', { name: 'Submit a version' })
		).toBeInTheDocument();
	});
});
