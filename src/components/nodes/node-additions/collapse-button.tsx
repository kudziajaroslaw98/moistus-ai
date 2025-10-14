import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { useNodeId } from '@xyflow/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

const CollapseButtonComponent = (props: { data: NodeData }) => {
	const { getDirectChildrenCount, toggleNodeCollapse } = useAppStore(
		useShallow((state) => ({
			getDirectChildrenCount: state.getDirectChildrenCount,
			toggleNodeCollapse: state.toggleNodeCollapse,
		}))
	);
	const [hover, setHover] = useState(false);
	const nodeId = useNodeId();
	const { data } = props;
	const directChildrenCount = useMemo(() => {
		return getDirectChildrenCount(nodeId!);
	}, [getDirectChildrenCount, nodeId]);
	const hasChildren = directChildrenCount > 0;

	const collapsed = data?.metadata?.isCollapsed ?? false;

	const handleToggleCollapse = useCallback(() => {
		toggleNodeCollapse(nodeId!);
	}, [nodeId, toggleNodeCollapse]);

	// Don't render anything if no children
	if (!hasChildren) return null;

	return (
		<Button
			className='nodrag nopan z-20 rounded-md hover:scale-105 h-6 w-auto flex items-center px-1.5 transition-all'
			variant={'ghost'}
			style={{
				backgroundColor: hover ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
				border: '1px solid rgba(255, 255, 255, 0.1)',
				color: 'rgba(255, 255, 255, 0.87)',
			}}
			title={
				collapsed
					? `Expand Branch (${directChildrenCount} ${directChildrenCount === 1 ? 'child' : 'children'})`
					: `Collapse Branch (${directChildrenCount} ${directChildrenCount === 1 ? 'child' : 'children'})`
			}
			onClick={handleToggleCollapse}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			<motion.div
				animate={{ rotate: collapsed ? 0 : 180 }}
				className='flex items-center'
				transition={{ duration: 0.2 }}
			>
				<ChevronDown className='size-3' style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
			</motion.div>

			<AnimatePresence>
				{hover && (
					<motion.span
						animate={{ width: 'auto', opacity: 1, marginLeft: 4 }}
						exit={{ width: 0, opacity: 0, marginLeft: 0 }}
						initial={{ width: 0, opacity: 0, marginLeft: 0 }}
						key='label'
						style={{
							fontSize: '11px',
							color: 'rgba(255, 255, 255, 0.6)',
							overflow: 'hidden',
							whiteSpace: 'nowrap',
						}}
						transition={{
							duration: 0.2,
							ease: 'easeOut' as const,
						}}
					>
						{collapsed ? 'Expand' : 'Collapse'}
					</motion.span>
				)}
			</AnimatePresence>

			{/* Badge showing child count */}
			{directChildrenCount > 0 && (
				<span
					style={{
						marginLeft: hover ? '4px' : '2px',
						padding: '0 4px',
						borderRadius: '4px',
						fontSize: '10px',
						backgroundColor: 'rgba(96, 165, 250, 0.15)',
						color: 'rgba(147, 197, 253, 0.87)',
						fontWeight: 600,
						transition: 'all 0.2s',
					}}
				>
					{directChildrenCount}
				</span>
			)}
		</Button>
	);
};

const CollapseButton = memo(CollapseButtonComponent);
CollapseButton.displayName = 'CollapseButton';
export default CollapseButton;