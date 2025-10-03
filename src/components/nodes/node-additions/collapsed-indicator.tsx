import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { AnimatePresence, motion } from 'motion/react';
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
		<AnimatePresence>
			{collapsed && (
				<>
					{/* First shadow layer - furthest back */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.2, delay: 0.05 }}
						className='absolute w-full h-full -z-[2] left-3 -bottom-3 rounded-lg'
						style={{
							backgroundColor: '#0d0d0d',
							border: '1px solid rgba(255, 255, 255, 0.03)',
							boxShadow: `0 4px 12px rgba(0, 0, 0, ${intensity.opacity * 2})`,
							filter: `blur(${intensity.blur}px)`,
						}}
					/>

					{/* Second shadow layer - middle */}
					<motion.div
						initial={{ opacity: 0, scale: 0.97 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.97 }}
						transition={{ duration: 0.2, delay: 0.03 }}
						className='absolute w-full h-full -z-[1] left-1.5 -bottom-1.5 rounded-lg'
						style={{
							backgroundColor: '#121212',
							border: '1px solid rgba(255, 255, 255, 0.05)',
							boxShadow: `0 2px 8px rgba(0, 0, 0, ${intensity.opacity})`,
						}}
					/>

					{/* Count badge with sophisticated styling */}
					<motion.div
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0, opacity: 0 }}
						transition={{
							type: 'spring',
							stiffness: 400,
							damping: 25,
							delay: 0.1,
						}}
						className='absolute -bottom-1.5 -right-1.5 z-10'
					>
						{/* Glow effect behind badge */}
						<div
							className='absolute inset-0 rounded-full'
							style={{
								background:
									'radial-gradient(circle, rgba(96, 165, 250, 0.2) 0%, transparent 70%)',
								filter: 'blur(8px)',
								transform: 'scale(2)',
							}}
						/>

						{/* Badge container */}
						<div
							className='relative rounded-full px-2 py-0.5 flex items-center justify-center min-w-[20px]'
							style={{
								backgroundColor: 'rgba(30, 30, 30, 0.9)',
								border: '1px solid rgba(96, 165, 250, 0.3)',
								backdropFilter: 'blur(8px)',
								boxShadow:
									'0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
							}}
							title={`${directChildrenCount} hidden ${directChildrenCount === 1 ? 'item' : 'items'}`}
						>
							{/* Count text with proper hierarchy */}
							<span
								style={{
									fontSize: '10px',
									fontWeight: 600,
									color: 'rgba(147, 197, 253, 0.87)',
									letterSpacing: '0.02em',
									lineHeight: 1,
								}}
							>
								{directChildrenCount > 99 ? '99+' : directChildrenCount}
							</span>
						</div>

						{/* Pulse animation for large counts */}
						{directChildrenCount > 5 && (
							<motion.div
								className='absolute inset-0 rounded-full pointer-events-none'
								animate={{
									scale: [1, 1.3, 1],
									opacity: [0.3, 0, 0.3],
								}}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: 'easeInOut',
								}}
								style={{
									border: '1px solid rgba(96, 165, 250, 0.5)',
								}}
							/>
						)}
					</motion.div>

					{/* Subtle gradient overlay on the main node to enhance depth */}
					<div
						className='absolute inset-0 rounded-lg pointer-events-none'
						style={{
							background:
								'linear-gradient(135deg, transparent 60%, rgba(0, 0, 0, 0.05) 100%)',
						}}
					/>
				</>
			)}
		</AnimatePresence>
	);
};

const CollapsedIndicator = memo(CollapsedIndicatorComponent);
export default CollapsedIndicator;
