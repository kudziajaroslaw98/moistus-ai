'use client';

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

export type MetricType =
	| 'CLS'
	| 'FCP'
	| 'FID'
	| 'LCP'
	| 'TTFB'
	| 'INP'
	| 'custom';

export interface PerformanceMetric {
	name: string;
	value: number;
	delta?: number;
	id: string;
	rating?: 'good' | 'needs-improvement' | 'poor';
	timestamp: number;
	type: MetricType;
}

export interface CustomMetric {
	name: string;
	value: number;
	metadata?: Record<string, any>;
}

class PerformanceMonitor {
	private metrics: Map<string, PerformanceMetric> = new Map();
	private customMetrics: Map<string, CustomMetric> = new Map();
	private reportCallbacks: Array<(metrics: PerformanceMetric[]) => void> = [];
	private isInitialized = false;

	constructor() {
		if (typeof window !== 'undefined') {
			this.init();
		}
	}

	private init() {
		if (this.isInitialized) return;
		this.isInitialized = true;

		// Track Core Web Vitals
		onCLS((metric) => this.recordWebVital('CLS', metric));
		onFCP((metric) => this.recordWebVital('FCP', metric));
		onLCP((metric) => this.recordWebVital('LCP', metric));
		onTTFB((metric) => this.recordWebVital('TTFB', metric));
		onINP((metric) => this.recordWebVital('INP', metric));

		// Track page load performance
		this.trackPageLoadMetrics();

		// Track user engagement metrics
		this.trackEngagementMetrics();
	}

	private recordWebVital(type: MetricType, metric: any) {
		const performanceMetric: PerformanceMetric = {
			name: metric.name,
			value: metric.value,
			delta: metric.delta,
			id: metric.id,
			rating: metric.rating,
			timestamp: Date.now(),
			type,
		};

		this.metrics.set(type, performanceMetric);

		// Report to analytics
		this.reportToAnalytics(performanceMetric);
	}

	private trackPageLoadMetrics() {
		if (typeof window === 'undefined' || !window.performance) return;

		window.addEventListener('load', () => {
			const navigation = performance.getEntriesByType(
				'navigation'
			)[0] as PerformanceNavigationTiming;

			if (navigation) {
				// DNS lookup time
				const dnsTime =
					navigation.domainLookupEnd - navigation.domainLookupStart;
				this.recordCustomMetric('dns-lookup', dnsTime);

				// TCP connection time
				const tcpTime = navigation.connectEnd - navigation.connectStart;
				this.recordCustomMetric('tcp-connection', tcpTime);

				// Time to first byte
				const ttfb = navigation.responseStart - navigation.requestStart;
				this.recordCustomMetric('server-response', ttfb);

				// DOM processing time
				const domProcessing = navigation.domComplete - navigation.domLoading;
				this.recordCustomMetric('dom-processing', domProcessing);

				// Total page load time
				const loadTime = navigation.loadEventEnd - navigation.navigationStart;
				this.recordCustomMetric('total-load-time', loadTime);
			}
		});
	}

	private trackEngagementMetrics() {
		if (typeof window === 'undefined') return;

		let scrollDepth = 0;
		let maxScrollDepth = 0;
		let timeOnPage = 0;
		const startTime = Date.now();

		// Track scroll depth
		window.addEventListener('scroll', () => {
			const windowHeight = window.innerHeight;
			const documentHeight = document.documentElement.scrollHeight;
			const scrollTop =
				window.pageYOffset || document.documentElement.scrollTop;

			scrollDepth = Math.round(
				((scrollTop + windowHeight) / documentHeight) * 100
			);
			maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);

			this.recordCustomMetric('scroll-depth', maxScrollDepth, {
				currentDepth: scrollDepth,
			});
		});

		// Track time on page
		setInterval(() => {
			timeOnPage = Math.round((Date.now() - startTime) / 1000);
			this.recordCustomMetric('time-on-page', timeOnPage);
		}, 5000); // Update every 5 seconds

		// Track page visibility
		document.addEventListener('visibilitychange', () => {
			const isVisible = document.visibilityState === 'visible';
			this.recordCustomMetric('page-visibility', isVisible ? 1 : 0, {
				visibilityState: document.visibilityState,
			});
		});

		// Track clicks on CTAs
		document.addEventListener('click', (event) => {
			const target = event.target as HTMLElement;

			// Check if clicked element is a CTA
			if (target.matches('a[href*="sign-up"], button[data-cta]')) {
				const ctaName = target.getAttribute('data-cta-name') || 'unknown';
				this.recordCustomMetric('cta-click', 1, {
					ctaName,
					href: target.getAttribute('href'),
					text: target.textContent?.trim(),
				});
			}
		});
	}

	recordCustomMetric(
		name: string,
		value: number,
		metadata?: Record<string, any>
	) {
		const metric: CustomMetric = {
			name,
			value,
			metadata,
		};

		this.customMetrics.set(name, metric);

		const performanceMetric: PerformanceMetric = {
			name,
			value,
			id: `custom-${Date.now()}`,
			timestamp: Date.now(),
			type: 'custom',
		};

		this.reportToAnalytics(performanceMetric);
	}

	private reportToAnalytics(metric: PerformanceMetric) {
		// Report to Google Analytics (if available)
		if (typeof window !== 'undefined' && (window as any).gtag) {
			(window as any).gtag('event', 'performance', {
				metric_name: metric.name,
				metric_value: metric.value,
				metric_id: metric.id,
				metric_rating: metric.rating,
				metric_delta: metric.delta,
			});
		}

		// Report to custom analytics endpoint
		if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
			fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					metric,
					url: window.location.href,
					userAgent: navigator.userAgent,
					timestamp: metric.timestamp,
				}),
			}).catch((error) => {
				console.error('Failed to report metric:', error);
			});
		}

		// Execute callbacks
		this.reportCallbacks.forEach((callback) => {
			callback([metric]);
		});
	}

	// Get all recorded metrics
	getMetrics(): PerformanceMetric[] {
		return Array.from(this.metrics.values());
	}

	// Get specific metric
	getMetric(name: string): PerformanceMetric | undefined {
		return this.metrics.get(name);
	}

	// Get all custom metrics
	getCustomMetrics(): CustomMetric[] {
		return Array.from(this.customMetrics.values());
	}

	// Add callback for metric reporting
	onMetricReport(callback: (metrics: PerformanceMetric[]) => void) {
		this.reportCallbacks.push(callback);
	}

	// Generate performance report
	generateReport(): {
		webVitals: Record<string, any>;
		customMetrics: Record<string, any>;
		summary: {
			rating: 'good' | 'needs-improvement' | 'poor';
			issues: string[];
			recommendations: string[];
		};
	} {
		const webVitals: Record<string, any> = {};
		const customMetrics: Record<string, any> = {};
		const issues: string[] = [];
		const recommendations: string[] = [];

		// Process Web Vitals
		this.metrics.forEach((metric, key) => {
			webVitals[key] = {
				value: metric.value,
				rating: metric.rating,
				timestamp: metric.timestamp,
			};

			// Check for performance issues
			if (metric.rating === 'poor') {
				issues.push(`${key} is performing poorly (${metric.value})`);

				// Add specific recommendations
				switch (key) {
					case 'LCP':
						recommendations.push(
							'Optimize largest contentful paint by lazy loading images and optimizing server response times'
						);
						break;
					case 'FID':
						recommendations.push(
							'Reduce JavaScript execution time and break up long tasks'
						);
						break;
					case 'CLS':
						recommendations.push(
							'Add size attributes to images and videos, avoid inserting content above existing content'
						);
						break;
				}
			}
		});

		// Process custom metrics
		this.customMetrics.forEach((metric, key) => {
			customMetrics[key] = {
				value: metric.value,
				metadata: metric.metadata,
			};

			// Check custom metric thresholds
			if (key === 'total-load-time' && metric.value > 3000) {
				issues.push(`Page load time is too high (${metric.value}ms)`);
				recommendations.push(
					'Consider code splitting, lazy loading, and optimizing assets'
				);
			}

			if (key === 'scroll-depth' && metric.value < 50) {
				issues.push(
					'Low scroll depth indicates users may not be engaging with content'
				);
				recommendations.push(
					'Review above-the-fold content and ensure compelling value proposition'
				);
			}
		});

		// Determine overall rating
		const poorMetrics = Array.from(this.metrics.values()).filter(
			(m) => m.rating === 'poor'
		).length;
		const needsImprovementMetrics = Array.from(this.metrics.values()).filter(
			(m) => m.rating === 'needs-improvement'
		).length;

		let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
		if (poorMetrics > 0) {
			rating = 'poor';
		} else if (needsImprovementMetrics > 2) {
			rating = 'needs-improvement';
		}

		return {
			webVitals,
			customMetrics,
			summary: {
				rating,
				issues,
				recommendations,
			},
		};
	}

	// Clear all metrics
	clear() {
		this.metrics.clear();
		this.customMetrics.clear();
	}
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility function to measure component render time
export function measureComponentPerformance(componentName: string) {
	const startTime = performance.now();

	return () => {
		const endTime = performance.now();
		const renderTime = endTime - startTime;

		performanceMonitor.recordCustomMetric(
			`component-render-${componentName}`,
			renderTime,
			{
				componentName,
				timestamp: Date.now(),
			}
		);
	};
}

// Hook for measuring render performance
export function usePerformanceTracking(componentName: string) {
	if (typeof window !== 'undefined') {
		const measure = measureComponentPerformance(componentName);
		// Call measure after render
		requestAnimationFrame(measure);
	}
}

// Export types and utilities
export type { PerformanceMonitor };
export default performanceMonitor;
