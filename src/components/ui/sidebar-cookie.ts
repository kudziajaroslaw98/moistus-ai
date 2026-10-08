/**
 * The sidebar's open/collapsed cookie. Kept out of `sidebar.tsx` (a client module) so
 * server layouts can read it and render the sidebar in the state the person left it.
 */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
