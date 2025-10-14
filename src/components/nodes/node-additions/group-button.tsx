import useAppStore from '@/store/mind-map-store';
import { useNodeId } from '@xyflow/react';
import { Group } from 'lucide-react';
import { memo } from 'react';
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
	}, [groupId, getNode]);

	if (!groupId || !groupNode) return null;

	const groupLabel = groupNode.data.metadata?.label || 'Group';

	return (
		<div
			className='flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-default'
			title={`Member of group: ${groupLabel}`}
			style={{
				backgroundColor: 'rgba(167, 139, 250, 0.1)',
				border: '1px solid rgba(167, 139, 250, 0.2)',
				fontSize: '11px',
			}}
		>
			<Group className='size-3' style={{ color: 'rgba(167, 139, 250, 0.87)' }} />

			<span
style={{ 
				color: 'rgba(167, 139, 250, 0.87)',
				fontWeight: 500,
				letterSpacing: '0.01em'
			}}
			>
				{groupLabel}
			</span>
		</div>
	);
};

const GroupButton = memo(GroupButtonComponent);
export default GroupButton;