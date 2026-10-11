import { act, render, screen } from '@testing-library/react';
import { create } from 'zustand';
import { PluginPickMarks } from './plugin-pick-marks';

jest.mock('@xyflow/react', () => ({
	ViewportPortal: ({ children }: { children: React.ReactNode }) => <div data-testid='viewport'>{children}</div>,
}));

const mockStore = create(() => ({
	pluginPick: null as null | { marked: string[] },
	nodes: [
		{ id: 'a', position: { x: 100, y: 50 }, measured: { width: 230, height: 58 } },
		{ id: 'b', position: { x: 400, y: 80 } },
	] as Array<{ id: string; position: { x: number; y: number }; measured?: { width: number; height: number } }>,
}));
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: unknown) => unknown) => mockStore(selector as never),
}));

describe('PluginPickMarks', () => {
	afterEach(() => mockStore.setState({ pluginPick: null }));

	it('draws nothing, and settles, when no pick is open', () => {
		const { container } = render(<PluginPickMarks />);
		expect(container).toBeEmptyDOMElement();
	});

	it('numbers the picked nodes in order, at their corners', () => {
		mockStore.setState({ pluginPick: { marked: ['b', 'a'] } });
		render(<PluginPickMarks />);

		const [first, second] = screen.getAllByText(/^[12]$/);
		expect(first).toHaveTextContent('1');
		expect(first).toHaveStyle({ transform: 'translate(390px, 70px)' });
		expect(second).toHaveTextContent('2');
		expect(second).toHaveStyle({ transform: 'translate(90px, 40px)' });
	});

	it('follows the picks as they change, and skips nodes that are gone', () => {
		mockStore.setState({ pluginPick: { marked: ['a'] } });
		render(<PluginPickMarks />);
		expect(screen.getAllByText(/^\d$/)).toHaveLength(1);

		act(() => mockStore.setState({ pluginPick: { marked: ['a', 'gone', 'b'] } }));

		expect(screen.getAllByText(/^\d$/).map((mark) => mark.textContent)).toEqual(['1', '3']);
	});
});
