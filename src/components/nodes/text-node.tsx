'use client';

import useAppStore from '@/store/mind-map-store';
import { type NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Type } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { BaseNodeWrapper } from './base-node-wrapper';
import { SharedNodeToolbar } from './components/node-toolbar';
import { TextFormattingControls } from './components/toolbar-controls';
import { type TypedNodeProps } from './core/types';

type TextNodeProps = TypedNodeProps<'textNode'>;

const TextNodeComponent = (props: TextNodeProps) => {
	const { data } = props;

	const { content, metadata } = data;
	const { updateNode, selectedNodes } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
		}))
	);

	// Use theme defaults with fallback to metadata
	const {
		fontSize = '14px',
		fontWeight = 400,
		textAlign = 'center',
		textColor = 'var(--text-text-high)',
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
			style.fontSize =
				typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
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
			<SharedNodeToolbar
				isVisible={props.selected && selectedNodes.length === 1}
			>
				<TextFormattingControls
					alignment={textAlign}
					isBold={fontWeight === 600}
					isItalic={fontStyle === 'italic'}
					onAlignmentChange={(alignment) =>
						handleNodeChange({ textAlign: alignment })
					}
					onBoldToggle={(bold) =>
						handleNodeChange({ fontWeight: bold ? 600 : 400 })
					}
					onItalicToggle={(italic) =>
						handleNodeChange({ fontStyle: italic ? 'italic' : 'normal' })
					}
				/>
			</SharedNodeToolbar>

			<BaseNodeWrapper
				{...props}
				hideNodeType
				elevation={1}
				includePadding={true}
				nodeClassName='text-node min-w-fit min-h-fit h-full'
				nodeIcon={<Type className='w-3 h-3' />}
				nodeType='Text'
			>
				<div
					style={textStyle}
					className={cn(
						'flex items-center min-h-8 w-full',
						textAlign === 'center' && 'justify-center',
						textAlign === 'right' && 'justify-end',
						textAlign === 'left' && 'justify-start'
					)}
				>
					{content || (
						<span className='italic text-sm text-text-disabled'>
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
