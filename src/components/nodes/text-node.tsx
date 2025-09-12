'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps, NodeToolbar, Position } from '@xyflow/react';
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	Type,
} from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Toggle } from '../ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { BaseNodeWrapper } from './base-node-wrapper';

type TextNodeProps = NodeProps<Node<NodeData>>;

const TextNodeComponent = (props: TextNodeProps) => {
	const { data } = props;

	const { content, metadata } = data;
	const { updateNode, selectedNodes } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
		}))
	);
	
	const {
		fontSize = '14px',
		fontWeight = 'normal',
		textAlign = 'center',
		textColor = 'rgba(255, 255, 255, 0.87)', // High emphasis by default
		fontStyle = 'normal',
	} = metadata ?? {};

	const textStyle = useMemo(() => {
		const style: React.CSSProperties = {
			textAlign: textAlign || 'center',
			color: textColor || 'rgba(255, 255, 255, 0.87)',
			fontStyle: fontStyle || 'normal',
			fontWeight: fontWeight || 400,
			lineHeight: 1.6,
			letterSpacing: '0.01em',
		};

		if (fontSize) {
			style.fontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
		}

		return style;
	}, [fontSize, fontWeight, fontStyle, textAlign, textColor]);

	const handleNodeChange = (change: Partial<NodeData['metadata']>) => {
		updateNode({
			nodeId: data.id,
			data: {
				metadata: {
					...data.metadata,
					...change,
				},
			},
		});
	};

	return (
		<>
			<NodeToolbar
				isVisible={props.selected && selectedNodes.length === 1}
				position={Position.Top}
				offset={10}
			>
				<motion.div
					className='flex gap-1 p-2 rounded-lg'
					style={{
						backgroundColor: '#272727', // Elevation 4
						border: '1px solid rgba(255, 255, 255, 0.06)',
						backdropFilter: 'blur(12px)',
					}}
					initial={{ opacity: 0, scale: 0.95, y: 10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 10 }}
					transition={{ duration: 0.2, type: 'spring', stiffness: 300 }}
				>
					<Toggle
						size={'sm'}
						variant={'outline'}
						pressed={data.metadata?.fontWeight === 600}
						onPressedChange={(toggle) => {
							handleNodeChange({
								fontWeight: toggle ? 600 : 400,
							});
						}}
						className='h-8 w-8 p-0'
						style={{
							backgroundColor: data.metadata?.fontWeight === 600 ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
							border: '1px solid rgba(255, 255, 255, 0.1)',
							color: 'rgba(255, 255, 255, 0.87)',
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
						className='h-8 w-8 p-0'
						style={{
							backgroundColor: data.metadata?.fontStyle === 'italic' ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
							border: '1px solid rgba(255, 255, 255, 0.1)',
							color: 'rgba(255, 255, 255, 0.87)',
						}}
					>
						<Italic className='w-4 h-4' />
					</Toggle>

					<div className='w-[1px] h-8 mx-1' style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

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
						className='gap-0'
					>
						<ToggleGroupItem value='left' className='h-8 w-8 p-0 rounded-r-none'
							style={{
								backgroundColor: data.metadata?.textAlign === 'left' ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								color: 'rgba(255, 255, 255, 0.87)',
							}}>
							<AlignLeft className='w-4 h-4' />
						</ToggleGroupItem>
						<ToggleGroupItem value='center' className='h-8 w-8 p-0 rounded-none border-x-0'
							style={{
								backgroundColor: data.metadata?.textAlign === 'center' ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								borderLeft: 'none',
								borderRight: 'none',
								color: 'rgba(255, 255, 255, 0.87)',
							}}>
							<AlignCenter className='w-4 h-4' />
						</ToggleGroupItem>
						<ToggleGroupItem value='right' className='h-8 w-8 p-0 rounded-l-none'
							style={{
								backgroundColor: data.metadata?.textAlign === 'right' ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								color: 'rgba(255, 255, 255, 0.87)',
							}}>
							<AlignRight className='w-4 h-4' />
						</ToggleGroupItem>
					</ToggleGroup>
				</motion.div>
			</NodeToolbar>

			<BaseNodeWrapper
				{...props}
				nodeType='Text'
				nodeIcon={<Type className='w-3 h-3' />}
				nodeClassName='text-node min-w-fit min-h-fit h-full'
			hideNodeType

				includePadding={true}
				elevation={1}
			>
				<div
					className={cn(
						'flex items-center min-h-8 w-full',
						textAlign === 'center' && 'justify-center',
						textAlign === 'right' && 'justify-end',
						textAlign === 'left' && 'justify-start'
					)}
					style={textStyle}
				>
					{content || (
						<span style={{ 
							color: 'rgba(255, 255, 255, 0.38)', 
							fontStyle: 'italic',
							fontSize: '14px' 
						}}>
							{props.selected ? 'Double click to edit...' : 'Text...'}
						</span>
					)}
				</div>
			</BaseNodeWrapper>
		</>
	);
};

const TextNode = memo(TextNodeComponent);
TextNode.displayName = 'TextNode';
export default TextNode;