'use client';

import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// Update state so the next render will show the fallback UI
		return {
			hasError: true,
			error,
			errorInfo: null,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log error to console in development
		if (process.env.NODE_ENV === 'development') {
			console.error('ErrorBoundary caught an error:', error, errorInfo);
		}

		// Update state with error info
		this.setState({
			error,
			errorInfo,
		});

		// Report to error tracking service
		if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT) {
			fetch(process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					error: {
						message: error.message,
						stack: error.stack,
					},
					errorInfo: {
						componentStack: errorInfo.componentStack,
					},
					metadata: {
						url:
							typeof window !== 'undefined' ? window.location.href : 'unknown',
						timestamp: Date.now(),
						userAgent:
							typeof navigator !== 'undefined'
								? navigator.userAgent
								: 'unknown',
					},
				}),
			}).catch((reportError) => {
				console.error('Failed to report error:', reportError);
			});
		}
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return <>{this.props.fallback}</>;
			}

			// Default fallback UI
			return (
				<div className='min-h-screen bg-zinc-950 flex items-center justify-center px-4'>
					<div className='max-w-md w-full'>
						<div className='bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8'>
							{/* Icon */}
							<div className='flex justify-center mb-6'>
								<div className='w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center'>
									<AlertCircle className='w-8 h-8 text-red-500' />
								</div>
							</div>

							{/* Title */}
							<h1 className='text-2xl font-bold text-zinc-50 text-center mb-4'>
								Oops! Something went wrong
							</h1>

							{/* Description */}
							<p className='text-zinc-400 text-center mb-8'>
								We encountered an unexpected error. Don&apos;t worry, our team
								has been notified and is working on it.
							</p>

							{/* Error details (development only) */}
							{process.env.NODE_ENV === 'development' && this.state.error && (
								<div className='mb-6 p-4 bg-zinc-800/50 rounded-lg'>
									<p className='text-xs font-mono text-red-400 mb-2'>
										{this.state.error.message}
									</p>
									<details className='text-xs text-zinc-500'>
										<summary className='cursor-pointer hover:text-zinc-400'>
											View stack trace
										</summary>
										<pre className='mt-2 overflow-x-auto whitespace-pre-wrap'>
											{this.state.error.stack}
										</pre>
									</details>
								</div>
							)}

							{/* Actions */}
							<div className='flex flex-col sm:flex-row gap-4'>
								<button
									onClick={this.handleReset}
									className='flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all'
								>
									<RefreshCw className='w-4 h-4' />
									Try Again
								</button>

								<Link
									href='/'
									className='flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-all'
								>
									<Home className='w-4 h-4' />
									Go Home
								</Link>
							</div>

							{/* Support link */}
							<div className='mt-8 text-center'>
								<a
									href='/support'
									className='text-sm text-zinc-500 hover:text-zinc-400 transition-colors'
								>
									Need help? Contact support →
								</a>
							</div>
						</div>

						{/* Background decoration */}
						<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -z-10' />
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
