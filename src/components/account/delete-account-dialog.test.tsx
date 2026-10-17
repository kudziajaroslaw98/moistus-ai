import { render, screen } from '@testing-library/react';
import { DeleteAccountDialog } from './delete-account-dialog';

function renderDialog() {
	return render(
		<DeleteAccountDialog
			open
			impactStats={{ mindMapsCount: 2, hasActiveSubscription: false }}
			onConfirm={async () => {}}
			onOpenChange={() => {}}
			userEmail='ada@example.com'
		/>
	);
}

describe('DeleteAccountDialog', () => {
	it('says what is deleted: the person’s own maps and everything in them', () => {
		renderDialog();

		expect(screen.getByText('Mind maps created')).toBeInTheDocument();
		expect(
			screen.getByText('Nodes, connections & comments on your maps')
		).toBeInTheDocument();
	});

	it('says what stays: contributions to other people’s maps, as Former member', () => {
		renderDialog();

		// Deleting must not promise "all nodes and comments" are removed: the ones
		// added to other people's maps stay, without a name.
		expect(
			screen.queryByText('All nodes, connections & comments')
		).not.toBeInTheDocument();
		expect(
			screen
				.getByText('What you added to other people’s maps stays there')
				.closest('p')
		).toHaveTextContent('Former member');
	});
});
