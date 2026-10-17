import { render, screen } from '@testing-library/react';
import { LegalConsentNote } from './legal-consent-note';

describe('LegalConsentNote', () => {
	it('links the Terms and the Privacy Policy, opening in a new tab so a form is not lost', () => {
		render(<LegalConsentNote />);

		const terms = screen.getByRole('link', { name: 'Terms of Service' });
		const privacy = screen.getByRole('link', { name: 'Privacy Policy' });

		expect(terms).toHaveAttribute('href', '/terms');
		expect(privacy).toHaveAttribute('href', '/privacy');
		for (const link of [terms, privacy]) {
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
		}
	});

	it('says "creating an account" on sign-up and "continuing" where sign-in can also create one', () => {
		const { rerender } = render(<LegalConsentNote />);
		expect(screen.getByText(/By creating an account/)).toBeInTheDocument();

		rerender(<LegalConsentNote action='continue' />);
		expect(screen.getByText(/By continuing/)).toBeInTheDocument();
		expect(
			screen.queryByText(/By creating an account/)
		).not.toBeInTheDocument();
	});

	it('only asks people to agree to the Terms; the Privacy Policy is information', () => {
		const { container } = render(<LegalConsentNote />);

		// A privacy notice is not a contract term, so it must not read like consent.
		expect(container).toHaveTextContent(
			'you agree to the Terms of Service. Our Privacy Policy explains how we use your data.'
		);
	});
});
