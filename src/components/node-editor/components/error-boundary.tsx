/**
 * Error Boundary for Node Editor
 * Provides graceful error handling and recovery for the node editor component
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
	retryCount: number;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	maxRetries?: number;
}

export class NodeEditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	private retryTimeoutId: NodeJS.Timeout | null = null;

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: 0
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('NodeEditor Error Boundary caught an error:', error);
		console.error('Error Info:', errorInfo);

		this.setState({
			error,
			errorInfo
		});

		// Call optional error handler
		this.props.onError?.(error, errorInfo);

		// Auto-retry after 3 seconds if under retry limit
		const maxRetries = this.props.maxRetries ?? 2;

		if (this.state.retryCount < maxRetries) {
			this.retryTimeoutId = setTimeout(() => {
				this.handleRetry();
			}, 3000);
		}
	}

	componentWillUnmount() {
		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
		}
	}

	handleRetry = () => {
		this.setState(prevState => ({
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: prevState.retryCount + 1
		}));
	};

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: 0
		});
	};

	render() {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			const { error, retryCount } = this.state;
			const maxRetries = this.props.maxRetries ?? 2;
			const canRetry = retryCount < maxRetries;

			return (
				<div className="flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-lg min-h-[200px]">
					<AlertTriangle className="w-12 h-12 text-red-500 mb-4" />

					<h3 className="text-lg font-semibold text-red-800 mb-2">
						Node Editor Error
					</h3>

					<p className="text-red-600 text-center mb-4 max-w-md">
						Something went wrong while rendering the node editor. 
						{canRetry && retryCount === 0 && ' Automatically retrying...'}

						{canRetry && retryCount > 0 && ` (Retry ${retryCount}/${maxRetries})`}
					</p>
					
					{error && (
						<details className="mb-4 max-w-md">
							<summary className="text-sm text-red-700 cursor-pointer hover:text-red-800">
								Error Details
							</summary>

							<div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 font-mono break-all">
								{error.message}
							</div>
						</details>
					)}

					<div className="flex gap-2">
						<button
							onClick={this.handleReset}
							className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
						>
							<RefreshCw className="w-4 h-4 mr-2" />
							Reset Editor
						</button>
						
						{canRetry && (
							<button
								onClick={this.handleRetry}
								className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
							>
								Try Again
							</button>
						)}
					</div>

					<p className="text-xs text-gray-500 mt-4">
						If this problem persists, please refresh the page.
					</p>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export const withErrorBoundary = <P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
	const WrappedComponent = (props: P) => (
		<NodeEditorErrorBoundary {...errorBoundaryProps}>
			<Component {...props} />
		</NodeEditorErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
	return WrappedComponent;
};