import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

const CollapsedIndicatorComponent = (props: { data: NodeData }) => {
	const { data } = props;
	const { getDirectChildrenCount } = useAppStore(
		useShallow((state) => ({
			getDirectChildrenCount: state.getDirectChildrenCount,
		}))
	);
	const directChildrenCount = useMemo(() => {
		return getDirectChildrenCount(data.id!);
	}, [getDirectChildrenCount, data]);

	const collapsed = data?.metadata?.isCollapsed ?? false;

	if (!collapsed || directChildrenCount === 0) {
		return null;
	}

	return (
		<>
			<div className='absolute w-full h-full -z-[2] left-3.5 -bottom-3.5 rounded-lg border-2 border-node-accent/25 bg-zinc-950' />

			<div className='absolute w-full h-full -z-[1] -bottom-2 left-2 rounded-lg border-2 border-node-accent/25 bg-zinc-950' />

			<div
				className='absolute -bottom-2 -right-2 z-10 rounded-full bg-node-accent px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md'
				title={`${directChildrenCount} hidden item${directChildrenCount !== 1 ? 's' : ''}`}
			>
				{directChildrenCount}
			</div>
		</>
	);
};

const CollapsedIndicator = memo(CollapsedIndicatorComponent);

export default CollapsedIndicator;
