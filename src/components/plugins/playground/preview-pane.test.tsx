import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import { STARTER_MANIFEST } from '@/lib/plugins/starter-plugin';
import type { PluginUiNode } from '@/lib/plugins/ui-tree';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewPane } from './preview-pane';

const manifest = pluginManifestSchema.parse({
	...STARTER_MANIFEST,
	id: 'dev.counter-9b2c41a7',
});
const kind = manifest.nodeKinds[0];

const tree: PluginUiNode = {
	type: 'stack',
	children: [
		{ type: 'text', value: 'Coffees today' },
		{ type: 'button', label: 'Add one', action: 'increment' },
	],
};

const base = {
	manifest,
	kind,
	problem: null,
	starting: false,
	view: { tree },
	renderError: null,
	needsSampleData: false,
	last: null,
	wide: false,
	onWideChange: jest.fn(),
	canEdit: true,
	onCanEditChange: jest.fn(),
	onKindChange: jest.fn(),
	onAction: jest.fn(),
	refresh: null,
};

beforeEach(() => jest.clearAllMocks());

describe('PreviewPane', () => {
	it('draws the plugin’s view under the node header with the DEV badge', () => {
		render(<PreviewPane {...base} />);
		expect(screen.getByText('Counter')).toBeInTheDocument();
		expect(screen.getByText('DEV')).toBeInTheDocument();
		expect(screen.getByText('Coffees today')).toBeInTheDocument();
	});

	it('runs the action a button names', async () => {
		render(<PreviewPane {...base} />);
		await userEvent.click(screen.getByRole('button', { name: 'Add one' }));
		expect(base.onAction).toHaveBeenCalledWith('increment', undefined);
	});

	it('switches between the two node widths', async () => {
		render(<PreviewPane {...base} />);
		expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await userEvent.click(screen.getByRole('button', { name: 'Wide' }));
		expect(base.onWideChange).toHaveBeenCalledWith(true);
	});

	it('lets the author see the node as someone who can only view', async () => {
		render(<PreviewPane {...base} />);
		await userEvent.click(screen.getByRole('switch', { name: 'Can edit' }));
		expect(base.onCanEditChange).toHaveBeenCalledWith(false);
	});

	it('shows why the node can’t be drawn instead of the node', () => {
		render(
			<PreviewPane
				{...base}
				problem='plugin.js: SyntaxError: unexpected end of input'
				view={null}
			/>
		);
		expect(screen.getByRole('alert')).toHaveTextContent('Can’t draw this node');
		expect(screen.getByRole('alert')).toHaveTextContent(
			'unexpected end of input'
		);
		expect(screen.queryByText('Coffees today')).not.toBeInTheDocument();
	});

	it('says when the sample data has to be filled in first', () => {
		render(<PreviewPane {...base} needsSampleData view={null} />);
		expect(screen.getByText(/Fill in the sample data/)).toBeInTheDocument();
	});

	it('says the sandbox is starting before the first load', () => {
		render(<PreviewPane {...base} starting view={null} />);
		expect(screen.getByText(/Starting the plugin sandbox/)).toBeInTheDocument();
	});

	it('offers Refresh for a plugin that reaches a site, and names the site', async () => {
		const onRefresh = jest.fn();
		render(
			<PreviewPane
				{...base}
				refresh={{ hosts: ['api.github.com'], busy: false, onRefresh }}
			/>
		);
		expect(screen.getByText('api.github.com')).toBeInTheDocument();
		expect(
			screen.queryByRole('switch', { name: 'Can edit' })
		).not.toBeInTheDocument();
		await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(onRefresh).toHaveBeenCalled();
	});

	it('disables Refresh while one is running', () => {
		render(
			<PreviewPane
				{...base}
				refresh={{
					hosts: ['api.github.com'],
					busy: true,
					onRefresh: jest.fn(),
				}}
			/>
		);
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
	});

	it('shows what the last action returned, or why it failed', () => {
		const { rerender } = render(
			<PreviewPane
				{...base}
				last={{ ok: true, text: 'increment → {"count":3}' }}
			/>
		);
		expect(screen.getByText('increment → {"count":3}')).toBeInTheDocument();
		rerender(
			<PreviewPane
				{...base}
				last={{ ok: false, text: 'increment → rejected' }}
			/>
		);
		expect(screen.getByText('increment → rejected')).toHaveClass(
			'text-red-300'
		);
	});

	it('lets the author pick a kind when the plugin has several', async () => {
		const two = {
			...manifest,
			nodeKinds: [kind, { ...kind, kind: 'tally', label: 'Tally' }],
		};
		render(<PreviewPane {...base} manifest={two} />);
		await userEvent.selectOptions(screen.getByLabelText('Node kind'), 'tally');
		expect(base.onKindChange).toHaveBeenCalledWith('tally');
	});
});
