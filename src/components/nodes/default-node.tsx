'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { AlertCircle, Flag, NotepadText, Star } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useShallow } from 'zustand/shallow';
import { AutoResizeTextarea } from '../ui/auto-resize-textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
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
	const status = data.status as string | undefined;
	const importance = data.importance as number | undefined;

	const handleNodeChange = useCallback(
		(change: Partial<NodeData>) => {
			updateNode({
				nodeId: id,
				data: change,
			});
		},
		[updateNode, id]
	);

	useEffect(() => {
		if (!isEditing) {
			setLocalContent(data.content || '');
			setState({ editingNodeId: null });
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

	const statusOptions = [
		{ value: 'draft', label: 'Draft', icon: AlertCircle },
		{ value: 'in-progress', label: 'In Progress', icon: Flag },
		{ value: 'completed', label: 'Completed', icon: Star },
		{ value: 'on-hold', label: 'On Hold', icon: AlertCircle },
	];

	const importanceOptions = [
		{ value: 1, label: '⭐', title: 'Low importance' },
		{ value: 2, label: '⭐⭐', title: 'Medium-low importance' },
		{ value: 3, label: '⭐⭐⭐', title: 'Medium importance' },
		{ value: 4, label: '⭐⭐⭐⭐', title: 'High importance' },
		{ value: 5, label: '⭐⭐⭐⭐⭐', title: 'Critical importance' },
	];

	const toolbarContent = useMemo(
		() => (
			<>
				{/* Status Selector */}
				<Select
					value={status || ''}
					onValueChange={(value) => handleNodeChange({ status: value })}
				>
					<SelectTrigger className='h-8 w-32' size='sm'>
						<div className='flex items-center gap-1'>
							{status && (
								<>
									{(() => {
										const statusOption = statusOptions.find(
											(opt) => opt.value === status
										);

										if (statusOption) {
											const Icon = statusOption.icon;
											return <Icon className='w-3 h-3' />;
										}

										return null;
									})()}
								</>
							)}

							<SelectValue placeholder='Status' />
						</div>
					</SelectTrigger>

					<SelectContent position='popper'>
						{statusOptions.map((option) => {
							const Icon = option.icon;
							return (
								<SelectItem key={option.value} value={option.value}>
									<div className='flex items-center gap-2'>
										<Icon className='w-3 h-3' />

										{option.label}
									</div>
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>

				{/* Importance Selector */}
				<Select
					value={importance?.toString() || ''}
					onValueChange={(value) =>
						handleNodeChange({ importance: value ? parseInt(value) : null })
					}
				>
					<SelectTrigger className='h-8 w-24' size='sm'>
						<SelectValue placeholder='Priority' />
					</SelectTrigger>

					<SelectContent>
						{importanceOptions.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value.toString()}
								title={option.title}
							>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Status/Importance Display Badge */}
				{(status || importance) && (
					<div className='flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400'>
						{status && (
							<span className='capitalize text-xs'>
								{status.replace('-', ' ')}
							</span>
						)}

						{status && importance && <span>•</span>}

						{importance && (
							<span>{importanceOptions[importance - 1]?.label}</span>
						)}
					</div>
				)}
			</>
		),
		[status, importance, handleNodeChange, statusOptions, importanceOptions]
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName={cn(['basic-node h-full gap-0'])}
			nodeType='Note'
			nodeIcon={<NotepadText className='size-4' />}
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
					className='nodrag nopan nowheel w-full bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-leftinherit p-0 m-0'
				/>
			) : (
				<div className='prose p-4 prose-invert flex flex-col gap-2 prose-ul:flex prose-ul:flex-col prose-ul:gap-2 prose-sm max-w-none break-words prose-headings:m-0'>
					<MarkdownWrapper
						content={data.content || 'Double click to edit...'}
					/>
				</div>
			)}
		</BaseNodeWrapper>
	);
};

const DefaultNode = memo(DefaultNodeComponent);
DefaultNode.displayName = 'DefaultNode';
export default DefaultNode;
