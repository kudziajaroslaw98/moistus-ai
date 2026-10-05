import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import type { LoadedPlugin } from '@/types/plugins';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import metricManifest from '../../../../../public/plugins/shiko.metric/0.1.0/manifest.json';

const manifest = pluginManifestSchema.parse(metricManifest);
const metricKind = { pluginId: 'shiko.metric', kind: 'metric' };
const mockHost = { render: jest.fn(), action: jest.fn() };
const mockCreateOrUpdateNode = jest.fn();
const mockInitializeQuickInput = jest.fn();
const mockEditorProps = jest.fn();

let mockValue = '';
let mockNodeType = 'extensionNode';
let mockExtensionKind: typeof metricKind | null = metricKind;
const mockSetNodeType = jest.fn();
const mockLoadedPlugins: Record<string, LoadedPlugin> = {
	'shiko.metric': {
		key: 'shiko.metric',
		source: 'catalog',
		manifestUrl: '/plugins/shiko.metric/0.1.0/manifest.json',
		status: 'ready',
		manifest,
		error: null,
	},
};

const mockState = () => ({
	quickInputValue: mockValue,
	quickInputNodeType: mockNodeType,
	quickInputExtensionKind: mockExtensionKind,
	quickInputCursorPosition: 0,
	setQuickInputValue: (value: string) => {
		mockValue = value;
	},
	setQuickInputNodeType: mockSetNodeType,
	setQuickInputCursorPosition: jest.fn(),
	initializeQuickInput: mockInitializeQuickInput,
	currentShares: [],
	mapId: 'map-1',
	loadedPlugins: mockLoadedPlugins,
	mapPlugins: [{ pluginId: 'shiko.metric', version: '0.1.0' }],
	mapPluginsLoaded: true,
	refreshMapPluginsSoon: jest.fn(),
	closeNodeEditor: jest.fn(),
	addNode: jest.fn(),
	updateNode: jest.fn(),
	applyLayoutAroundNode: jest.fn().mockResolvedValue(undefined),
	queueLocalLayoutOnResize: jest.fn(),
	clearQueuedLocalLayoutOnResize: jest.fn(),
	handleOnboardingNodeCreated: jest.fn(),
	onboardingPatternStep: null,
});

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: Object.assign(
		(selector: (state: ReturnType<typeof mockState>) => unknown) =>
			selector(mockState()),
		{ getState: () => mockState() }
	),
}));
jest.mock('@/lib/plugins/runtime/load-plugin-host', () => ({
	loadPluginHost: async () => mockHost,
}));
jest.mock('../../node-updater', () => ({
	createOrUpdateNode: (options: unknown) => mockCreateOrUpdateNode(options),
	transformNodeToQuickInputString: jest.fn(() => ''),
}));
jest.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
jest.mock('@/hooks/use-touch-first', () => ({ useTouchFirst: () => false }));
jest.mock('@/hooks/subscription/use-map-node-limit', () => ({
	useMapNodeLimit: () => ({
		isAtLimit: false,
		isLoading: false,
		limitInfo: null,
		limitMessage: null,
	}),
}));
jest.mock('../../core/utils/text-utils', () => ({
	announceToScreenReader: jest.fn(),
}));
jest.mock('../component-header', () => ({
	ComponentHeader: ({ label }: { label: string }) => <h3>{label}</h3>,
}));
jest.mock('./mobile-completion-tray', () => ({
	MobileCompletionTray: () => null,
}));
jest.mock('../preview-section', () => ({ PreviewSection: () => null }));
jest.mock('../parent-node-reference', () => ({
	ParentNodeReference: () => null,
}));
// The real registry loads every node component (and an ESM-only highlighter).
jest.mock('../../core/commands/command-registry', () => ({
	commandRegistry: { getCommandByTrigger: jest.fn(() => null) },
}));
jest.mock('../../core/commands/command-executor', () => ({
	processNodeTypeSwitch: jest.fn(() => ({
		hasSwitch: false,
		nodeType: null,
		processedText: '',
		cursorPosition: 0,
	})),
}));
jest.mock('../parsing-legend', () => ({
	ParsingLegend: ({
		nodeSpecificPatterns,
	}: {
		nodeSpecificPatterns: Array<{ pattern: string }>;
	}) => (
		<ul aria-label='Syntax help'>
			{nodeSpecificPatterns.map((pattern) => (
				<li key={pattern.pattern}>{pattern.pattern}</li>
			))}
		</ul>
	),
}));
jest.mock('./enhanced-input', () => ({
	EnhancedInput: (props: { value: string; pluginFields: unknown }) => {
		mockEditorProps(props);
		return (
			<textarea readOnly data-testid='enhanced-input' value={props.value} />
		);
	},
}));
jest.mock('../action-bar', () => ({
	ActionBar: ({
		canCreate,
		onCreate,
	}: {
		canCreate: boolean;
		onCreate: () => void;
	}) => (
		<button
			data-testid='create-button'
			disabled={!canCreate}
			onClick={onCreate}
		>
			Create
		</button>
	),
}));
jest.mock('@/components/ui/tabs', () => ({
	Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	TabsTrigger: ({ children }: { children: ReactNode }) => (
		<button type='button'>{children}</button>
	),
	TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { commandRegistry } from '../../core/commands/command-registry';
import { processNodeTypeSwitch } from '../../core/commands/command-executor';
import { QuickInput } from './quick-input';

const existingNote = {
	id: 'note-1',
	position: { x: 0, y: 0 },
	data: {
		id: 'note-1',
		node_type: 'defaultNode',
		content: 'MOA value:5 target:20',
		metadata: {},
	},
} as never;

const existingMetric = {
	id: 'metric-1',
	position: { x: 0, y: 0 },
	data: {
		id: 'metric-1',
		node_type: 'extensionNode',
		content: 'Signups: 5 / 10',
		metadata: {
			extension: {
				pluginId: 'shiko.metric',
				kind: 'metric',
				version: '0.1.0',
				data: { label: 'Signups', value: 5, target: 10, step: 1 },
			},
		},
	},
} as never;

/** Makes the next text change look like a typed `$trigger`. */
const mockTypedTrigger = (
	nodeType: string,
	extension: typeof metricKind | undefined,
	processedText: string
) => {
	jest
		.mocked(commandRegistry.getCommandByTrigger)
		.mockReturnValue({ nodeType, extension } as never);
	jest.mocked(processNodeTypeSwitch).mockReturnValue({
		hasSwitch: true,
		nodeType,
		extension,
		processedText,
		originalText: processedText,
		cursorPosition: processedText.length,
	} as never);
};

const renderEditor = () =>
	render(
		<QuickInput
			extensionKind={metricKind}
			mode='create'
			nodeType='extensionNode'
			parentNode={null}
			position={{ x: 10, y: 20 }}
		/>
	);

beforeEach(() => {
	jest.clearAllMocks();
	mockNodeType = 'extensionNode';
	mockExtensionKind = metricKind;
	jest.mocked(commandRegistry.getCommandByTrigger).mockReturnValue(null as never);
	jest.mocked(processNodeTypeSwitch).mockReturnValue({
		hasSwitch: false,
		nodeType: null,
		processedText: '',
		originalText: '',
		cursorPosition: 0,
	} as never);
	mockCreateOrUpdateNode.mockResolvedValue({
		success: true,
		nodeId: 'metric-1',
	});
});

describe('QuickInput with a plugin node kind', () => {
	it('uses the kind’s header, fields and generated Syntax Help', () => {
		mockValue = 'Weekly active users value:1240 target:2000';
		mockHost.render.mockResolvedValue({
			tree: { type: 'text', value: 'Live' },
			summary: 's',
		});

		renderEditor();

		expect(screen.getByRole('heading', { name: 'Metric' })).toBeInTheDocument();
		expect(screen.getByText('· Metric plugin')).toBeInTheDocument();
		expect(mockEditorProps).toHaveBeenLastCalledWith(
			expect.objectContaining({
				pluginFields: expect.arrayContaining([
					expect.objectContaining({ name: 'target' }),
				]),
			})
		);
		const help = screen.getByRole('list', { name: 'Syntax help' });
		expect(help).toHaveTextContent('$metric');
		expect(help).toHaveTextContent('target:');
		expect(help).not.toHaveTextContent('label:');
	});

	it('explains missing fields and keeps Create disabled', () => {
		mockValue = 'Weekly active users value:1240';

		renderEditor();

		expect(screen.getByText('Target is required')).toBeInTheDocument();
		expect(screen.getByTestId('create-button')).toBeDisabled();
	});

	it('creates an extension node with the plugin data, saved view and summary', async () => {
		mockValue =
			'Weekly active users value:1240 target:2000 unit:users step:100';
		const tree = { type: 'text' as const, value: '1,240 / 2,000' };
		mockHost.render.mockResolvedValue({
			tree,
			summary: 'Weekly active users: 1,240 / 2,000 users',
		});
		const user = userEvent.setup();

		renderEditor();
		await user.click(screen.getByTestId('create-button'));

		await waitFor(() => expect(mockCreateOrUpdateNode).toHaveBeenCalled());
		expect(mockCreateOrUpdateNode).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeType: 'extensionNode',
				mode: 'create',
				data: expect.objectContaining({
					content: 'Weekly active users: 1,240 / 2,000 users',
					metadata: {
						extension: {
							pluginId: 'shiko.metric',
							kind: 'metric',
							kindLabel: 'Metric',
							version: '0.1.0',
							data: {
								label: 'Weekly active users',
								value: 1240,
								target: 2000,
								unit: 'users',
								step: 100,
							},
							snapshot: tree,
						},
					},
				}),
			})
		);
	});

	it('opens an existing plugin node with its fields as text', () => {
		mockValue = '';
		render(
			<QuickInput
				mode='edit'
				nodeType='extensionNode'
				parentNode={null}
				position={{ x: 0, y: 0 }}
				existingNode={
					{
						id: 'metric-1',
						position: { x: 0, y: 0 },
						data: {
							id: 'metric-1',
							node_type: 'extensionNode',
							content: 'Signups: 5 / 10',
							metadata: {
								extension: {
									pluginId: 'shiko.metric',
									kind: 'metric',
									version: '0.1.0',
									data: { label: 'Signups', value: 5, target: 10, step: 1 },
								},
							},
						},
					} as never
				}
			/>
		);

		expect(mockInitializeQuickInput).toHaveBeenCalledWith(
			'Signups value:5 target:10',
			'extensionNode',
			metricKind
		);
	});
});

describe('QuickInput switching an existing node with $', () => {
	it('turns an existing note into a Metric when $metric is typed', () => {
		mockNodeType = 'defaultNode';
		mockExtensionKind = null;
		mockValue = '$metric MOA value:5 target:20';
		mockTypedTrigger('extensionNode', metricKind, 'MOA value:5 target:20');

		render(
			<QuickInput
				existingNode={existingNote}
				mode='edit'
				nodeType='defaultNode'
				parentNode={null}
				position={{ x: 0, y: 0 }}
			/>
		);

		expect(mockSetNodeType).toHaveBeenCalledWith('extensionNode', metricKind);
		expect(mockValue).toBe('MOA value:5 target:20');
	});

	it('saves the converted note as a Metric node', async () => {
		mockValue = 'MOA value:5 target:20';
		mockHost.render.mockResolvedValue({
			tree: { type: 'text', value: '5 / 20' },
			summary: 'MOA: 5 / 20',
		});
		const user = userEvent.setup();

		render(
			<QuickInput
				existingNode={existingNote}
				mode='edit'
				nodeType='defaultNode'
				parentNode={null}
				position={{ x: 0, y: 0 }}
			/>
		);
		await user.click(screen.getByTestId('create-button'));

		await waitFor(() => expect(mockCreateOrUpdateNode).toHaveBeenCalled());
		expect(mockCreateOrUpdateNode).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'edit',
				nodeType: 'extensionNode',
				data: expect.objectContaining({
					content: 'MOA: 5 / 20',
					metadata: {
						extension: expect.objectContaining({
							pluginId: 'shiko.metric',
							kind: 'metric',
							data: expect.objectContaining({ label: 'MOA', value: 5, target: 20 }),
						}),
					},
				}),
			})
		);
	});

	it('turns a Metric node back into a note when $note is typed', () => {
		mockValue = '$note Signups value:5 target:10';
		mockTypedTrigger('defaultNode', undefined, 'Signups value:5 target:10');

		render(
			<QuickInput
				existingNode={existingMetric}
				mode='edit'
				nodeType='extensionNode'
				parentNode={null}
				position={{ x: 0, y: 0 }}
			/>
		);

		expect(mockSetNodeType).toHaveBeenCalledWith('defaultNode', null);
	});
});
