import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription } from './dialog';
import { Panel } from './panel';

/**
 * Confirm dialogs (discard changes, delete) are rendered next to a panel, not inside it.
 * They must stay on top of a modal panel and stay reachable: not hidden or inert, with
 * their own overlay above the panel's.
 */
function Harness({ variant }: { variant: 'modal' | 'docked' }) {
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<>
			<Panel
				onOpenChange={() => setConfirmOpen(true)}
				open
				title='Settings'
				variant={variant}
			>
				<button onClick={() => setConfirmOpen(true)} type='button'>
					Ask
				</button>
			</Panel>

			<Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
				<DialogContent showCloseButton={false}>
					<DialogDescription>Discard changes?</DialogDescription>

					<button onClick={() => setConfirmOpen(false)} type='button'>
						Discard
					</button>
				</DialogContent>
			</Dialog>
		</>
	);
}

describe.each(['modal', 'docked'] as const)(
	'a confirm dialog opened over a %s panel',
	(variant) => {
		it('is reachable and sits above the panel', async () => {
			const user = userEvent.setup();

			render(<Harness variant={variant} />);
			await user.click(screen.getByRole('button', { name: 'Ask' }));

			const discard = await screen.findByRole('button', { name: 'Discard' });
			const dialog = discard.closest('[data-slot="dialog-content"]');

			expect(discard.closest('[inert]')).toBeNull();
			expect(discard.closest('[aria-hidden="true"]')).toBeNull();
			expect(dialog?.className).toContain('z-[91]');

			await user.click(discard);
			expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
			// The panel is still there afterwards.
			expect(screen.getByRole('button', { name: 'Ask' })).toBeInTheDocument();
		});
	}
);
