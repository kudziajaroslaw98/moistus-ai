import { canDeleteCommentThread } from './comment-thread-permissions';

const thread = (userId: string | null) => ({
	type: 'commentNode',
	data: { user_id: userId },
});

const role = {
	owner: { canEdit: true, canComment: true },
	editor: { canEdit: true, canComment: true },
	commenter: { canEdit: false, canComment: true },
	viewer: { canEdit: false, canComment: false },
};

describe('canDeleteCommentThread', () => {
	it.each(['owner', 'editor'] as const)(
		'lets an %s delete any thread',
		(name) => {
			expect(
				canDeleteCommentThread(role[name], thread('someone-else'), 'me')
			).toBe(true);
		}
	);

	it('lets a commenter delete a thread they started', () => {
		expect(canDeleteCommentThread(role.commenter, thread('me'), 'me')).toBe(
			true
		);
	});

	it("does not let a commenter delete someone else's thread", () => {
		expect(
			canDeleteCommentThread(role.commenter, thread('someone-else'), 'me')
		).toBe(false);
	});

	it('does not let a viewer delete any thread, even their own', () => {
		expect(canDeleteCommentThread(role.viewer, thread('me'), 'me')).toBe(false);
	});

	it('does not treat a missing user as the author', () => {
		expect(canDeleteCommentThread(role.commenter, thread(null), null)).toBe(
			false
		);
		expect(
			canDeleteCommentThread(role.commenter, thread(null), undefined)
		).toBe(false);
	});

	it('only applies to comment threads', () => {
		expect(
			canDeleteCommentThread(
				role.commenter,
				{ type: 'defaultNode', data: { user_id: 'me' } },
				'me'
			)
		).toBe(false);
	});
});
