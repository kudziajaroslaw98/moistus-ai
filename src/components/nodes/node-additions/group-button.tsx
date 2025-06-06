import useAppStore from '@/contexts/mind-map/mind-map-store';
import { useNodeId } from '@xyflow/react';
import { Group } from 'lucide-react';
import { memo } from 'motion/react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

const GroupButtonComponent = () => {
	const { getNode } = useAppStore(
		useShallow((state) => ({
			getNode: state.getNode,
		}))
	);
	const nodeId = useNodeId();
	const data = useMemo(() => getNode(nodeId!)?.data, [getNode, nodeId]);
	const groupId = data?.metadata?.groupId;
	const groupNode = useMemo(() => {
		if (!groupId) return null;
		return getNode(groupId);
	}, [groupId]);

	if (!groupId || !groupNode) return null;

	return (
		<div
			className='bg-purple-600 text-white rounded-t-sm px-2 py-0.5 text-[10px] font-semibold font-mono flex items-center gap-1'
			title={`Member of group: ${groupNode.data.metadata?.label || 'Group'}`}
		>
			<Group className='size-3' />

			<span>{groupNode.data.metadata?.label || 'Group'}</span>
		</div>
	);
};

const GroupButton = memo(GroupButtonComponent);
export default GroupButton;
