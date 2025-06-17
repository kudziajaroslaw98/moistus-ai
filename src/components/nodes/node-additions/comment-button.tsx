import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { useNodeId } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';
import { memo, motion } from 'motion/react';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

const CommentButtonComponent = () => {
	const nodeId = useNodeId();

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

	return (
		<motion.div className='bg-node-accent text-node-text-main rounded-t-sm text-[10px] font-semibold font-mono flex items-center justify-center gap-2'>
			<Button
				onClick={handleOnCommentClick}
				className='nodrag nopan z-20 rounded-sm hover:bg-black/20 h-5 w-auto group flex gap-2 px-2 relative transition-all'
				variant={'ghost'}
				title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}${unresolvedCount > 0 ? ` (${unresolvedCount} unresolved)` : ''}`}
			>
				<MessageCircle
					className={cn([
						'size-3',
						unresolvedCount > 0
							? ' fill-sky-500 text-sky-500 animate-pulse'
							: '',
					])}
				/>

				<span>{commentCount}</span>
			</Button>
		</motion.div>
	);
};

const CommentButton = memo(CommentButtonComponent);

export default CommentButton;
