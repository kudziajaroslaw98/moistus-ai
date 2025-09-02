/**
 * Minimal completion source for smart text editor
 * Focuses on @date patterns only for initial validation
 */

import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete"
import { dateCompletions, fuzzySearch } from "./completion-data"

// Simple cache to prevent repeated work
const completionCache = new Map<string, CompletionResult>()
const CACHE_SIZE_LIMIT = 50

/**
 * Minimal completion source that handles only @date patterns
 * This allows us to validate the CodeMirror integration before expanding
 */
export const dateCompletionSource = (context: CompletionContext): CompletionResult | null => {
  try {
    const { pos, state } = context
    const line = state.doc.lineAt(pos)
    const textBefore = line.text.slice(0, pos - line.from)
    
    // Only handle @date patterns for now
    const dateMatch = textBefore.match(/@([^@\s]*)$/)
    if (!dateMatch) {
      return null
    }
    
    const query = dateMatch[1] || ''
    const matchStart = pos - query.length
    
    // Check cache first
    const cacheKey = `date:${query}`
    if (completionCache.has(cacheKey)) {
      const cached = completionCache.get(cacheKey)!
      // Validate cache is still relevant to current position
      if (cached.from <= matchStart && matchStart <= (cached.to || matchStart)) {
        return {
          ...cached,
          from: matchStart,
          to: pos
        }
      }
    }
    
    // Get filtered date completions using existing fuzzy search
    const filteredItems = fuzzySearch(query, dateCompletions, 10)
    
    if (filteredItems.length === 0) {
      return null
    }
    
    // Convert to CodeMirror completion format
    const completions: Completion[] = filteredItems.map(item => ({
      label: item.label,
      detail: item.description,
      type: "keyword",
      apply: item.value,
      boost: item.value.toLowerCase().startsWith(query.toLowerCase()) ? 2 : 1,
      section: item.category ? {
        name: item.category,
        rank: getCategoryRank(item.category)
      } : undefined
    }))
    
    const result: CompletionResult = {
      from: matchStart,
      to: pos,
      options: completions,
      validFor: /^@[\w-]*$/, // Allow continuation of @date pattern
      filter: false // We handle our own filtering with fuzzy search
    }
    
    // Cache the result with size limit
    if (completionCache.size >= CACHE_SIZE_LIMIT) {
      // Simple cache eviction - remove first (oldest) entry
      const firstKey = completionCache.keys().next().value
      if (firstKey) {
        completionCache.delete(firstKey)
      }
    }
    completionCache.set(cacheKey, result)
    
    return result
    
  } catch (error) {
    // Basic error handling - log and return null
    console.warn('Date completion error:', error)
    return null
  }
}

// Helper to rank categories for display order
const getCategoryRank = (category: string): number => {
  const ranks: Record<string, number> = {
    'Quick': 1,      // today, tomorrow
    'Weekdays': 2,   // monday, tuesday, etc.
    'Relative': 3    // next week, next month
  }
  return ranks[category] || 4
}

// Clear cache function for debugging/testing
export const clearCompletionCache = (): void => {
  completionCache.clear()
}

// Get cache size for monitoring
export const getCompletionCacheSize = (): number => {
  return completionCache.size
}