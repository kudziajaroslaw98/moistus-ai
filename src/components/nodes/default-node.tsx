'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { NotepadText } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useShallow } from 'zustand/shallow';
import { AutoResizeTextarea } from '../ui/auto-resize-textarea';
import { BaseNodeWrapper } from './base-node-wrapper';

const MarkdownWrapperComponent = ({ content }: { content: string }) => {
	return <ReactMarkdown>{content}</ReactMarkdown>;
};

const MarkdownWrapper = memo(MarkdownWrapperComponent);
MarkdownWrapper.displayName = 'MarkdownWrapper';

const DefaultNodeComponent = (props: NodeProps<Node<NodeData>>) => {
	const { id, data } = props;

	const { editingNodeId, setState, updateNode } = useAppStore(
		useShallow((state) => ({
			editingNodeId: state.editingNodeId,
			updateNode: state.updateNode,
			setState: state.setState,
		}))
	);

	const [localContent, setLocalContent] = useState(data.content || '');
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const isEditing = editingNodeId === id;

	useEffect(() => {
		if (!isEditing) {
			setLocalContent(data.content || '');
		}
	}, [data.content, isEditing]);

	// This effect is now only for focusing the textarea, not resizing.
	useEffect(() => {
		if (isEditing && textareaRef.current) {
			textareaRef.current.focus();
			textareaRef.current.select();
		}
	}, [isEditing]);

	const handleDoubleClick = () => {
		setLocalContent(data.content || '');
		setState({ editingNodeId: id });
	};

	const saveChanges = () => {
		if (localContent !== data.content) {
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
			setLocalContent(data.content || '');
		}
	};

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName={cn(['basic-node h-full gap-0'])}
			nodeType='Note'
			nodeIcon={<NotepadText className='size-4' />}
		>
			<div onDoubleClick={handleDoubleClick} className='w-full h-full'>
				{isEditing ? (
					<AutoResizeTextarea
						ref={textareaRef}
						value={localContent}
						onChange={(e) => setLocalContent(e.target.value)}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						className='nodrag nopan nowheel w-full bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-leftinherit p-0 m-0'
					/>
				) : (
					<div className='prose p-4 prose-invert flex flex-col gap-2 prose-ul:flex prose-ul:flex-col prose-ul:gap-2 prose-sm max-w-none break-words prose-headings:m-0'>
						<MarkdownWrapper
							content={data.content || 'Double click to edit...'}
						/>
					</div>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const DefaultNode = memo(DefaultNodeComponent);
DefaultNode.displayName = 'DefaultNode';
export default DefaultNode;
