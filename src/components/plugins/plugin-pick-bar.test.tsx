import { act, fireEvent, render, screen } from '@testing-library/react';
import { create } from 'zustand';
import { PluginPickBar } from './plugin-pick-bar';

const mockStore = create(() => ({
	pluginPick: null as null | {
		nodeId: string;
		title: string;
		hint?: string;
		marked: string[];
	},
	nodes: [{ id: 'threads-1' }] as Array<{ id: string }>,
	stopPluginPick: jest.fn(),
}));
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: unknown) => unknown) =>
		mockStore(selector as never),
}));

const start = () =>
	mockStore.setState({
		pluginPick: {
			nodeId: 'threads-1',
			title: 'Adding stops to “Who sent the letter?”',
			hint: '2 so far',
			marked: [],
		},
		nodes: [{ id: 'threads-1' }],
		stopPluginPick: jest.fn(() => mockStore.setState({ pluginPick: null })),
	});

describe('PluginPickBar', () => {
	afterEach(() => mockStore.setState({ pluginPick: null }));

	it('says what the plugin is picking for and how it is going', () => {
		start();
		render(<PluginPickBar />);

		expect(
			screen.getByRole('status', { name: /Adding stops to/ })
		).toBeInTheDocument();
		expect(screen.getByText('2 so far')).toBeInTheDocument();
	});

	it('ends with Done or Escape', () => {
		start();
		const { rerender } = render(<PluginPickBar />);
		fireEvent.click(screen.getByRole('button', { name: 'Done' }));
		expect(mockStore.getState().stopPluginPick).toHaveBeenCalledTimes(1);

		start();
		rerender(<PluginPickBar />);
		fireEvent.keyDown(window, { key: 'Escape' });
		expect(mockStore.getState().stopPluginPick).toHaveBeenCalledTimes(1);
		expect(mockStore.getState().pluginPick).toBeNull();
	});

	it('ends when the plugin node is deleted while picking', () => {
		start();
		render(<PluginPickBar />);

		act(() => mockStore.setState({ nodes: [] }));

		expect(mockStore.getState().pluginPick).toBeNull();
	});

	it('shows nothing when no pick is open', () => {
		const { container } = render(<PluginPickBar />);
		expect(container).toBeEmptyDOMElement();
	});
});
