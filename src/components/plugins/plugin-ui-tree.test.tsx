import { fireEvent, render, screen } from '@testing-library/react';
import { PluginUiTree } from './plugin-ui-tree';

describe('PluginUiTree', () => {
	it('draws tones, strike-through and tinted panels', () => {
		render(
			<PluginUiTree
				tree={{
					type: 'stack',
					tone: 'info',
					children: [
						{ type: 'text', value: 'Needs a look', tone: 'warning' },
						{
							type: 'text',
							value: 'Dropped thread',
							tone: 'muted',
							strike: true,
						},
						{ type: 'progress', value: 1, tone: 'success', label: 'Resolved' },
					],
				}}
			/>
		);

		expect(screen.getByText('Needs a look').className).toContain(
			'text-amber-400/90'
		);
		expect(screen.getByText('Dropped thread').className).toContain(
			'line-through'
		);
		expect(screen.getByText('Needs a look').parentElement?.className).toContain(
			'bg-blue-400/10'
		);
		expect(
			screen.getByRole('progressbar').firstElementChild?.className
		).toContain('emerald');
	});

	it('runs a button’s action, or hands a pick to the host instead', () => {
		const onAction = jest.fn();
		const onPick = jest.fn();
		const pick = { title: 'Adding stops' };
		render(
			<PluginUiTree
				onAction={onAction}
				onPick={onPick}
				tree={{
					type: 'row',
					children: [
						{
							type: 'button',
							label: 'Plain',
							action: 'plain',
							payload: { n: 1 },
						},
						{
							type: 'button',
							label: 'Pick',
							action: 'add',
							payload: { id: 'a1' },
							pick,
						},
					],
				}}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Plain' }));
		expect(onAction).toHaveBeenCalledWith('plain', { n: 1 });

		fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
		expect(onPick).toHaveBeenCalledWith(pick, 'add', { id: 'a1' });
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it('falls back to the action when there is no map to pick on (the playground)', () => {
		const onAction = jest.fn();
		render(
			<PluginUiTree
				onAction={onAction}
				tree={{
					type: 'button',
					label: 'Pick',
					action: 'add',
					pick: { title: 'x' },
				}}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
		expect(onAction).toHaveBeenCalledWith('add', undefined);
	});

	it('opens the node editor for an edit button, and runs its action where there is none', () => {
		const onAction = jest.fn();
		const onEdit = jest.fn();
		const tree = {
			type: 'button',
			label: 'Add thread',
			action: 'add',
			edit: true,
		} as const;

		const { unmount } = render(
			<PluginUiTree tree={tree} onAction={onAction} onEdit={onEdit} />
		);
		fireEvent.click(screen.getByRole('button', { name: 'Add thread' }));
		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onAction).not.toHaveBeenCalled();
		unmount();

		render(<PluginUiTree tree={tree} onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Add thread' }));
		expect(onAction).toHaveBeenCalledWith('add', undefined);
	});

	it('opens a menu and runs the chosen item', async () => {
		const onAction = jest.fn();
		render(
			<PluginUiTree
				onAction={onAction}
				tree={{
					type: 'menu',
					label: 'Thread actions',
					items: [
						{
							label: 'Mark resolved',
							action: 'resolve',
							payload: { id: 'a1' },
						},
						{ separator: true },
						{ label: 'Delete thread', action: 'remove', danger: true },
					],
				}}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Thread actions' }));
		fireEvent.click(
			await screen.findByRole('menuitem', { name: 'Mark resolved' })
		);

		expect(onAction).toHaveBeenCalledWith('resolve', { id: 'a1' });
	});

	it('disables the menu when nothing can run (viewers)', () => {
		render(
			<PluginUiTree
				tree={{
					type: 'menu',
					label: 'Actions',
					items: [{ label: 'Go', action: 'go' }],
				}}
			/>
		);

		expect(screen.getByRole('button', { name: 'Actions' })).toBeDisabled();
	});
});
