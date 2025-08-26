'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	Text,
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Toggle } from '../ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { BaseNodeWrapper } from './base-node-wrapper';

type TextNodeProps = NodeProps<Node<NodeData>>;

const TextNodeComponent = (props: TextNodeProps) => {
	const { id, data } = props;

	const { content, metadata } = data;
	const { updateNode, selectedNodes, openNodeEditor, getNode } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
			openNodeEditor: state.openNodeEditor,
			getNode: state.getNode,
		}))
	);

	const {
		fontSize = '14px',
		fontWeight = 'normal',
		textAlign = 'center',
		textColor = '#fafafa', // Default to a light text color
		fontStyle = 'normal',
	} = metadata ?? {};


	const textStyle = useMemo(() => {
		const style: React.CSSProperties = {
			textAlign: textAlign || 'center',
			color: textColor || 'inherit',
			fontStyle: fontStyle || 'normal',
			fontWeight: fontWeight || 400,
		};

		if (fontSize) {
			style.fontSize =
				typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
		}

		if (fontWeight) {
			style.fontWeight = fontWeight;
		}

		if (fontStyle) {
			style.fontStyle = fontStyle;
		}

		return style;
	}, [fontSize, fontWeight, fontStyle, textAlign, textColor]);

	const handleNodeChange = useCallback(
		(change: Partial<NodeData['metadata']>) => {
			updateNode({
				nodeId: data.id,
				data: {
					metadata: {
						...change,
					},
				},
			});
		},
		[updateNode, data.id]
	);

	const handleDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			const currentNode = getNode(id);
			if (!currentNode) return;
	
			openNodeEditor({
				mode: 'edit',
				position: currentNode.position,
				existingNodeId: id,
			});
		},
		[id, getNode, openNodeEditor]
	);


	const toolbarContent = useMemo(
		() => (
			<>
				<Toggle
					size={'sm'}
					variant={'outline'}
					pressed={data.metadata?.fontWeight === 600}
					onPressedChange={(toggle) => {
						handleNodeChange({
							fontWeight: toggle ? 600 : 400,
						});
					}}
				>
					<Bold className='w-4 h-4' />
				</Toggle>

				<Toggle
					size={'sm'}
					variant={'outline'}
					pressed={data.metadata?.fontStyle === 'italic'}
					onPressedChange={(toggle) => {
						handleNodeChange({
							fontStyle: toggle ? 'italic' : 'normal',
						});
					}}
				>
					<Italic className='w-4 h-4' />
				</Toggle>

				<ToggleGroup
					type='single'
					size={'sm'}
					variant={'outline'}
					value={data.metadata?.textAlign || 'center'}
					onValueChange={(value) => {
						handleNodeChange({
							textAlign: value as 'left' | 'center' | 'right',
						});
					}}
				>
					<ToggleGroupItem value='left'>
						<AlignLeft className='w-4 h-4' />
					</ToggleGroupItem>

					<ToggleGroupItem value='center'>
						<AlignCenter className='w-4 h-4' />
					</ToggleGroupItem>

					<ToggleGroupItem value='right'>
						<AlignRight className='w-4 h-4' />
					</ToggleGroupItem>
				</ToggleGroup>
			</>
		),
		[
			data.metadata?.fontWeight,
			data.metadata?.fontStyle,
			data.metadata?.textAlign,
			handleNodeChange,
		]
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeType='Text'
			nodeIcon={<Text className='w-3 h-3' />}
			nodeClassName='text-node min-w-fit min-h-fit h-full p-4' // Adjust minimum width for text nodes
			hideNodeType={true}
			includePadding={false}
			toolbarContent={toolbarContent}
			onDoubleClick={handleDoubleClick}
		>
			<div
				className={cn(
					'flex items-center min-h-8 w-full whitespace-break-spaces',
					textAlign === 'center' && 'justify-center',
					textAlign === 'right' && 'justify-end',
					textAlign === 'left' && 'justify-start'
				)}
				style={textStyle}
			>
				{content || (
					<span className='italic opacity-70 text-sm'>
						{props.selected ? 'Double click to edit...' : 'Text...'}
					</span>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const TextNode = memo(TextNodeComponent);
TextNode.displayName = 'TextNode';
export default TextNode;
