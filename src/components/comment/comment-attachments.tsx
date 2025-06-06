import { Comment } from '@/types/comment-types';
import { ExternalLink, File, Image } from 'lucide-react';
import { Button } from '../ui/button';

interface CommentAttachmentsProps {
	attachments?: Comment['attachments'];
}

export function CommentAttachments({
	attachments = [],
}: CommentAttachmentsProps) {
	if (!attachments.length) return null;

	return (
		<div className='mt-2 space-y-2'>
			{attachments.map((attachment) => (
				<div
					key={attachment.id}
					className='flex items-center gap-2 p-2 bg-zinc-800/50 rounded text-xs'
				>
					{attachment.type === 'image' && (
						<Image className='size-3 text-blue-400' />
					)}

					{attachment.type === 'file' && (
						<File className='size-3 text-green-400' />
					)}

					{attachment.type === 'link' && (
						<ExternalLink className='size-3 text-purple-400' />
					)}

					<span className='flex-1 truncate'>{attachment.name}</span>

					{attachment.size && (
						<span className='text-zinc-500'>
							{(attachment.size / 1024).toFixed(1)}KB
						</span>
					)}

					<Button
						variant='ghost'
						size='sm'
						onClick={() => window.open(attachment.url, '_blank')}
						className='h-5 w-5 p-0'
					>
						<ExternalLink className='size-3' />
					</Button>
				</div>
			))}
		</div>
	);
}
