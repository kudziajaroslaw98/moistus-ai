/**
 * Request header `proxy.ts` sets to the pathname on `/dashboard` requests. Layouts
 * don't receive the pathname, and the dashboard layout needs it to send signed-out
 * visitors back to the page they asked for after signing in.
 */
export const DASHBOARD_PATH_HEADER = 'x-dashboard-path';
