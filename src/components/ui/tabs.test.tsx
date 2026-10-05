import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

function renderTabs() {
	return render(
		<Tabs defaultValue='one'>
			<TabsList>
				<TabsTrigger value='one'>One</TabsTrigger>
				<TabsTrigger value='two'>Two</TabsTrigger>
			</TabsList>
			<TabsContent value='one'>Panel one</TabsContent>
			<TabsContent value='two'>Panel two</TabsContent>
		</Tabs>
	);
}

describe('TabsTrigger', () => {
	// Base UI marks the selected tab with `data-active`; the active styles key off it.
	it('marks only the selected tab with data-active', () => {
		renderTabs();

		expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute(
			'data-active'
		);
		expect(screen.getByRole('tab', { name: 'Two' })).not.toHaveAttribute(
			'data-active'
		);

		fireEvent.click(screen.getByRole('tab', { name: 'Two' }));

		expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute(
			'data-active'
		);
		expect(screen.getByRole('tab', { name: 'One' })).not.toHaveAttribute(
			'data-active'
		);
	});

	it('styles the active state via data-active selectors', () => {
		renderTabs();

		const className = screen.getByRole('tab', { name: 'One' }).className;
		expect(className).toContain('data-[active]:bg-elevated');
		expect(className).not.toContain('data-[selected]');
	});
});
