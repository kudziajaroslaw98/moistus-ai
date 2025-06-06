'use client';

import { BuilderNodeData } from '@/types/builder-node';
import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { memo } from 'react';
import { BuilderCanvas } from '../builder/builder-canvas';
import { BaseNodeWrapper } from './base-node-wrapper';

type BuilderNodeProps = NodeProps<Node<NodeData>>;

const BuilderNodeComponent = (props: BuilderNodeProps) => {
	const { data } = props;

	const builderData = data.metadata?.builderData as BuilderNodeData | undefined;

	if (!builderData?.canvas) {
		return (
			<BaseNodeWrapper
				{...props}
				nodeClassName='builder-node'
				nodeType='Builder'
				nodeIcon={<Layers className='size-4' />}
			>
				<div className='flex flex-col items-center justify-center h-32 text-zinc-500'>
					<Layers className='size-8 mb-2' />

					<span className='text-sm'>No elements configured</span>

					<span className='text-xs opacity-70'>Click edit to add elements</span>
				</div>
			</BaseNodeWrapper>
		);
	}

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='builder-node'
			nodeType='Builder'
			nodeIcon={<Layers className='size-4' />}
			includePadding={false}
		>
			<div className='w-full h-full p-4'>
				<BuilderCanvas
					canvas={builderData.canvas}
					onCanvasUpdate={() => {}} // Read-only in display mode
					isEditing={false}
				/>
			</div>
		</BaseNodeWrapper>
	);
};

const BuilderNode = memo(BuilderNodeComponent);
BuilderNode.displayName = 'BuilderNode';
export default BuilderNode;
