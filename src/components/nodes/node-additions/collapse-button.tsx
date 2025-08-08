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

	return (
		<motion.div className='bg-node-accent text-node-text-main rounded-t-sm text-[10px] font-semibold font-mono flex items-center justify-center gap-2'>
			{hasChildren && (
				<Button
					onClick={handleToggleCollapse}
					className='nodrag nopan z-20 rounded-sm hover:bg-black/20 h-5 w-auto group flex px-1 transition-all'
					variant={'ghost'}
					title={
						collapsed
							? `Expand Branch (${directChildrenCount} ${directChildrenCount === 1 ? 'child' : 'children'})`
							: `Collapse Branch (${directChildrenCount} ${directChildrenCount === 1 ? 'child' : 'children'})`
					}
					onHoverStart={() => setHover(true)}
					onHoverEnd={() => setHover(false)}
				>
					{!collapsed ? (
						<ChevronUp className='size-3' />
					) : (
						<ChevronDown className='size-3' />
					)}

					<AnimatePresence>
						{hover && (
							<motion.span
								key={`hover-${hover}`}
								initial={{ width: 0, opacity: 0, paddingLeft: 0 }}
								animate={{ width: '10ch', opacity: 1, paddingLeft: 8 }}
								exit={{ width: 0, opacity: 0, paddingLeft: 0 }}
								transition={{
									width: { duration: 0.25 },
									opacity: { duration: 0.4 },
									ease: 'easeOut',
								}}
							>
								{collapsed ? 'Expand' : 'Collapse'}
							</motion.span>
						)}
					</AnimatePresence>
				</Button>
			)}
		</motion.div>
	);
};

const CollapseButton = memo(CollapseButtonComponent);
CollapseButton.displayName = 'CollapseButton';
export default CollapseButton;
