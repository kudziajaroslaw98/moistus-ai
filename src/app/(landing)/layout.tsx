import ErrorBoundary from '../../components/landing/error-boundary';

export default function LandingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ErrorBoundary>{children}</ErrorBoundary>;
}
