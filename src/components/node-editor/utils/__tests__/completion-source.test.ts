/**
 * Comprehensive Jest tests for completion-source.ts
 * Tests pattern detection, completion generation, caching, and error handling
 */

import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete'
import { EditorState, Text } from '@codemirror/state'
import { 
  dateCompletionSource, 
  clearCompletionCache, 
  getCompletionCacheSize 
} from '../completion-source'
import { CompletionItem } from '../completion-data'

// Mock the completion-data module
jest.mock('../completion-data', () => ({
  dateCompletions: [
    { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
    { value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' },
    { value: 'yesterday', label: 'Yesterday', description: 'Previous day', category: 'Quick' },
    { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' },
    { value: 'tuesday', label: 'Tuesday', description: 'Next Tuesday', category: 'Weekdays' },
    { value: 'wednesday', label: 'Wednesday', description: 'Next Wednesday', category: 'Weekdays' },
    { value: 'thursday', label: 'Thursday', description: 'Next Thursday', category: 'Weekdays' },
    { value: 'friday', label: 'Friday', description: 'Next Friday', category: 'Weekdays' },
    { value: 'saturday', label: 'Saturday', description: 'Next Saturday', category: 'Weekdays' },
    { value: 'sunday', label: 'Sunday', description: 'Next Sunday', category: 'Weekdays' },
    { value: 'week', label: 'Next Week', description: 'One week from now', category: 'Relative' },
    { value: 'month', label: 'Next Month', description: 'One month from now', category: 'Relative' },
  ],
  fuzzySearch: jest.fn(),
}))

// Get the mocked fuzzySearch function
const { fuzzySearch } = jest.requireMock('../completion-data')

describe('dateCompletionSource', () => {
  let mockDocument: Text
  let mockEditorState: EditorState
  let mockContext: CompletionContext

  // Helper function to create mock CompletionContext
  const createMockContext = (text: string, position: number): CompletionContext => {
    mockDocument = Text.of([text])
    mockEditorState = EditorState.create({ doc: mockDocument })
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext
  }

  // Helper function to create expected completion
  const createExpectedCompletion = (item: CompletionItem, boost: number = 1): Completion => ({
    label: item.label,
    detail: item.description,
    type: 'keyword' as const,
    apply: item.value,
    boost,
    section: item.category ? {
      name: item.category,
      rank: getCategoryRank(item.category)
    } : undefined
  })

  // Helper function to get category rank (replicate internal logic)
  const getCategoryRank = (category: string): number => {
    const ranks: Record<string, number> = {
      'Quick': 1,
      'Weekdays': 2,
      'Relative': 3
    }
    return ranks[category] || 4
  }

  beforeEach(() => {
    // Clear cache before each test
    clearCompletionCache()
    
    // Reset mock function
    fuzzySearch.mockClear()
    
    // Mock console.warn to avoid noise in test output
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.warn
    jest.restoreAllMocks()
  })

  describe('Pattern Detection', () => {
    it('should detect @date pattern with partial query', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
        { value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' }
      ])

      // 'Meeting @todo' at position 12 gives us query 'tod' (not 'todo')
      const context = createMockContext('Meeting @todo', 12)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('tod', expect.any(Array), 10)
      expect(result?.from).toBe(9) // pos - query.length = 12 - 3 = 9
      expect(result?.to).toBe(12)
    })

    it('should detect @date pattern without query', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ])

      const context = createMockContext('Meeting @', 9)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10)
      expect(result?.from).toBe(9) // pos - query.length = 9 - 0 = 9
      expect(result?.to).toBe(9)
    })

    it('should not detect pattern without @ symbol', () => {
      const context = createMockContext('Meeting today', 13)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
      expect(fuzzySearch).not.toHaveBeenCalled()
    })

    it('should not detect pattern with space after @', () => {
      const context = createMockContext('Meeting @ today', 10)
      const result = dateCompletionSource(context)

      expect(result).toBeNull() // Space breaks the pattern
      expect(fuzzySearch).not.toHaveBeenCalled()
    })

    it('should detect pattern with @ at start of text', () => {
      fuzzySearch.mockReturnValue([
        { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' }
      ])

      const context = createMockContext('@mon', 4)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('mon', expect.any(Array), 10)
    })
  })

  describe('Completion Generation', () => {
    it('should return completions for @tod query', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
        { value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @todo', 12)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(result?.options).toHaveLength(2)
      
      const expectedCompletions = [
        createExpectedCompletion(mockResults[0], 2), // boost for prefix match with 'tod'
        createExpectedCompletion(mockResults[1], 1)   // no boost, 'tomorrow' doesn't start with 'tod'
      ]
      
      expect(result?.options).toEqual(expectedCompletions)
    })

    it('should return completions for @mon query', () => {
      const mockResults: CompletionItem[] = [
        { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' },
        { value: 'month', label: 'Next Month', description: 'One month from now', category: 'Relative' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Task @mon', 8)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(result?.options).toHaveLength(2)
      expect(result?.options?.[0].label).toBe('Monday')
      expect(result?.options?.[1].label).toBe('Next Month')
    })

    it('should return null for @xyz query with no matches', () => {
      fuzzySearch.mockReturnValue([])

      const context = createMockContext('Meeting @xyz', 12)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('xyz', expect.any(Array), 10)
    })

    it('should set correct boost values for prefix matches', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
        { value: 'month', label: 'Next Month', description: 'One month from now', category: 'Relative' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @to', 10)
      const result = dateCompletionSource(context)

      expect(result?.options?.[0].boost).toBe(2) // 'today' starts with 'to'
      expect(result?.options?.[1].boost).toBe(1) // 'month' doesn't start with 'to'
    })

    it('should include section information for categorized items', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @todo', 12)
      const result = dateCompletionSource(context)

      expect(result?.options?.[0].section).toEqual({
        name: 'Quick',
        rank: 1
      })
    })

    it('should handle items without categories', () => {
      const mockResults: CompletionItem[] = [
        { value: 'custom', label: 'Custom Date', description: 'Custom date value' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @custom', 15)
      const result = dateCompletionSource(context)

      expect(result?.options?.[0].section).toBeUndefined()
    })

    it('should set validFor regex pattern', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @todo', 12)
      const result = dateCompletionSource(context)

      expect(result?.validFor).toEqual(/^@[\w-]*$/)
      expect(result?.filter).toBe(false)
    })
  })

  describe('Caching Logic', () => {
    it('should cache completion results', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @todo', 12)
      
      // First call
      dateCompletionSource(context)
      expect(fuzzySearch).toHaveBeenCalledTimes(1)
      expect(getCompletionCacheSize()).toBe(1)

      // Second call with same query should use cache
      fuzzySearch.mockClear()
      const result = dateCompletionSource(context)
      
      expect(fuzzySearch).not.toHaveBeenCalled()
      expect(result).not.toBeNull()
      expect(result?.options).toHaveLength(1)
    })

    it('should update cache result positions for different contexts', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      // First context
      const context1 = createMockContext('Meeting @todo', 12)
      const result1 = dateCompletionSource(context1)
      
      // Second context with same query but different position  
      const context2 = createMockContext('Task @todo here', 10)
      const result2 = dateCompletionSource(context2)

      expect(result1?.from).toBe(9)  // pos - query.length = 12 - 3 = 9
      expect(result1?.to).toBe(12)
      expect(result2?.from).toBe(6)  // pos - query.length = 10 - 4 = 6 (query is 'todo')
      expect(result2?.to).toBe(10)
    })

    it('should handle cache size limit', () => {
      // Fill cache beyond limit (50 entries)
      for (let i = 0; i < 52; i++) {
        fuzzySearch.mockReturnValue([
          { value: `test${i}`, label: `Test ${i}`, description: `Test ${i}`, category: 'Quick' }
        ])
        const context = createMockContext(`Meeting @test${i}`, 13 + i.toString().length)
        dateCompletionSource(context)
      }

      // Cache should be limited to 50 entries
      expect(getCompletionCacheSize()).toBe(50)
    })

    it('should evict oldest entry when cache limit is reached', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      
      // Add first entry
      fuzzySearch.mockReturnValue([mockResults[0]])
      const context1 = createMockContext('Meeting @first', 14)
      dateCompletionSource(context1)

      // Fill cache to limit
      for (let i = 1; i < 50; i++) {
        fuzzySearch.mockReturnValue([
          { value: `test${i}`, label: `Test ${i}`, description: `Test ${i}`, category: 'Quick' }
        ])
        const context = createMockContext(`Meeting @test${i}`, 13 + i.toString().length)
        dateCompletionSource(context)
      }

      expect(getCompletionCacheSize()).toBe(50)

      // Add one more entry to trigger eviction
      fuzzySearch.mockReturnValue([
        { value: 'last', label: 'Last', description: 'Last entry', category: 'Quick' }
      ])
      const contextLast = createMockContext('Meeting @last', 13)
      dateCompletionSource(contextLast)

      // Cache should still be 50, and first entry should be evicted
      expect(getCompletionCacheSize()).toBe(50)

      // First entry should no longer be cached (will call fuzzySearch again)
      fuzzySearch.mockClear()
      fuzzySearch.mockReturnValue([mockResults[0]])
      dateCompletionSource(context1)
      expect(fuzzySearch).toHaveBeenCalledTimes(1)
    })

    it('should clear cache correctly', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @todo', 12)
      dateCompletionSource(context)
      
      expect(getCompletionCacheSize()).toBe(1)
      
      clearCompletionCache()
      
      expect(getCompletionCacheSize()).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed CompletionContext gracefully', () => {
      const malformedContext = {
        pos: 10,
        state: null,
        explicit: false,
      } as unknown as CompletionContext

      const result = dateCompletionSource(malformedContext)

      expect(result).toBeNull()
      expect(console.warn).toHaveBeenCalledWith('Date completion error:', expect.any(Error))
      expect(fuzzySearch).not.toHaveBeenCalled()
    })

    it('should handle invalid document position', () => {
      const context = createMockContext('Meeting', 100) // Position beyond text length
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
    })

    it('should handle fuzzySearch throwing an error', () => {
      fuzzySearch.mockImplementation(() => {
        throw new Error('Fuzzy search failed')
      })

      const context = createMockContext('Meeting @todo', 12)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
      expect(console.warn).toHaveBeenCalledWith('Date completion error:', expect.any(Error))
    })

    it('should handle empty fuzzy search results', () => {
      fuzzySearch.mockReturnValue([])

      const context = createMockContext('Meeting @nonexistent', 18)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
    })

    it('should handle undefined fuzzy search results', () => {
      fuzzySearch.mockReturnValue(undefined)

      const context = createMockContext('Meeting @todo', 12)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty input text', () => {
      const context = createMockContext('', 0)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
    })

    it('should handle @ at end of text', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ])

      const context = createMockContext('Meeting @', 9)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10)
    })

    it('should handle multiple @ symbols in text', () => {
      fuzzySearch.mockReturnValue([])

      const context = createMockContext('Email @user and meet @todo', 26)
      const result = dateCompletionSource(context)

      // Should detect the pattern but return null because no matches
      expect(result).toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('todo', expect.any(Array), 10)
    })

    it('should handle @ followed by space', () => {
      const context = createMockContext('Meeting @ today', 10)
      const result = dateCompletionSource(context)

      expect(result).toBeNull() // Space breaks the pattern
    })

    it('should handle @ followed by special characters', () => {
      // The pattern allows any non-@ non-space characters, so this should work
      fuzzySearch.mockReturnValue([])

      const context = createMockContext('Meeting @#special', 17)
      const result = dateCompletionSource(context)

      expect(result).toBeNull() // No matches found, but pattern is detected
      expect(fuzzySearch).toHaveBeenCalledWith('#special', expect.any(Array), 10)
    })

    it('should handle very long queries', () => {
      const longQuery = 'a'.repeat(100)
      fuzzySearch.mockReturnValue([])

      const context = createMockContext(`Meeting @${longQuery}`, 109)
      const result = dateCompletionSource(context)

      expect(result).toBeNull()
      // Query should be 100 chars (full longQuery) at position 109
      const expectedQuery = longQuery
      expect(fuzzySearch).toHaveBeenCalledWith(expectedQuery, expect.any(Array), 10)
    })

    it('should handle newlines in text', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ])

      const context = createMockContext('Line 1\nMeeting @todo', 19)
      const result = dateCompletionSource(context)

      expect(result).not.toBeNull()
      expect(fuzzySearch).toHaveBeenCalledWith('tod', expect.any(Array), 10)
    })
  })

  describe('Performance Tests', () => {
    it('should handle repeated calls efficiently with cache', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]
      fuzzySearch.mockReturnValue(mockResults)

      const context = createMockContext('Meeting @todo', 12)
      
      // First call
      dateCompletionSource(context)

      // Subsequent calls should use cache
      for (let i = 0; i < 10; i++) {
        dateCompletionSource(context)
      }

      expect(fuzzySearch).toHaveBeenCalledTimes(1) // Only called once due to caching
    })

    it('should handle memory management with large cache', () => {
      // Create many unique cache entries
      for (let i = 0; i < 100; i++) {
        fuzzySearch.mockReturnValue([
          { value: `test${i}`, label: `Test ${i}`, description: `Test ${i}`, category: 'Quick' }
        ])
        const context = createMockContext(`Meeting @test${i}`, 13 + i.toString().length)
        dateCompletionSource(context)
      }

      // Cache should be limited to 50 entries
      expect(getCompletionCacheSize()).toBe(50)
    })
  })
})

// Test helper function accessibility
describe('getCategoryRank helper', () => {
  let mockDocument: Text
  let mockEditorState: EditorState
  
  // Helper function to create mock CompletionContext (redefined for this scope)
  const createMockContext = (text: string, position: number): CompletionContext => {
    mockDocument = Text.of([text])
    mockEditorState = EditorState.create({ doc: mockDocument })
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext
  }

  beforeEach(() => {
    // Clear cache and reset mocks
    clearCompletionCache()
    fuzzySearch.mockClear()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
  
  it('should return correct ranks for known categories', () => {
    // Test the category ranking logic indirectly through completion results
    const mockResults: CompletionItem[] = [
      { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
      { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' },
      { value: 'week', label: 'Next Week', description: 'One week from now', category: 'Relative' },
      { value: 'custom', label: 'Custom', description: 'Custom value', category: 'Unknown' }
    ]
    
    fuzzySearch.mockReturnValue(mockResults)

    const context = createMockContext('Meeting @', 9)
    const result = dateCompletionSource(context)

    expect(result?.options?.[0].section?.rank).toBe(1) // Quick
    expect(result?.options?.[1].section?.rank).toBe(2) // Weekdays
    expect(result?.options?.[2].section?.rank).toBe(3) // Relative
    expect(result?.options?.[3].section?.rank).toBe(4) // Unknown
  })
})