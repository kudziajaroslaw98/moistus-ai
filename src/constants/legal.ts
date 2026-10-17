/**
 * Who runs Shiko, for the legal pages (privacy policy, terms, subprocessors).
 * EU law requires a name, a postal address and an email for the person behind a
 * service, and Shiko has no company yet, so these are a person's details. Change
 * them here and all three pages follow.
 */
export const LEGAL_OPERATOR = {
	name: 'Jarosław Kudzia',
	address: 'Runowska 5b/3, 73-155 Węgorzyno, Poland',
} as const;

/**
 * The one address for questions, privacy requests, complaints and reports of
 * illegal content. The domain must have an MX record or this bounces.
 */
export const CONTACT_EMAIL = 'support@shiko.app';
