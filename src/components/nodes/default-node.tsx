'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { AlertCircle, Flag, NotepadText, Star } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useShallow } from 'zustand/shallow';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { BaseNodeWrapper } from './base-node-wrapper';
import { NodeMetadata, NodeTags } from './shared';

const MarkdownWrapperComponent = ({ content }: { content: string }) => {
	return <ReactMarkdown>{content}</ReactMarkdown>;
};

const MarkdownWrapper = memo(MarkdownWrapperComponent);
MarkdownWrapper.displayName = 'MarkdownWrapper';

const DefaultNodeComponent = (props: NodeProps<Node<NodeData>>) => {
	const { id, data } = props;

	const { openNodeEditor, updateNode, getNode } = useAppStore(
		useShallow((state) => ({
			openNodeEditor: state.openNodeEditor,
			updateNode: state.updateNode,
			getNode: state.getNode,
		}))
	);

	const status = data.metadata?.status as string | undefined;
	const priority = data.metadata?.priority as number | undefined;
	const tags = data.metadata?.tags as string[] | undefined;

	const handleNodeChange = useCallback(
		(change: Partial<NodeData>) => {
			updateNode({
				nodeId: id,
				data: change,
			});
		},
		[updateNode, id]
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


	const statusOptions = [
		{ value: 'draft', label: 'Draft', icon: AlertCircle },
		{ value: 'in-progress', label: 'In Progress', icon: Flag },
		{ value: 'completed', label: 'Completed', icon: Star },
		{ value: 'on-hold', label: 'On Hold', icon: AlertCircle },
	];

	const priorityOptions = [
		{ value: 'low', title: 'Low' },
		{ value: 'medium', title: 'Medium' },
		{ value: 'high', title: 'High' },
	];

	const toolbarContent = useMemo(
		() => (
			<>
				{/* Status Selector */}
				<Select
					value={status || ''}
					onValueChange={(value) =>
						handleNodeChange({ metadata: { status: value } })
					}
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
					value={priority?.toString() || ''}
					onValueChange={(value) =>
						handleNodeChange({
							metadata: { priority: value || null },
						})
					}
				>
					<SelectTrigger className='h-8 w-32' size='sm'>
						<SelectValue placeholder='Priority' />
					</SelectTrigger>

					<SelectContent>
						{priorityOptions.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value.toString()}
								title={option.title}
							>
								{option.value}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Status/Importance Display Badge */}
				{(status || priority) && (
					<div className='flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400'>
						{status && (
							<span className='capitalize text-xs'>
								{status.replace('-', ' ')}
							</span>
						)}

						{status && priority && <span>•</span>}

						{priority && <span>{priorityOptions[priority - 1]?.value}</span>}
					</div>
				)}
			</>
		),
		[status, priority, handleNodeChange, statusOptions, priorityOptions]
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
			<div className='prose p-4 prose-invert flex flex-col gap-2 prose-ul:flex prose-ul:flex-col prose-ul:gap-2 prose-sm max-w-none break-words prose-headings:m-0'>
				<MarkdownWrapper
					content={data.content || 'Double click to edit...'}
				/>

				{tags && tags.length > 0 && (
					<NodeTags
						tags={tags}
						className='mt-2'
						onTagClick={(tag) => console.log('Tag clicked:', tag)}
					/>
				)}

				{/* Additional Metadata Display */}
				{data.metadata && Object.keys(data.metadata).length > 0 && (
					<div className='mt-2 pt-2 border-t border-zinc-800/50'>
						<NodeMetadata
							nodeId={id}
							metadata={data.metadata}
							layout='horizontal'
							maxItems={3}
							className='w-full'
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
