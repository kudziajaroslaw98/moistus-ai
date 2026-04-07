import { startCompletion } from '@codemirror/autocomplete';
import { getNodeEditorKeybindings } from './setup';

jest.mock('../../core/commands/command-registry', () => ({
	commandRegistry: {
		getCommandByTrigger: jest.fn().mockReturnValue(null),
	},
}));

describe('createNodeEditor keybindings', () => {
	it('registers Cmd+. to trigger completion on macOS', () => {
		const bindings = getNodeEditorKeybindings(true);
		const macBinding = bindings.find((binding) => binding.mac === 'Mod-.');

		expect(macBinding).toBeDefined();
		expect(macBinding?.run).toBe(startCompletion);
	});
});
