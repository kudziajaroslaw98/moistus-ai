import { CONTACT_EMAIL, LEGAL_OPERATOR } from '@/constants/legal';
import { render, screen, within } from '@testing-library/react';
import PrivacyPolicyPage from './privacy/page';
import SubprocessorsPage from './subprocessors/page';
import TermsOfServicePage from './terms/page';

const pages = [
	['Privacy Policy', PrivacyPolicyPage],
	['Terms of Service', TermsOfServicePage],
	['Subprocessors', SubprocessorsPage],
] as const;

describe.each(pages)('%s page', (_name, Page) => {
	it('gives one contact address that people can write to', () => {
		render(<Page />);

		const links = screen
			.getAllByRole('link', { name: CONTACT_EMAIL })
			.map((link) => link.getAttribute('href'));
		expect(links.length).toBeGreaterThan(0);
		expect(new Set(links)).toEqual(new Set([`mailto:${CONTACT_EMAIL}`]));
	});

	it('has an anchor for every entry in its contents list', () => {
		const { container } = render(<Page />);

		const nav = container.querySelector('nav');
		if (!nav) return; // Subprocessors has no contents list.
		for (const link of within(nav).getAllByRole('link')) {
			const id = link.getAttribute('href')?.slice(1);
			expect(container.querySelector(`#${id}`)).not.toBeNull();
		}
	});
});

describe('Privacy Policy page', () => {
	it('names who is responsible, with an address', () => {
		const { container } = render(<PrivacyPolicyPage />);

		expect(container).toHaveTextContent(LEGAL_OPERATOR.name);
		expect(container).toHaveTextContent(LEGAL_OPERATOR.address);
	});

	it('keeps the anchors other pages link to', () => {
		const { container } = render(<PrivacyPolicyPage />);

		expect(container.querySelector('#cookies')).not.toBeNull();
		expect(container.querySelector('#plugins')).not.toBeNull();
	});

	it('says the database is in the US (the production project is in Ohio)', () => {
		const { container } = render(<PrivacyPolicyPage />);

		expect(container).toHaveTextContent('US (Ohio)');
		expect(container).toHaveTextContent(
			'database and hosting are in the United States'
		);
	});

	it('lists the rights GDPR requires, including restriction and objection', () => {
		render(<PrivacyPolicyPage />);

		expect(
			screen.getByRole('heading', { name: /Restriction/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: /Objection/ })
		).toBeInTheDocument();
	});
});

describe('Terms of Service page', () => {
	it('names who is responsible, with an address', () => {
		const { container } = render(<TermsOfServicePage />);

		expect(container).toHaveTextContent(LEGAL_OPERATOR.name);
		expect(container).toHaveTextContent(LEGAL_OPERATOR.address);
	});

	it('promises the 14-day refund and no longer says refunds are generally refused', () => {
		const { container } = render(<TermsOfServicePage />);

		expect(container).toHaveTextContent('within 14 days of your first payment');
		expect(container).not.toHaveTextContent(/do not provide refunds/i);
	});

	it('has a way to report illegal content', () => {
		render(<TermsOfServicePage />);

		expect(
			screen.getByRole('heading', { name: /Reporting Illegal Content/ })
		).toBeInTheDocument();
	});
});

describe('Subprocessors page', () => {
	it('lists the services that handle live collaboration and email', () => {
		const { container } = render(<SubprocessorsPage />);

		expect(container).toHaveTextContent('PartyKit (Cloudflare)');
		expect(container).toHaveTextContent('Resend');
	});

	it('does not say OpenAI keeps nothing', () => {
		const { container } = render(<SubprocessorsPage />);

		expect(container).not.toHaveTextContent(/not stored by OpenAI/i);
		expect(container).toHaveTextContent('up to 30 days');
	});
});
