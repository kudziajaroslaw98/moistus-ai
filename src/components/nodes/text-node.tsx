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
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { AutoResizeTextarea } from '../ui/auto-resize-textarea';
import { Toggle } from '../ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { BaseNodeWrapper } from './base-node-wrapper';

type TextNodeProps = NodeProps<Node<NodeData>>;

const TextNodeComponent = (props: TextNodeProps) => {
	const { id, data } = props;

	const { content, metadata } = data;
	const { updateNode, selectedNodes, editingNodeId, setState } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
			editingNodeId: state.editingNodeId,
			setState: state.setState,
		}))
	);

	const [localContent, setLocalContent] = useState(content || '');
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const isEditing = editingNodeId === id;
	const {
		fontSize = '14px',
		fontWeight = 'normal',
		textAlign = 'center',
		textColor = '#fafafa', // Default to a light text color
		fontStyle = 'normal',
	} = metadata ?? {};

	useEffect(() => {
		if (!isEditing) {
			setLocalContent(content || '');
		}
	}, [content, isEditing]);

	useEffect(() => {
		if (isEditing && textareaRef.current) {
			textareaRef.current.focus();
			textareaRef.current.select();
		}
	}, [isEditing]);

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

	const handleNodeChange = (change: Partial<NodeData['metadata']>) => {
		updateNode({
			nodeId: data.id,
			data: {
				metadata: {
					...change,
				},
			},
		});
	};

	const handleDoubleClick = () => {
		setLocalContent(content || '');
		setState({ editingNodeId: id });
	};

	const saveChanges = () => {
		if (localContent !== content) {
			updateNode({ nodeId: id, data: { content: localContent } });
		}

		setState({ editingNodeId: null });
	};

	const handleBlur = () => {
		saveChanges();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			saveChanges();
		}

		if (e.key === 'Escape') {
			setState({ editingNodeId: null });
			setLocalContent(content || '');
		}
	};

	const toolbarContent = (
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
			{isEditing ? (
				<AutoResizeTextarea
					ref={textareaRef}
					value={localContent}
					onChange={(e) => setLocalContent(e.target.value)}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					className='nodrag nopan nowheel w-full bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-inherit p-0 m-0'
					style={textStyle}
				/>
			) : (
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
			)}
		</BaseNodeWrapper>
	);
};

const TextNode = memo(TextNodeComponent);
TextNode.displayName = 'TextNode';
export default TextNode;
