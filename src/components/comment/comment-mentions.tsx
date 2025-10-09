import { Comment } from '@/types/comment-types';
import { AtSign } from 'lucide-react';

interface CommentMentionsProps {
	mentions?: Comment['mentions'];
	mentionedUsers?: Comment['mentioned_users'];
}

export function CommentMentions({
	mentions: _mentions = [],
	mentionedUsers = [],
}: CommentMentionsProps) {
	if (!mentionedUsers.length) return null;

	return (
		<div className='flex items-center gap-1 mt-1 text-xs text-zinc-400'>
			<AtSign className='size-3' />

			<span>Mentioned:</span>

			<div className='flex gap-1'>
				{mentionedUsers.map((user, index) => (
					<span key={user.id}>
						{user.display_name || user.full_name}

						{index < mentionedUsers.length - 1 && ','}
					</span>
				))}
			</div>
		</div>
	);
}
