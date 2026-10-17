interface ThreadNode {
	type?: string;
	// Node data is loosely typed; `user_id` is the node's author.
	data: Record<string, unknown>;
}

/**
 * Who may delete a comment thread: editors any thread, commenters only the
 * ones they started. Viewers none.
 */
export function canDeleteCommentThread(
	permissions: { canEdit: boolean; canComment: boolean },
	node: ThreadNode,
	userId: string | null | undefined
): boolean {
	if (node.type !== 'commentNode') return false;
	if (permissions.canEdit) return true;

	return (
		permissions.canComment && Boolean(userId) && node.data.user_id === userId
	);
}
