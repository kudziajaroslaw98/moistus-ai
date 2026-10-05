import type {
	AISuggestableNodeTypes,
	CreatableNodeTypes,
	InlineCreatableNodeTypes,
} from '@/registry/node-registry';
import type { NodeExtensionData } from '@/types/extensions';
import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import ExtensionNode from './extension-node';

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => ({ canEdit: true }),
}));
jest.mock('@/store/mind-map-store', () => {
	const state = {
		loadedPlugins: {},
		mapPlugins: [],
		mapPluginsLoaded: true,
		refreshMapPluginsSoon: jest.fn(),
	};
	return {
		__esModule: true,
		default: Object.assign(
			(selector: (value: typeof state) => unknown) => selector(state),
			{
				getState: () => state,
			}
		),
	};
});

jest.mock('./base-node-wrapper', () => ({
	BaseNodeWrapper: ({
		children,
		nodeType,
	}: {
		children: ReactNode;
		nodeType?: string;
	}) => (
		<div data-node-type={nodeType} data-testid='base-node-wrapper'>
			{children}
		</div>
	),
}));

type ExtensionNodeProps = ComponentProps<typeof ExtensionNode>;

const createProps = (
	extension: NodeExtensionData | null,
	content: string | null = null
): ExtensionNodeProps =>
	({
		id: 'ext-1',
		type: 'extensionNode',
		data: {
			id: 'ext-1',
			map_id: 'map-1',
			parent_id: null,
			content,
			position_x: 0,
			position_y: 0,
			node_type: 'extensionNode',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			metadata: { extension },
		},
		selected: false,
		dragging: false,
		isConnectable: true,
		positionAbsoluteX: 0,
		positionAbsoluteY: 0,
		zIndex: 0,
		selectable: true,
		deletable: true,
		draggable: true,
	}) as unknown as ExtensionNodeProps;

describe('ExtensionNode', () => {
	it('shows the kind, content and required plugin when the plugin is unavailable', () => {
		render(
			<ExtensionNode
				{...createProps(
					{
						pluginId: 'com.example.kanban',
						kind: 'kanban',
						kindLabel: 'Kanban board',
						version: '1.0.0',
						data: {},
					},
					'Sprint 12'
				)}
			/>
		);

		expect(screen.getByTestId('base-node-wrapper')).toHaveAttribute(
			'data-node-type',
			'Extension'
		);
		expect(screen.getByText('Kanban board')).toBeInTheDocument();
		expect(screen.getByText('Sprint 12')).toBeInTheDocument();
		expect(screen.getByTestId('plugin-node-status')).toHaveTextContent(
			'Needs the Kanban board plugin (com.example.kanban)'
		);
	});

	it('shows a placeholder when extension data is missing', () => {
		render(<ExtensionNode {...createProps(null)} />);

		expect(screen.getByText('Missing extension data')).toBeInTheDocument();
	});
});

// Compile-time guard (checked by `pnpm type-check`): extensionNode must never become
// creatable by users, AI or quick input. Importing the registry at runtime would load
// every node component, so this is asserted on the derived types instead.
type ExpectFalse<T extends false> = T;
export type ExtensionNodeAvailabilityGuard = [
	ExpectFalse<'extensionNode' extends CreatableNodeTypes ? true : false>,
	ExpectFalse<'extensionNode' extends AISuggestableNodeTypes ? true : false>,
	ExpectFalse<'extensionNode' extends InlineCreatableNodeTypes ? true : false>,
];
