import type { PluginUiNode } from '@/lib/plugins/ui-tree';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PluginUiTree } from './plugin-ui-tree';

const tree: PluginUiNode = {
	type: 'stack',
	children: [
		{ type: 'text', value: 'Groceries' },
		{ type: 'checkbox', label: 'Milk', checked: false, action: 'toggle' },
		{ type: 'button', label: 'Add', action: 'add' },
	],
};

// Pan mode: React Flow's pan filter ignores any drag that starts inside `.nopan`,
// so plugin controls must opt out of node-dragging (`nodrag`) only.
describe('PluginUiTree pan contract', () => {
	it('lets a drag that starts on a control pan the canvas', () => {
		const { container } = render(<PluginUiTree tree={tree} onAction={jest.fn()} />);

		expect(container.querySelector('.nopan')).toBeNull();
		expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('nodrag');
		expect(screen.getByRole('checkbox', { name: 'Milk' })).toHaveClass('nodrag');
	});

	it('lets disabled controls pass the drag through to the canvas', () => {
		const { container } = render(<PluginUiTree tree={tree} />);

		expect(container.querySelector('.nopan')).toBeNull();

		for (const control of [
			screen.getByRole('button', { name: 'Add' }),
			screen.getByRole('checkbox', { name: 'Milk' }),
		]) {
			expect(control).toBeDisabled();
			expect(control).toHaveClass('disabled:pointer-events-none');
		}
	});

	it('still runs the action on a plain click', async () => {
		const onAction = jest.fn();
		render(<PluginUiTree tree={tree} onAction={onAction} />);

		await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Milk' }));
		expect(onAction).toHaveBeenCalledWith('toggle', undefined);
	});
});
