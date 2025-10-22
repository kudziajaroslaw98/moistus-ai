import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { motion } from 'motion/react';
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

	// Determine the visual weight based on the number of hidden items
	const getIndicatorIntensity = (count: number) => {
		if (count > 10) return { opacity: 0.15, blur: 3 };
		if (count > 5) return { opacity: 0.12, blur: 2 };
		return { opacity: 0.08, blur: 1 };
	};

	const intensity = getIndicatorIntensity(directChildrenCount);

	return (
		collapsed && (
			<>
				{/* First shadow layer - furthest back */}
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='absolute w-full h-full -z-[101] left-0 top-0 rounded-lg translate-2.5'
					exit={{ opacity: 0, scale: 0.95 }}
					initial={{ opacity: 0, scale: 0.95 }}
					transition={{ duration: 0.2, delay: 0.05 }}
					style={{
						backgroundColor: '#0d0d0d',
						border: '1px solid rgba(255, 255, 255, 0.03)',
						boxShadow: `0 4px 12px rgba(0, 0, 0, ${intensity.opacity * 2})`,
						filter: `blur(${intensity.blur}px)`,
					}}
				/>

				{/* Second shadow layer - middle */}
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='absolute w-full h-full -z-[100] left-0 top-0 rounded-lg translate-1.5'
					exit={{ opacity: 0, scale: 0.97 }}
					initial={{ opacity: 0, scale: 0.97 }}
					transition={{ duration: 0.2, delay: 0.03 }}
					style={{
						backgroundColor: '#121212',
						border: '1px solid rgba(255, 255, 255, 0.05)',
						boxShadow: `0 2px 8px rgba(0, 0, 0, ${intensity.opacity})`,
					}}
				/>

				{/* Count badge with sophisticated styling */}
				<motion.div
					animate={{ scale: 1, opacity: 1 }}
					className='absolute -bottom-1.5 -right-1.5 z-10'
					exit={{ scale: 0, opacity: 0 }}
					initial={{ scale: 0, opacity: 0 }}
					transition={{
						type: 'spring',
						delay: 0.3,
					}}
				>
					{/* Badge container */}
					<div
						className='relative rounded-full px-2 py-0.5 flex items-center justify-center min-w-[20px] bg-zinc-900 border border-sky-500/50'
						title={`${directChildrenCount} hidden ${directChildrenCount === 1 ? 'item' : 'items'}`}
					>
						{/* Count text with proper hierarchy */}
						<span className='text-sky-500 text-xs font-semibold leading-3'>
							{directChildrenCount > 99 ? '99+' : directChildrenCount}
						</span>
					</div>
				</motion.div>

				{/* Subtle gradient overlay on the main node to enhance depth
					<div
						className='absolute -z-[100] inset-0 rounded-lg pointer-events-none'
						style={{
							background:
								'linear-gradient(135deg, transparent 60%, rgba(0, 0, 0, 0.05) 100%)',
						}}
					/> */}
			</>
		)
	);
};

const CollapsedIndicator = memo(CollapsedIndicatorComponent);
export default CollapsedIndicator;
