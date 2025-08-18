'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

interface FieldActivityErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class FieldActivityErrorBoundary extends Component<
	FieldActivityErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: FieldActivityErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error(
			'FieldActivityErrorBoundary caught an error:',
			error,
			errorInfo
		);
		this.props.onError?.(error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className='p-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded'>
						<div className='flex items-center gap-2'>
							<div className='w-2 h-2 bg-amber-500 rounded-full' />

							<span>Collaboration temporarily unavailable</span>
						</div>
					</div>
				)
			);
		}

		return this.props.children;
	}
}

// Hook-based fallback for field activity features
export function useFieldActivityWithFallback<T>(
	fieldActivityHook: () => T,
	fallbackValue: T
): T {
	try {
		return fieldActivityHook();
	} catch (error) {
		console.warn('Field activity hook failed, using fallback:', error);
		return fallbackValue;
	}
}
