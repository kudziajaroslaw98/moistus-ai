import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Configuration for content filtering
interface ContentFilterConfig {
	maxLength: number;
	allowedTags: string[];
	blockedPatterns: RegExp[];
	sensitiveDataPatterns: RegExp[];
	profanityList: string[];
}

// Default content filter configuration
const DEFAULT_FILTER_CONFIG: ContentFilterConfig = {
	maxLength: 2000,
	allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre'],
	blockedPatterns: [
		// Potential prompt injection patterns
		/ignore\s+(previous|all)\s+(instructions|prompts|rules)/gi,
		/forget\s+(everything|all)\s+(above|before)/gi,
		/system\s*:\s*(you\s+are|act\s+as|pretend|role)/gi,
		/\[SYSTEM\]|\[\/SYSTEM\]/gi,
		/human\s*:\s*ignore/gi,
		// Script injection patterns
		/<script[^>]*>.*?<\/script>/gis,
		/javascript\s*:/gi,
		/on\w+\s*=/gi,
		// SQL injection patterns
		/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b).*?\bFROM\b/gi,
		// Path traversal
		/\.\.\/|\.\.\\/gi,
	],
	sensitiveDataPatterns: [
		// Email addresses
		/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		// Phone numbers
		/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
		// Credit card patterns (basic)
		/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
		// Social security numbers (US format)
		/\b\d{3}-\d{2}-\d{4}\b/g,
		// API keys or tokens (basic patterns)
		/\b[A-Za-z0-9]{32,}\b/g,
	],
	profanityList: [
		// Add profanity words here - keeping minimal for example
		'spam', 'scam', 'fraud', 'hack', 'exploit',
	],
};

// Prompt sanitization result
interface SanitizationResult {
	sanitized: string;
	isValid: boolean;
	warnings: string[];
	blocked: boolean;
	reason?: string;
}

// AI response validation result
interface ValidationResult {
	isValid: boolean;
	content: string;
	confidence: number;
	warnings: string[];
	filtered: boolean;
	metadata?: {
		length: number;
		suspiciousPatterns: string[];
		sanitizationApplied: boolean;
	};
}

/**
 * Sanitizes user input/prompts for AI processing
 */
export function sanitizePrompt(
	input: string,
	config: Partial<ContentFilterConfig> = {}
): SanitizationResult {
	const filterConfig = { ...DEFAULT_FILTER_CONFIG, ...config };
	const warnings: string[] = [];
	let sanitized = input;
	let isValid = true;
	let blocked = false;
	let reason: string | undefined;

	// Basic input validation
	if (!input || typeof input !== 'string') {
		return {
			sanitized: '',
			isValid: false,
			warnings: ['Invalid input type'],
			blocked: true,
			reason: 'Input must be a non-empty string',
		};
	}

	// Length validation
	if (input.length > filterConfig.maxLength) {
		sanitized = input.substring(0, filterConfig.maxLength);
		warnings.push(`Input truncated to ${filterConfig.maxLength} characters`);
	}

	// Check for blocked patterns (potential security threats)
	for (const pattern of filterConfig.blockedPatterns) {
		if (pattern.test(sanitized)) {
			blocked = true;
			reason = 'Content contains potentially harmful patterns';
			warnings.push('Blocked due to security concerns');
			break;
		}
	}

	if (blocked) {
		return {
			sanitized: '',
			isValid: false,
			warnings,
			blocked: true,
			reason,
		};
	}

	// Remove or mask sensitive data
	for (const pattern of filterConfig.sensitiveDataPatterns) {
		if (pattern.test(sanitized)) {
			sanitized = sanitized.replace(pattern, '[REDACTED]');
			warnings.push('Sensitive data detected and redacted');
		}
	}

	// Basic profanity filtering
	for (const word of filterConfig.profanityList) {
		const regex = new RegExp(`\\b${word}\\b`, 'gi');

		if (regex.test(sanitized)) {
			sanitized = sanitized.replace(regex, '***');
			warnings.push('Inappropriate content filtered');
		}
	}

	// HTML/XSS sanitization
	try {
		const cleanHtml = DOMPurify.sanitize(sanitized, {
			ALLOWED_TAGS: filterConfig.allowedTags,
			ALLOWED_ATTR: ['href', 'title', 'alt'],
			ALLOW_DATA_ATTR: false,
		});

		if (cleanHtml !== sanitized) {
			sanitized = cleanHtml;
			warnings.push('HTML content sanitized');
		}
	} catch (error) {
		warnings.push('HTML sanitization failed');
		console.error('DOMPurify error:', error);
	}

	// Normalize whitespace
	sanitized = sanitized.replace(/\s+/g, ' ').trim();

	// Final validation
	isValid = sanitized.length > 0 && !blocked;

	return {
		sanitized,
		isValid,
		warnings,
		blocked,
		reason,
	};
}

/**
 * Validates AI response content before sending to user
 */
export function validateAIResponse(
	response: string,
	originalPrompt?: string
): ValidationResult {
	const warnings: string[] = [];
	let filtered = false;
	let content = response;
	let confidence = 1.0;

	// Basic validation
	if (!response || typeof response !== 'string') {
		return {
			isValid: false,
			content: '',
			confidence: 0,
			warnings: ['Invalid response format'],
			filtered: true,
		};
	}

	// Check for suspicious patterns in response
	const suspiciousPatterns: string[] = [];
	const suspiciousChecks = [
		{ pattern: /\bAPI[_\s]?KEY\b/gi, name: 'API_KEY_EXPOSURE' },
		{ pattern: /\bpassword\s*[:=]/gi, name: 'PASSWORD_EXPOSURE' },
		{ pattern: /\btoken\s*[:=]/gi, name: 'TOKEN_EXPOSURE' },
		{ pattern: /<script[^>]*>/gi, name: 'SCRIPT_INJECTION' },
		{ pattern: /javascript\s*:/gi, name: 'JAVASCRIPT_PROTOCOL' },
		{ pattern: /data\s*:\s*text\/html/gi, name: 'DATA_URI_HTML' },
	];

	for (const check of suspiciousChecks) {
		if (check.pattern.test(content)) {
			suspiciousPatterns.push(check.name);
			warnings.push(`Suspicious pattern detected: ${check.name}`);
			confidence *= 0.8; // Reduce confidence for suspicious content
		}
	}

	// Content length validation
	if (content.length > 10000) {
		content = content.substring(0, 10000) + '... [Content truncated]';
		warnings.push('Response truncated due to length');
		filtered = true;
	}

	// Check for potential hallucination indicators
	const hallucinationPatterns = [
		/I don't have access to.*but here's what I think/gi,
		/As an AI.*I cannot.*but I'll try/gi,
		/I'm not sure.*but my guess is/gi,
	];

	for (const pattern of hallucinationPatterns) {
		if (pattern.test(content)) {
			warnings.push('Response may contain hallucinated information');
			confidence *= 0.9;
		}
	}

	// Sanitize HTML in response
	try {
		const sanitizedContent = DOMPurify.sanitize(content, {
			ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
			ALLOWED_ATTR: ['href', 'title', 'alt', 'class'],
			ALLOW_DATA_ATTR: false,
		});

		if (sanitizedContent !== content) {
			content = sanitizedContent;
			warnings.push('HTML content sanitized in response');
			filtered = true;
		}
	} catch (error) {
		warnings.push('Response sanitization failed');
		console.error('Response sanitization error:', error);
	}

	const isValid = content.length > 0 && confidence > 0.3;

	return {
		isValid,
		content,
		confidence,
		warnings,
		filtered,
		metadata: {
			length: content.length,
			suspiciousPatterns,
			sanitizationApplied: filtered,
		},
	};
}

/**
 * Filters inappropriate content from text
 */
export function filterInappropriateContent(
	content: string,
	strictMode: boolean = false
): { filtered: string; blocked: boolean; reasons: string[] } {
	const reasons: string[] = [];
	let filtered = content;
	let blocked = false;

	// Profanity and inappropriate content patterns
	const inappropriatePatterns = [
		{ pattern: /\b(hate|discrimination|harassment)\b/gi, reason: 'Hate speech detected' },
		{ pattern: /\b(violence|harm|threat)\b/gi, reason: 'Violent content detected' },
		{ pattern: /\b(illegal|criminal|fraud)\b/gi, reason: 'Illegal activity mentioned' },
	];

	if (strictMode) {
		inappropriatePatterns.push(
			{ pattern: /\b(controversial|political|religious)\b/gi, reason: 'Controversial content' }
		);
	}

	for (const check of inappropriatePatterns) {
		if (check.pattern.test(filtered)) {
			if (strictMode) {
				blocked = true;
				reasons.push(check.reason);
			} else {
				filtered = filtered.replace(check.pattern, '[FILTERED]');
				reasons.push(`${check.reason} - content filtered`);
			}
		}
	}

	return { filtered, blocked, reasons };
}

/**
 * Zod schemas for API request validation
 */
export const chatRequestSchema = z.object({
	messages: z.array(z.object({
		role: z.enum(['user', 'assistant', 'system']),
		content: z.string().min(1).max(2000),
		timestamp: z.string().datetime().optional(),
	})).min(1).max(50),
	context: z.object({
		mapId: z.string().uuid(),
		selectedNodeIds: z.array(z.string()).max(10),
		userPreferences: z.object({
			responseStyle: z.enum(['concise', 'detailed', 'creative']),
			includeContext: z.boolean(),
		}).optional(),
	}),
});

export const suggestionRequestSchema = z.object({
	nodes: z.array(z.any()).max(100),
	edges: z.array(z.any()).max(200),
	mapId: z.string().uuid(),
	context: z.object({
		trigger: z.enum(['magic-wand', 'dangling-edge', 'auto']),
		sourceNodeId: z.string().optional(),
		targetNodeId: z.string().optional(),
	}),
});

/**
 * Content moderation using external services (placeholder)
 */
export async function moderateContent(content: string): Promise<{
	approved: boolean;
	confidence: number;
	categories: string[];
	reason?: string;
}> {
	// This would integrate with external moderation services like:
	// - OpenAI Moderation API
	// - Google Cloud Natural Language API
	// - Azure Content Moderator
	// - Custom ML models

	// Placeholder implementation
	const inappropriate = filterInappropriateContent(content, true);

	return {
		approved: !inappropriate.blocked,
		confidence: inappropriate.blocked ? 0.9 : 0.1,
		categories: inappropriate.reasons,
		reason: inappropriate.blocked ? inappropriate.reasons.join(', ') : undefined,
	};
}

/**
 * Advanced prompt injection detection
 */
export function detectPromptInjection(prompt: string): {
	detected: boolean;
	confidence: number;
	patterns: string[];
	severity: 'low' | 'medium' | 'high';
} {
	const detectedPatterns: string[] = [];
	let confidence = 0;

	const injectionPatterns = [
		{ pattern: /ignore\s+(all\s+)?(previous|above|earlier)\s+(instructions|prompts|rules|context)/gi, weight: 0.9, name: 'IGNORE_INSTRUCTIONS' },
		{ pattern: /forget\s+(everything|all)\s+(above|before|previous)/gi, weight: 0.9, name: 'FORGET_CONTEXT' },
		{ pattern: /system\s*[:=]\s*(you\s+are|act\s+as|pretend|roleplay)/gi, weight: 0.8, name: 'SYSTEM_OVERRIDE' },
		{ pattern: /new\s+(instructions|task|role)\s*[:=]/gi, weight: 0.7, name: 'NEW_INSTRUCTIONS' },
		{ pattern: /\[(SYSTEM|INST|\/INST)\]/gi, weight: 0.8, name: 'SYSTEM_TAGS' },
		{ pattern: /human\s*[:=].*ignore/gi, weight: 0.6, name: 'HUMAN_IGNORE' },
		{ pattern: /assistant\s*[:=].*?actually/gi, weight: 0.5, name: 'ASSISTANT_OVERRIDE' },
	];

	for (const check of injectionPatterns) {
		const matches = prompt.match(check.pattern);

		if (matches) {
			detectedPatterns.push(check.name);
			confidence = Math.max(confidence, check.weight);
		}
	}

	const detected = detectedPatterns.length > 0;
	const severity = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low';

	return {
		detected,
		confidence,
		patterns: detectedPatterns,
		severity,
	};
}

/**
 * Rate limiting for content validation
 */
const validationCache = new Map<string, { result: any; timestamp: number }>();

export function getCachedValidation<T>(key: string, ttl: number = 300000): T | null {
	const cached = validationCache.get(key);

	if (cached && Date.now() - cached.timestamp < ttl) {
		return cached.result as T;
	}

	validationCache.delete(key);
	return null;
}

export function setCachedValidation<T>(key: string, result: T): void {
	validationCache.set(key, { result, timestamp: Date.now() });

	// Clean up old entries
	if (validationCache.size > 1000) {
		const now = Date.now();

		for (const [k, v] of validationCache.entries()) {
			if (now - v.timestamp > 600000) { // 10 minutes
				validationCache.delete(k);
			}
		}
	}
}

export {
	DEFAULT_FILTER_CONFIG,
	type ContentFilterConfig,
	type SanitizationResult,
	type ValidationResult,
};
