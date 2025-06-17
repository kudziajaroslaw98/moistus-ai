import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { useNodeId } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

const CollapseButtonComponent = () => {
	const { getDirectChildrenCount, getNode, toggleNodeCollapse } = useAppStore(
		useShallow((state) => ({
			getDirectChildrenCount: state.getDirectChildrenCount,
			getNode: state.getNode,
			toggleNodeCollapse: state.toggleNodeCollapse,
		}))
	);
	const [hover, setHover] = useState(false);
	const nodeId = useNodeId();
	const data = useMemo(() => getNode(nodeId!)?.data, [getNode, nodeId]);
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
					className='nodrag nopan z-20 rounded-sm hover:bg-black/20 h-5 w-auto group flex gap-2 px-1 transition-all'
					variant={'ghost'}
					title={
						collapsed
							? `Expand Branch (${directChildrenCount} ${directChildrenCount === 1 ? 'child' : 'children'})`
							: `Collapse Branch (${directChildrenCount} ${directChildrenCount === 1 ? 'child' : 'children'})`
					}
					onHoverStart={() => setHover(true)}
					onHoverEnd={() => setHover(false)}
				>
					{collapsed ? (
						<ChevronRight className='size-3' />
					) : (
						<ChevronDown className='size-3' />
					)}

					<AnimatePresence>
						{hover && (
							<motion.span
								key={`hover-${hover}`}
								initial={{ width: 0, opacity: 0 }}
								animate={{ width: 'auto', opacity: 1 }}
								exit={{ width: 0, opacity: 0 }}
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
