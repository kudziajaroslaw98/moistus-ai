'use client';

import { useEffect } from 'react';
import performanceMonitor from '../../utils/performance-monitoring';

export default function PerformanceTracker() {
  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.onMetricReport((metrics) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance metrics:', metrics);
      }
    });

    // Track landing page specific metrics
    performanceMonitor.recordCustomMetric('landing-page-load', 1, {
      timestamp: Date.now(),
      url: window.location.href,
      referrer: document.referrer,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });

    // Track initial viewport visibility
    const visibilityState = document.visibilityState;
    performanceMonitor.recordCustomMetric('initial-visibility', visibilityState === 'visible' ? 1 : 0, {
      visibilityState,
    });

    // Generate performance report after page settles
    const reportTimeout = setTimeout(() => {
      const report = performanceMonitor.generateReport();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance Report:', report);
        
        // Log warnings for poor performance
        if (report.summary.rating === 'poor') {
          console.warn('⚠️ Performance issues detected:', report.summary.issues);
          console.warn('💡 Recommendations:', report.summary.recommendations);
        }
      }

      // Send report to analytics if configured
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'performance-report',
            report,
            metadata: {
              url: window.location.href,
              timestamp: Date.now(),
              userAgent: navigator.userAgent,
            },
          }),
        }).catch((error) => {
          console.error('Failed to send performance report:', error);
        });
      }
    }, 5000);

    // Cleanup
    return () => {
      clearTimeout(reportTimeout);
    };
  }, []);

  // This component doesn't render anything
  return null;
}