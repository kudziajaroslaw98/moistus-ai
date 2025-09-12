import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { useNodeId } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';
import { memo } from 'react';
import { motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';

const CommentButtonComponent = () => {
	const nodeId = useNodeId();
	const [isHovered, setIsHovered] = useState(false);

	const { commentSummaries, setPopoverOpen } = useAppStore(
		useShallow((state) => ({
			commentSummaries: state.commentSummaries,
			setPopoverOpen: state.setPopoverOpen,
		}))
	);

	const commentCount = useMemo(() => {
		const summaries = commentSummaries.get(nodeId!);
		if (!summaries) return 0;
		return summaries.comment_count || 0;
	}, [commentSummaries, nodeId]);

	const unresolvedCount = useMemo(() => {
		const summaries = commentSummaries.get(nodeId!);
		if (!summaries) return 0;
		return summaries.unresolved_count || 0;
	}, [commentSummaries, nodeId]);

	const handleOnCommentClick = useCallback(() => {
		setPopoverOpen({ commentsPanel: true });
	}, [setPopoverOpen]);

	if (commentCount === 0) {
		return null;
	}

	const hasUnresolved = unresolvedCount > 0;

	return (
		<Button
			onClick={handleOnCommentClick}
			className='nodrag nopan z-20 rounded-md hover:scale-105 h-6 w-auto flex items-center gap-1.5 px-1.5 transition-all relative'
			variant={'ghost'}
			style={{
				backgroundColor: isHovered 
					? (hasUnresolved ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255, 255, 255, 0.08)')
					: (hasUnresolved ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.05)'),
				border: hasUnresolved 
					? '1px solid rgba(96, 165, 250, 0.3)'
					: '1px solid rgba(255, 255, 255, 0.1)',
				color: 'rgba(255, 255, 255, 0.87)',
			}}
			title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}${unresolvedCount > 0 ? ` (${unresolvedCount} unresolved)` : ''}`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Pulse animation for unresolved comments */}
			{hasUnresolved && (
				<motion.div
					className='absolute inset-0 rounded-md pointer-events-none'
					animate={{
						opacity: [0.3, 0.6, 0.3],
					}}
					transition={{
						duration: 2,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
					style={{
						backgroundColor: 'rgba(96, 165, 250, 0.2)',
					}}
				/>
			)}

			<MessageCircle
				className={cn([
					'size-3 relative z-10',
					hasUnresolved && 'fill-sky-400/50'
				])}
				style={{ 
					color: hasUnresolved 
						? 'rgba(147, 197, 253, 0.87)' 
						: 'rgba(255, 255, 255, 0.6)'
				}}
			/>

			<span 
				className='relative z-10'
				style={{ 
					fontSize: '11px',
					fontWeight: hasUnresolved ? 600 : 500,
					color: hasUnresolved 
						? 'rgba(147, 197, 253, 0.87)'
						: 'rgba(255, 255, 255, 0.6)'
				}}
			>
				{commentCount}
			</span>

			{/* Unresolved indicator dot */}
			{hasUnresolved && (
				<motion.div
					className='absolute -top-1 -right-1 w-2 h-2 rounded-full z-20'
					style={{
						backgroundColor: 'rgba(96, 165, 250, 0.87)',
						boxShadow: '0 0 4px rgba(96, 165, 250, 0.5)',
					}}
					animate={{
						scale: [1, 1.2, 1],
					}}
					transition={{
						duration: 2,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
			)}
		</Button>
	);
};

const CommentButton = memo(CommentButtonComponent);
export default CommentButton;