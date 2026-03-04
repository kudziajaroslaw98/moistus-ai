import type { AppNode } from '@/types/app-node'
import { transformDataForNodeType } from './node-creator'
import { transformNodeToQuickInputString } from './node-updater'

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
})
