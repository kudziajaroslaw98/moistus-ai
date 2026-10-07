import type { AppNode } from '@/types/app-node'
import { transformDataForNodeType } from './node-creator'
import { transformNodeToQuickInputString, updateNodeDirect } from './node-updater'

const createNode = (overrides: Partial<AppNode>): AppNode =>
	({
		id: 'node-1',
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			id: 'node-1',
			content: '',
			map_id: 'map-1',
			node_type: 'defaultNode',
			metadata: {},
		},
		...overrides,
	} as AppNode)

describe('node updater parser cleanup', () => {
	it('does not re-serialize legacy text parser tokens', () => {
		const node = createNode({
			type: 'textNode',
			data: {
				id: 'node-1',
				content: 'Legacy text',
				map_id: 'map-1',
				node_type: 'textNode',
				metadata: {
					textColor: 'red',
					backgroundColor: '#ffffff',
					borderColor: '#000000',
				},
			} as AppNode['data'],
		})

		const quickInput = transformNodeToQuickInputString(node, 'textNode')

		expect(quickInput).toContain('color:red')
		expect(quickInput).not.toContain('bg:')
		expect(quickInput).not.toContain('border:')
	})

	it('does not re-serialize legacy image src parser token', () => {
		const node = createNode({
			type: 'imageNode',
			data: {
				id: 'node-1',
				content: '',
				map_id: 'map-1',
				node_type: 'imageNode',
				metadata: {
					imageUrl: 'https://cdn.example.com/image.png',
					altText: 'Diagram',
					source: 'legacy-source',
				},
			} as AppNode['data'],
		})

		const quickInput = transformNodeToQuickInputString(node, 'imageNode')

		expect(quickInput).toContain('https://cdn.example.com/image.png')
		expect(quickInput).toContain('alt:"Diagram"')
		expect(quickInput).not.toContain('src:')
	})

	it('does not re-serialize reference parser tokens', () => {
		const node = createNode({
			type: 'referenceNode',
			data: {
				id: 'node-1',
				content: 'Reference',
				map_id: 'map-1',
				node_type: 'referenceNode',
				metadata: {
					targetNodeId: 'node-2',
					targetMapId: 'map-2',
					confidence: 0.9,
				},
			} as AppNode['data'],
		})

		const quickInput = transformNodeToQuickInputString(node, 'referenceNode')

		expect(quickInput).toContain('Reference')
		expect(quickInput).not.toContain('target:')
		expect(quickInput).not.toContain('map:')
		expect(quickInput).not.toContain('confidence:')
	})

	it('clears legacy text/image metadata fields on transform for save', () => {
		const transformedText = transformDataForNodeType('textNode', {
			content: 'Text node',
			metadata: {
				backgroundColor: '#ffffff',
				borderColor: '#000000',
			},
		})
		const transformedImage = transformDataForNodeType('imageNode', {
			content: 'https://example.com/x.png',
			metadata: {
				source: 'legacy-source',
			},
		})

		expect(transformedText.metadata?.backgroundColor).toBeUndefined()
		expect(transformedText.metadata?.borderColor).toBeUndefined()
		expect(transformedImage.metadata?.source).toBeUndefined()
	})

	it('persists task node title from parsed metadata', () => {
		const transformedTask = transformDataForNodeType('taskNode', {
			content: '',
			metadata: {
				title: 'Sprint Tasks',
				tasks: [{ id: 'task-1', text: 'Ship feature', isComplete: false }],
			},
		})

		expect(transformedTask.metadata?.title).toBe('Sprint Tasks')
		expect(transformedTask.metadata?.tasks).toEqual([
			{ id: 'task-1', text: 'Ship feature', isComplete: false },
		])
	})

	it('re-serializes task node title to quick input', () => {
		const now = new Date().toISOString()
		const node = createNode({
			type: 'taskNode',
			data: {
				id: 'node-1',
				content: '',
				map_id: 'map-1',
				parent_id: null,
				position_x: 0,
				position_y: 0,
				node_type: 'taskNode',
				created_at: now,
				updated_at: now,
				tasks: [
					{ id: 'task-1', text: 'Ship feature', isComplete: false },
					{ id: 'task-2', text: 'Write tests', isComplete: true },
				],
				metadata: {
					title: 'Sprint Tasks',
					tasks: [
						{ id: 'task-1', text: 'Ship feature', isComplete: false },
						{ id: 'task-2', text: 'Write tests', isComplete: true },
					],
				},
			} as AppNode['data'],
		})

		const quickInput = transformNodeToQuickInputString(node, 'taskNode')

		expect(quickInput).toContain('[ ] Ship feature')
		expect(quickInput).toContain('[x] Write tests')
		expect(quickInput).toContain('title:"Sprint Tasks"')
	})
})

describe('updateNodeDirect type switches', () => {
	const metricNode = createNode({
		type: 'extensionNode',
		data: {
			id: 'node-1',
			content: 'Signups: 5 / 10',
			map_id: 'map-1',
			node_type: 'extensionNode',
			metadata: {
				extension: {
					pluginId: 'shiko.metric',
					kind: 'metric',
					version: '0.1.0',
					data: { label: 'Signups', value: 5, target: 10 },
				},
			},
		} as unknown as AppNode['data'],
	})

	it('clears the plugin data when a plugin node becomes a note', async () => {
		const updateNode = jest.fn().mockResolvedValue(undefined)

		await updateNodeDirect({
			nodeType: 'defaultNode',
			data: { content: 'Signups value:5 target:10', metadata: {} },
			existingNode: metricNode,
			updateNode,
		})

		const saved = updateNode.mock.calls[0][0].data
		expect(saved.node_type).toBe('defaultNode')
		expect(saved.metadata).toHaveProperty('extension', undefined)
	})

	it('keeps the plugin data when a plugin node stays a plugin node', async () => {
		const updateNode = jest.fn().mockResolvedValue(undefined)
		const extension = { ...metricNode.data.metadata!.extension!, data: { label: 'Signups', value: 6, target: 10 } }

		await updateNodeDirect({
			nodeType: 'extensionNode',
			data: { content: 'Signups: 6 / 10', metadata: { extension } },
			existingNode: metricNode,
			updateNode,
		})

		expect(updateNode.mock.calls[0][0].data.metadata.extension).toEqual(extension)
	})
})
