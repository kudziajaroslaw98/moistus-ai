/**
 * Universal completion source for smart text editor
 * Supports all mindmap patterns: @date, #priority, color:hex, [tags], +assignee
 * Context-aware completion switching with enhanced fuzzy search
 */

import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete"
import { 
	PatternType, 
	PatternContext,
	CompletionCacheEntry,
	PATTERN_REGISTRY,
	DEFAULT_COMPLETION_CONFIG
} from "./completion-types"
import { 
	detectPatternContext, 
	getCompletionItemsForPattern,
	fuzzySearchWithPatternScoring 
} from "./completion-data"

// Enhanced cache using the type-safe interface
const completionCache = new Map<string, CompletionCacheEntry>()
const CACHE_SIZE_LIMIT = DEFAULT_COMPLETION_CONFIG.cacheSizeLimit
const CACHE_EXPIRY_MS = DEFAULT_COMPLETION_CONFIG.cacheExpiryMs

/**
 * Universal completion source that handles all mindmap patterns
 * Automatically detects pattern type and provides context-aware completions
 */
export const universalCompletionSource = (context: CompletionContext): CompletionResult | null => {
	try {
		const { pos, state } = context
		const line = state.doc.lineAt(pos)
		const textBefore = line.text.slice(0, pos - line.from)
		
		// Debug logging to see if completion source is called
		if (DEFAULT_COMPLETION_CONFIG.enableDebugLogging || textBefore.includes('@') || textBefore.includes('#')) {
			console.log('Universal completion called:', { textBefore, pos })
		}
		
		// Enhanced pattern detection for multi-pattern context
		// Find the last pattern being typed (cursor position based)
		const patternContext = detectPatternContext(textBefore)
		
		// Also check for pattern triggers even without complete context
		// Enhanced regex to better handle multi-pattern scenarios
		const hasPatternChar = /[@#\+\[]|color:|\[|\+/.test(textBefore)
		
		// For multi-pattern support, we need to check if we're inside a valid pattern
		// even if there are other patterns earlier in the text
		if (!patternContext && !hasPatternChar) {
			return null
		}
		
		// Debug log for multi-pattern scenarios
		if (DEFAULT_COMPLETION_CONFIG.enableDebugLogging && (textBefore.match(/@|#|\+|\[|color:/g) || []).length > 1) {
			console.log('Multi-pattern context detected:', { textBefore, patternContext })
		}
		
		// Enhanced pattern character detection for multi-pattern scenarios
		if (!patternContext && hasPatternChar) {
			console.log('Pattern character found but no context:', textBefore)
			// Try simple pattern matching as fallback with better multi-pattern support
			
			// Check for bare pattern triggers at end of text
			if (textBefore.endsWith('@')) {
				console.log('Bare @ detected, showing date completions')
				return createBasicCompletionResult(pos, 'date', 1)
			}
			if (textBefore.endsWith('#')) {
				console.log('Bare # detected, showing priority completions')
				return createBasicCompletionResult(pos, 'priority', 1)
			}
			if (textBefore.endsWith('+')) {
				console.log('Bare + detected, showing assignee completions')
				return createBasicCompletionResult(pos, 'assignee', 1)
			}
			if (textBefore.endsWith('[')) {
				console.log('Bare [ detected, showing tag completions')
				return createBasicCompletionResult(pos, 'tag', 1)
			}
			if (textBefore.endsWith('color:')) {
				console.log('color: detected, showing color completions')
				return createBasicCompletionResult(pos, 'color', 6) // 'color:' is 6 chars
			}
			
			return null
		}
		
		if (!patternContext) {
			return null
		}
		
		const { type: patternType, query, matchStart } = patternContext
		
		// Check cache first with pattern type and expiry
		const cacheKey = `${patternType}:${query}`
		const cached = completionCache.get(cacheKey)
		if (cached && Date.now() < cached.expiresAt) {
			// Validate cache is still relevant to current position and pattern
			if (cached.patternType === patternType && 
				cached.result.from <= matchStart && 
				matchStart <= (cached.result.to || matchStart)) {
				return {
					...cached.result,
					from: matchStart,
					to: pos
				}
			}
		}
		
		// Get pattern-specific completion items with enhanced context
		const completionItems = getCompletionItemsForPattern(patternType, patternContext)
		if (completionItems.length === 0) {
			return null
		}
		
		// Use enhanced fuzzy search with pattern-specific scoring and context
		const filteredItems = fuzzySearchWithPatternScoring(query, completionItems, patternType, 15, patternContext)
		
		if (filteredItems.length === 0) {
			return null
		}
		
		// Convert to CodeMirror completion format with enhanced metadata
		const completions: Completion[] = filteredItems.map(item => ({
			label: item.label,
			detail: item.description,
			type: getCompletionType(patternType),
			apply: formatCompletionValue(item.value, patternType),
			boost: calculateBoost(item.value, query, patternType),
			section: item.category ? {
				name: item.category,
				rank: getCategoryRank(item.category, patternType)
			} : undefined
		}))
		
		const result: CompletionResult = {
			from: matchStart,
			to: pos,
			options: completions,
			validFor: PATTERN_REGISTRY[patternType].validationPattern,
			filter: false // We handle our own filtering with fuzzy search
		}
		
		// Cache the result with pattern type and expiry
		if (completionCache.size >= CACHE_SIZE_LIMIT) {
			// More sophisticated cache eviction - remove expired entries first
			const now = Date.now()
			const expiredKeys = Array.from(completionCache.entries())
				.filter(([_, entry]) => now >= entry.expiresAt)
				.map(([key, _]) => key)
			
			if (expiredKeys.length > 0) {
				expiredKeys.forEach(key => completionCache.delete(key))
			} else {
				// If no expired entries, remove oldest entry
				const firstKey = completionCache.keys().next().value
				if (firstKey) {
					completionCache.delete(firstKey)
				}
			}
		}
		
		const now = Date.now()
		completionCache.set(cacheKey, {
			result,
			patternType,
			timestamp: now,
			query,
			expiresAt: now + CACHE_EXPIRY_MS
		})
		
		return result
		
	} catch (error) {
		// Enhanced error handling with pattern context
		console.warn('Universal completion error:', error)
		return null
	}
}

/**
 * Helper function to create basic completion results for pattern triggers
 * Used when we detect bare pattern characters like @, #, +, [, color:
 */
const createBasicCompletionResult = (pos: number, patternType: PatternType, triggerLength: number): CompletionResult => {
	const completionItems = getCompletionItemsForPattern(patternType, undefined)
	const limitedItems = completionItems.slice(0, patternType === 'priority' ? 3 : 5)
	
	return {
		from: pos - triggerLength,
		to: pos,
		options: limitedItems.map(item => ({
			label: item.label,
			detail: item.description,
			type: getCompletionType(patternType),
			apply: item.value,
			boost: 1
		})),
		filter: false
	}
}

/**
 * Get appropriate CodeMirror completion type based on pattern
 */
const getCompletionType = (patternType: PatternType): string => {
	switch (patternType) {
		case 'date':
			return 'keyword'
		case 'priority':
			return 'variable'
		case 'color':
			return 'property'
		case 'tag':
			return 'type'
		case 'assignee':
			return 'function'
		default:
			return 'text'
	}
}

/**
 * Format completion value based on pattern requirements
 */
const formatCompletionValue = (value: string, patternType: PatternType): string => {
	switch (patternType) {
		case 'date':
			// Keep date values as-is
			return value
		case 'priority':
			// Keep priority values as-is
			return value
		case 'color':
			// Ensure color values start with # if they're hex codes
			return value.startsWith('#') ? value : value
		case 'tag':
			// Add closing bracket for tags if not present
			return value.endsWith(']') ? value.slice(0, -1) : value
		case 'assignee':
			// Keep assignee values as-is
			return value
		default:
			return value
	}
}

/**
 * Calculate boost score based on query relevance and pattern type
 */
const calculateBoost = (value: string, query: string, patternType: PatternType): number => {
	const lowerValue = value.toLowerCase()
	const lowerQuery = query.toLowerCase()
	
	let boost = 1
	
	// Base relevance boost
	if (lowerValue.startsWith(lowerQuery)) {
		boost += 3
	} else if (lowerValue.includes(lowerQuery)) {
		boost += 1
	}
	
	// Pattern-specific boosts
	switch (patternType) {
		case 'date':
			if (['today', 'tomorrow'].includes(lowerValue)) boost += 2
			break
		case 'priority':
			if (['high', 'medium', 'low'].includes(lowerValue)) boost += 2
			break
		case 'color':
			if (value.startsWith('#')) boost += 1
			break
		case 'assignee':
			if (['me', 'team'].includes(lowerValue)) boost += 2
			break
	}
	
	return boost
}

/**
 * Get category display rank based on pattern type and category
 */
const getCategoryRank = (category: string, patternType: PatternType): number => {
	const baseRanks: Record<string, number> = {
		// Common category rankings across all patterns
		'Quick': 1,
		'Basic': 2,
		'Common': 3,
		'Advanced': 4,
	}
	
	// Pattern-specific category rankings
	const patternRanks: Record<PatternType, Record<string, number>> = {
		date: {
			'Quick': 1,      // today, tomorrow
			'Weekdays': 2,   // monday, tuesday, etc.
			'Relative': 3,   // next week, next month
			'Months': 4,     // january, february, etc.
			'Periods': 5     // weekend, quarter, etc.
		},
		priority: {
			'Priority': 1,   // critical, high, medium, low
			'Status': 2,     // urgent, blocked, waiting
		},
		color: {
			'Brand': 1,      // brand colors
			'Basic': 2,      // common colors
			'Grays': 3,      // gray variations
		},
		tag: {
			'Status': 1,     // todo, done, urgent
			'Work': 2,       // meeting, project, task
			'Content': 3,    // idea, note, question
			'Personal': 4,   // personal, health, family
			'Development': 5, // learning, skill, course
			'Tech': 6,       // bug, feature, testing
		},
		assignee: {
			'Special': 1,    // me, team, unassigned
			'Roles': 2,      // manager, developer, designer
			'Teams': 3,      // frontend, backend, devops
			'Team': 4,       // individual names
		}
	}
	
	// Use pattern-specific ranking if available, otherwise use base ranking
	const patternSpecificRanks = patternRanks[patternType]
	if (patternSpecificRanks && patternSpecificRanks[category] !== undefined) {
		return patternSpecificRanks[category]
	}
	
	return baseRanks[category] || 10 // Default to low priority if no ranking found
}

/**
 * Create detailed completion info for documentation/help
 */
const createCompletionInfo = (item: any, patternType: PatternType): string => {
	let info = `${item.label}`
	
	if (item.description) {
		info += `\n${item.description}`
	}
	
	// Add pattern-specific usage examples
	switch (patternType) {
		case 'date':
			info += `\n\nUsage: @${item.value}`
			break
		case 'priority':
			info += `\n\nUsage: #${item.value}`
			break
		case 'color':
			info += `\n\nUsage: color:${item.value}`
			break
		case 'tag':
			info += `\n\nUsage: [${item.value}]`
			break
		case 'assignee':
			info += `\n\nUsage: +${item.value}`
			break
	}
	
	if (item.category) {
		info += `\n\nCategory: ${item.category}`
	}
	
	return info
}

// Utility functions for cache management and debugging
export const clearUniversalCompletionCache = (): void => {
	completionCache.clear()
}

export const getUniversalCompletionCacheSize = (): number => {
	return completionCache.size
}

export const getUniversalCompletionCacheStats = () => {
	const now = Date.now()
	const patternTypeBreakdown: Record<string, number> = {}
	let oldestEntry = now
	let newestEntry = 0
	let expiredEntries = 0
	let totalAge = 0
	
	Array.from(completionCache.entries()).forEach(([key, entry]) => {
		// Count by pattern type
		patternTypeBreakdown[entry.patternType] = (patternTypeBreakdown[entry.patternType] || 0) + 1
		
		// Track age statistics
		if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp
		if (entry.timestamp > newestEntry) newestEntry = entry.timestamp
		
		// Count expired entries
		if (now >= entry.expiresAt) expiredEntries++
		
		// Calculate total age for average
		totalAge += (now - entry.timestamp)
	})
	
	return {
		size: completionCache.size,
		patternTypeBreakdown: patternTypeBreakdown as Record<PatternType, number>,
		hitRate: 0, // Would need to track hits/misses separately
		missRate: 0, // Would need to track hits/misses separately
		oldestEntryAge: oldestEntry === now ? 0 : now - oldestEntry,
		newestEntryAge: newestEntry === 0 ? 0 : now - newestEntry,
		averageEntryAge: completionCache.size > 0 ? Math.round(totalAge / completionCache.size) : 0,
		expiredEntries,
	}
}