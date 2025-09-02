/**
 * Minimal Completion Source - @date patterns only
 * Simple implementation to validate CodeMirror 6 integration
 */

import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete"
import { fuzzySearch, dateCompletions, CompletionItem } from "./completion-data"

// Simple cache implementation
interface CacheEntry {
  result: CompletionResult
  textBefore: string
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>()

  get(key: string, currentTextBefore: string): CompletionResult | null {
    const entry = this.cache.get(key)
    if (!entry || entry.textBefore !== currentTextBefore) {
      this.cache.delete(key)
      return null
    }
    return entry.result
  }

  set(key: string, result: CompletionResult, textBefore: string): void {
    // Simple size limit - clear when too large
    if (this.cache.size > 50) {
      this.cache.clear()
    }
    
    this.cache.set(key, {
      result,
      textBefore
    })
  }
}

const cache = new SimpleCache()

// Only handle @date pattern
const DATE_PATTERN = /@([^@\s]*)$/

/**
 * Minimal completion source that only handles @date patterns
 */
export const dateCompletionSource = (context: CompletionContext): CompletionResult | null => {
  try {
    const { pos, state } = context
    const line = state.doc.lineAt(pos)
    const textBefore = line.text.slice(0, pos - line.from)
    
    // Check cache first
    const cacheKey = `${textBefore}-${pos}`
    const cachedResult = cache.get(cacheKey, textBefore)
    if (cachedResult) {
      return cachedResult
    }
    
    // Look for @date pattern
    const match = textBefore.match(DATE_PATTERN)
    if (!match || match[1] === undefined) {
      return null
    }
    
    const query = match[1] || ''
    const matchStart = pos - query.length
    
    // Get filtered date completions
    const filteredItems = fuzzySearch(query, dateCompletions, 10)
    
    if (filteredItems.length === 0) {
      return null
    }
    
    // Create CodeMirror completions
    const completions: Completion[] = filteredItems.map(item => {
      // Simple boost calculation
      const isQuickDate = ['today', 'tomorrow', 'yesterday'].includes(item.value)
      const startsWithQuery = item.value.toLowerCase().startsWith(query.toLowerCase())
      const boost = isQuickDate && query.length < 3 ? 3 : (startsWithQuery ? 2 : 1)
      
      return {
        label: item.label,
        detail: item.description,
        type: 'date',
        apply: item.value,
        boost,
        section: {
          name: item.category || 'Date',
          rank: item.category === 'Quick' ? 1 : 2
        }
      }
    })
    
    const result: CompletionResult = {
      from: matchStart,
      to: pos,
      options: completions,
      // Simple validFor pattern - just match word characters after @
      validFor: /^@\w*$/,
      filter: false // We handle our own filtering
    }
    
    // Cache the result
    cache.set(cacheKey, result, textBefore)
    
    return result
    
  } catch (error) {
    console.error('Date completion error:', error)
    return null
  }
}

/**
 * Export for easy testing and debugging
 */
export const clearCache = (): void => {
  cache.clear()
}