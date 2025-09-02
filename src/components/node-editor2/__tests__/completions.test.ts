/**
 * Consolidated completion functionality tests for node-editor2
 * 
 * Tests all completion functionality including:
 * - Pattern detection and matching
 * - Completion generation for different types (date, priority, color, tag, assignee)
 * - Caching logic and performance
 * - Fuzzy search and filtering
 * - Error handling and edge cases
 * - CodeMirror integration
 */

import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { EditorState, Text } from '@codemirror/state';
import { 
  dateCompletionSource, 
  priorityCompletionSource,
  colorCompletionSource,
  tagCompletionSource,
  assigneeCompletionSource,
  clearCompletionCache, 
  getCompletionCacheSize 
} from '../completions';
import type { CompletionItem } from '../completions';

// Mock completion data
jest.mock('../completions/completion-data', () => ({
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
  priorityCompletions: [
    { value: 'critical', label: 'Critical', description: 'Highest priority', category: 'High' },
    { value: 'high', label: 'High', description: 'High priority', category: 'High' },
    { value: 'medium', label: 'Medium', description: 'Medium priority', category: 'Medium' },
    { value: 'low', label: 'Low', description: 'Low priority', category: 'Low' },
    { value: 'urgent', label: 'Urgent', description: 'Urgent priority', category: 'High' },
    { value: 'asap', label: 'ASAP', description: 'As soon as possible', category: 'High' },
    { value: 'blocked', label: 'Blocked', description: 'Task is blocked', category: 'Status' },
    { value: 'waiting', label: 'Waiting', description: 'Waiting on something', category: 'Status' },
    { value: 'someday', label: 'Someday', description: 'Future consideration', category: 'Low' },
  ],
  colorCompletions: [
    { value: '#ff0000', label: 'Red', description: 'Red color', category: 'Primary' },
    { value: '#00ff00', label: 'Green', description: 'Green color', category: 'Primary' },
    { value: '#0000ff', label: 'Blue', description: 'Blue color', category: 'Primary' },
    { value: '#ffff00', label: 'Yellow', description: 'Yellow color', category: 'Primary' },
    { value: '#ff00ff', label: 'Magenta', description: 'Magenta color', category: 'Primary' },
    { value: '#00ffff', label: 'Cyan', description: 'Cyan color', category: 'Primary' },
    { value: '#000000', label: 'Black', description: 'Black color', category: 'Neutral' },
    { value: '#ffffff', label: 'White', description: 'White color', category: 'Neutral' },
    { value: '#808080', label: 'Gray', description: 'Gray color', category: 'Neutral' },
  ],
  tagCompletions: [
    { value: 'important', label: 'Important', description: 'Important tag', category: 'Priority' },
    { value: 'urgent', label: 'Urgent', description: 'Urgent tag', category: 'Priority' },
    { value: 'work', label: 'Work', description: 'Work related', category: 'Context' },
    { value: 'personal', label: 'Personal', description: 'Personal task', category: 'Context' },
    { value: 'meeting', label: 'Meeting', description: 'Meeting related', category: 'Type' },
    { value: 'todo', label: 'Todo', description: 'Todo item', category: 'Type' },
    { value: 'done', label: 'Done', description: 'Completed', category: 'Status' },
  ],
  assigneeCompletions: [
    { value: 'john', label: 'John', description: 'John Doe', category: 'Team' },
    { value: 'jane', label: 'Jane', description: 'Jane Smith', category: 'Team' },
    { value: 'alice', label: 'Alice', description: 'Alice Johnson', category: 'Team' },
    { value: 'bob', label: 'Bob', description: 'Bob Wilson', category: 'Team' },
    { value: 'frontend', label: 'Frontend', description: 'Frontend team', category: 'Teams' },
    { value: 'backend', label: 'Backend', description: 'Backend team', category: 'Teams' },
    { value: 'design', label: 'Design', description: 'Design team', category: 'Teams' },
  ],
  fuzzySearch: jest.fn(),
}));

// Get the mocked fuzzySearch function
const { fuzzySearch } = jest.requireMock('../completions/completion-data');

describe('Date Completion Source', () => {
  let mockDocument: Text;
  let mockEditorState: EditorState;
  let mockContext: CompletionContext;

  // Helper function to create mock CompletionContext
  const createMockContext = (text: string, position: number): CompletionContext => {
    mockDocument = Text.of([text]);
    mockEditorState = EditorState.create({ doc: mockDocument });
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext;
  };

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
  });

  // Helper function to get category rank (replicate internal logic)
  const getCategoryRank = (category: string): number => {
    const ranks: Record<string, number> = {
      'Quick': 1,
      'Weekdays': 2,
      'Relative': 3
    };
    return ranks[category] || 4;
  };

  beforeEach(() => {
    // Clear cache before each test
    clearCompletionCache();
    
    // Reset mock function
    fuzzySearch.mockClear();
    
    // Mock console.warn to avoid noise in test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.warn
    jest.restoreAllMocks();
  });

  describe('Pattern Detection', () => {
    it('should detect @date pattern with partial query', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
        { value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' }
      ]);

      // 'Meeting @todo' at position 12 gives us query 'tod' (not 'todo')
      const context = createMockContext('Meeting @todo', 12);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('tod', expect.any(Array), 10);
      expect(result?.from).toBe(9); // pos - query.length = 12 - 3 = 9
      expect(result?.to).toBe(12);
    });

    it('should detect @date pattern without query', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]);

      const context = createMockContext('Meeting @', 9);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10);
      expect(result?.from).toBe(9); // pos - query.length = 9 - 0 = 9
      expect(result?.to).toBe(9);
    });

    it('should not detect pattern without @ symbol', () => {
      const context = createMockContext('Meeting today', 13);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should not detect pattern with space after @', () => {
      const context = createMockContext('Meeting @ today', 10);
      const result = dateCompletionSource(context);

      expect(result).toBeNull(); // Space breaks the pattern
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should detect pattern with @ at start of text', () => {
      fuzzySearch.mockReturnValue([
        { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' }
      ]);

      const context = createMockContext('@mon', 4);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('mon', expect.any(Array), 10);
    });
  });

  describe('Completion Generation', () => {
    it('should return completions for @tod query', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
        { value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @todo', 12);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(2);
      
      const expectedCompletions = [
        createExpectedCompletion(mockResults[0], 2), // boost for prefix match with 'tod'
        createExpectedCompletion(mockResults[1], 1)   // no boost, 'tomorrow' doesn't start with 'tod'
      ];
      
      expect(result?.options).toEqual(expectedCompletions);
    });

    it('should return completions for @mon query', () => {
      const mockResults: CompletionItem[] = [
        { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' },
        { value: 'month', label: 'Next Month', description: 'One month from now', category: 'Relative' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Task @mon', 8);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(2);
      expect(result?.options?.[0].label).toBe('Monday');
      expect(result?.options?.[1].label).toBe('Next Month');
    });

    it('should return null for @xyz query with no matches', () => {
      fuzzySearch.mockReturnValue([]);

      const context = createMockContext('Meeting @xyz', 12);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('xyz', expect.any(Array), 10);
    });

    it('should set correct boost values for prefix matches', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
        { value: 'month', label: 'Next Month', description: 'One month from now', category: 'Relative' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @to', 10);
      const result = dateCompletionSource(context);

      expect(result?.options?.[0].boost).toBe(2); // 'today' starts with 'to'
      expect(result?.options?.[1].boost).toBe(1); // 'month' doesn't start with 'to'
    });

    it('should include section information for categorized items', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @todo', 12);
      const result = dateCompletionSource(context);

      expect(result?.options?.[0].section).toEqual({
        name: 'Quick',
        rank: 1
      });
    });

    it('should handle items without categories', () => {
      const mockResults: CompletionItem[] = [
        { value: 'custom', label: 'Custom Date', description: 'Custom date value' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @custom', 15);
      const result = dateCompletionSource(context);

      expect(result?.options?.[0].section).toBeUndefined();
    });

    it('should set validFor regex pattern', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @todo', 12);
      const result = dateCompletionSource(context);

      expect(result?.validFor).toEqual(/^@[\w-]*$/);
      expect(result?.filter).toBe(false);
    });
  });

  describe('Caching Logic', () => {
    it('should cache completion results', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @todo', 12);
      
      // First call
      dateCompletionSource(context);
      expect(fuzzySearch).toHaveBeenCalledTimes(1);
      expect(getCompletionCacheSize()).toBe(1);

      // Second call with same query should use cache
      fuzzySearch.mockClear();
      const result = dateCompletionSource(context);
      
      expect(fuzzySearch).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(1);
    });

    it('should update cache result positions for different contexts', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      // First context
      const context1 = createMockContext('Meeting @todo', 12);
      const result1 = dateCompletionSource(context1);
      
      // Second context with same query but different position  
      const context2 = createMockContext('Task @todo here', 10);
      const result2 = dateCompletionSource(context2);

      expect(result1?.from).toBe(9);  // pos - query.length = 12 - 3 = 9
      expect(result1?.to).toBe(12);
      expect(result2?.from).toBe(6);  // pos - query.length = 10 - 4 = 6 (query is 'todo')
      expect(result2?.to).toBe(10);
    });

    it('should handle cache size limit', () => {
      // Fill cache beyond limit (50 entries)
      for (let i = 0; i < 52; i++) {
        fuzzySearch.mockReturnValue([
          { value: `test${i}`, label: `Test ${i}`, description: `Test ${i}`, category: 'Quick' }
        ]);
        const context = createMockContext(`Meeting @test${i}`, 13 + i.toString().length);
        dateCompletionSource(context);
      }

      // Cache should be limited to 50 entries
      expect(getCompletionCacheSize()).toBe(50);
    });

    it('should clear cache correctly', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @todo', 12);
      dateCompletionSource(context);
      
      expect(getCompletionCacheSize()).toBe(1);
      
      clearCompletionCache();
      
      expect(getCompletionCacheSize()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed CompletionContext gracefully', () => {
      const malformedContext = {
        pos: 10,
        state: null,
        explicit: false,
      } as unknown as CompletionContext;

      const result = dateCompletionSource(malformedContext);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('Date completion error:', expect.any(Error));
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should handle invalid document position', () => {
      const context = createMockContext('Meeting', 100); // Position beyond text length
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
    });

    it('should handle fuzzySearch throwing an error', () => {
      fuzzySearch.mockImplementation(() => {
        throw new Error('Fuzzy search failed');
      });

      const context = createMockContext('Meeting @todo', 12);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('Date completion error:', expect.any(Error));
    });

    it('should handle empty fuzzy search results', () => {
      fuzzySearch.mockReturnValue([]);

      const context = createMockContext('Meeting @nonexistent', 18);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
    });

    it('should handle undefined fuzzy search results', () => {
      fuzzySearch.mockReturnValue(undefined);

      const context = createMockContext('Meeting @todo', 12);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input text', () => {
      const context = createMockContext('', 0);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
    });

    it('should handle @ at end of text', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]);

      const context = createMockContext('Meeting @', 9);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10);
    });

    it('should handle multiple @ symbols in text', () => {
      fuzzySearch.mockReturnValue([]);

      const context = createMockContext('Email @user and meet @todo', 26);
      const result = dateCompletionSource(context);

      // Should detect the pattern but return null because no matches
      expect(result).toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('todo', expect.any(Array), 10);
    });

    it('should handle @ followed by space', () => {
      const context = createMockContext('Meeting @ today', 10);
      const result = dateCompletionSource(context);

      expect(result).toBeNull(); // Space breaks the pattern
    });

    it('should handle @ followed by special characters', () => {
      // The pattern allows any non-@ non-space characters, so this should work
      fuzzySearch.mockReturnValue([]);

      const context = createMockContext('Meeting @#special', 17);
      const result = dateCompletionSource(context);

      expect(result).toBeNull(); // No matches found, but pattern is detected
      expect(fuzzySearch).toHaveBeenCalledWith('#special', expect.any(Array), 10);
    });

    it('should handle very long queries', () => {
      const longQuery = 'a'.repeat(100);
      fuzzySearch.mockReturnValue([]);

      const context = createMockContext(`Meeting @${longQuery}`, 109);
      const result = dateCompletionSource(context);

      expect(result).toBeNull();
      // Query should be 100 chars (full longQuery) at position 109
      const expectedQuery = longQuery;
      expect(fuzzySearch).toHaveBeenCalledWith(expectedQuery, expect.any(Array), 10);
    });

    it('should handle newlines in text', () => {
      fuzzySearch.mockReturnValue([
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ]);

      const context = createMockContext('Line 1\nMeeting @todo', 19);
      const result = dateCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('tod', expect.any(Array), 10);
    });
  });

  describe('Performance Tests', () => {
    it('should handle repeated calls efficiently with cache', () => {
      const mockResults: CompletionItem[] = [
        { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Meeting @todo', 12);
      
      // First call
      dateCompletionSource(context);

      // Subsequent calls should use cache
      for (let i = 0; i < 10; i++) {
        dateCompletionSource(context);
      }

      expect(fuzzySearch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should handle memory management with large cache', () => {
      // Create many unique cache entries
      for (let i = 0; i < 100; i++) {
        fuzzySearch.mockReturnValue([
          { value: `test${i}`, label: `Test ${i}`, description: `Test ${i}`, category: 'Quick' }
        ]);
        const context = createMockContext(`Meeting @test${i}`, 13 + i.toString().length);
        dateCompletionSource(context);
      }

      // Cache should be limited to 50 entries
      expect(getCompletionCacheSize()).toBe(50);
    });
  });
});

describe('Priority Completion Source', () => {
  const createMockContext = (text: string, position: number): CompletionContext => {
    const mockDocument = Text.of([text]);
    const mockEditorState = EditorState.create({ doc: mockDocument });
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext;
  };

  beforeEach(() => {
    clearCompletionCache();
    fuzzySearch.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Priority Pattern Detection', () => {
    it('should detect #priority pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: 'high', label: 'High', description: 'High priority', category: 'High' }
      ]);

      const context = createMockContext('Task #hi', 7);
      const result = priorityCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('hi', expect.any(Array), 10);
    });

    it('should not detect pattern without # symbol', () => {
      const context = createMockContext('Task high', 9);
      const result = priorityCompletionSource(context);

      expect(result).toBeNull();
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should handle partial priority queries', () => {
      fuzzySearch.mockReturnValue([
        { value: 'high', label: 'High', description: 'High priority', category: 'High' },
        { value: 'medium', label: 'Medium', description: 'Medium priority', category: 'Medium' }
      ]);

      const context = createMockContext('Task #', 6);
      const result = priorityCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10);
    });
  });

  describe('Priority Completions', () => {
    it('should return priority completions', () => {
      const mockResults = [
        { value: 'high', label: 'High', description: 'High priority', category: 'High' },
        { value: 'medium', label: 'Medium', description: 'Medium priority', category: 'Medium' },
        { value: 'low', label: 'Low', description: 'Low priority', category: 'Low' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Task #h', 7);
      const result = priorityCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(3);
      expect(result?.options?.[0].label).toBe('High');
    });

    it('should handle specific priorities like #asap', () => {
      fuzzySearch.mockReturnValue([
        { value: 'asap', label: 'ASAP', description: 'As soon as possible', category: 'High' }
      ]);

      const context = createMockContext('Task #asap', 9);
      const result = priorityCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options?.[0].label).toBe('ASAP');
    });

    it('should set validFor regex pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: 'high', label: 'High', description: 'High priority', category: 'High' }
      ]);

      const context = createMockContext('Task #hi', 7);
      const result = priorityCompletionSource(context);

      expect(result?.validFor).toEqual(/^#[\w-]*$/);
      expect(result?.filter).toBe(false);
    });
  });
});

describe('Color Completion Source', () => {
  const createMockContext = (text: string, position: number): CompletionContext => {
    const mockDocument = Text.of([text]);
    const mockEditorState = EditorState.create({ doc: mockDocument });
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext;
  };

  beforeEach(() => {
    clearCompletionCache();
    fuzzySearch.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Color Pattern Detection', () => {
    it('should detect color: pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: '#ff0000', label: 'Red', description: 'Red color', category: 'Primary' }
      ]);

      const context = createMockContext('Task color:#ff', 13);
      const result = colorCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('#ff', expect.any(Array), 10);
    });

    it('should not detect pattern without color: prefix', () => {
      const context = createMockContext('Task red', 8);
      const result = colorCompletionSource(context);

      expect(result).toBeNull();
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should handle color: without value', () => {
      fuzzySearch.mockReturnValue([
        { value: '#ff0000', label: 'Red', description: 'Red color', category: 'Primary' }
      ]);

      const context = createMockContext('Task color:', 11);
      const result = colorCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10);
    });
  });

  describe('Color Completions', () => {
    it('should return color completions', () => {
      const mockResults = [
        { value: '#ff0000', label: 'Red', description: 'Red color', category: 'Primary' },
        { value: '#00ff00', label: 'Green', description: 'Green color', category: 'Primary' },
        { value: '#0000ff', label: 'Blue', description: 'Blue color', category: 'Primary' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Task color:#', 12);
      const result = colorCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(3);
      expect(result?.options?.[0].label).toBe('Red');
    });

    it('should set validFor regex pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: '#ff0000', label: 'Red', description: 'Red color', category: 'Primary' }
      ]);

      const context = createMockContext('Task color:#ff', 13);
      const result = colorCompletionSource(context);

      expect(result?.validFor).toEqual(/^color:[\w#-]*$/);
      expect(result?.filter).toBe(false);
    });
  });
});

describe('Tag Completion Source', () => {
  const createMockContext = (text: string, position: number): CompletionContext => {
    const mockDocument = Text.of([text]);
    const mockEditorState = EditorState.create({ doc: mockDocument });
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext;
  };

  beforeEach(() => {
    clearCompletionCache();
    fuzzySearch.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tag Pattern Detection', () => {
    it('should detect [tag] pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: 'important', label: 'Important', description: 'Important tag', category: 'Priority' }
      ]);

      const context = createMockContext('Task [imp', 8);
      const result = tagCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('imp', expect.any(Array), 10);
    });

    it('should not detect pattern without [ symbol', () => {
      const context = createMockContext('Task important', 14);
      const result = tagCompletionSource(context);

      expect(result).toBeNull();
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should handle incomplete tag patterns', () => {
      fuzzySearch.mockReturnValue([
        { value: 'work', label: 'Work', description: 'Work related', category: 'Context' }
      ]);

      const context = createMockContext('Task [', 6);
      const result = tagCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10);
    });
  });

  describe('Tag Completions', () => {
    it('should return tag completions', () => {
      const mockResults = [
        { value: 'important', label: 'Important', description: 'Important tag', category: 'Priority' },
        { value: 'work', label: 'Work', description: 'Work related', category: 'Context' },
        { value: 'meeting', label: 'Meeting', description: 'Meeting related', category: 'Type' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Task [', 6);
      const result = tagCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(3);
      expect(result?.options?.[0].label).toBe('Important');
    });

    it('should not confuse with checkbox patterns', () => {
      // Checkbox patterns like [x], [ ], [] should not trigger tag completions
      const checkboxPatterns = ['[x]', '[ ]', '[]'];
      
      checkboxPatterns.forEach(pattern => {
        const context = createMockContext(`Task ${pattern}`, pattern.length + 5);
        const result = tagCompletionSource(context);
        
        // Should not detect as tag completion
        expect(result).toBeNull();
      });
    });

    it('should set validFor regex pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: 'important', label: 'Important', description: 'Important tag', category: 'Priority' }
      ]);

      const context = createMockContext('Task [imp', 8);
      const result = tagCompletionSource(context);

      expect(result?.validFor).toEqual(/^\[[\w\s,-]*$/);
      expect(result?.filter).toBe(false);
    });
  });
});

describe('Assignee Completion Source', () => {
  const createMockContext = (text: string, position: number): CompletionContext => {
    const mockDocument = Text.of([text]);
    const mockEditorState = EditorState.create({ doc: mockDocument });
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext;
  };

  beforeEach(() => {
    clearCompletionCache();
    fuzzySearch.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Assignee Pattern Detection', () => {
    it('should detect +assignee pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: 'john', label: 'John', description: 'John Doe', category: 'Team' }
      ]);

      const context = createMockContext('Task +jo', 7);
      const result = assigneeCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('jo', expect.any(Array), 10);
    });

    it('should not detect pattern without + symbol', () => {
      const context = createMockContext('Task john', 9);
      const result = assigneeCompletionSource(context);

      expect(result).toBeNull();
      expect(fuzzySearch).not.toHaveBeenCalled();
    });

    it('should handle + without username', () => {
      fuzzySearch.mockReturnValue([
        { value: 'alice', label: 'Alice', description: 'Alice Johnson', category: 'Team' }
      ]);

      const context = createMockContext('Task +', 6);
      const result = assigneeCompletionSource(context);

      expect(result).not.toBeNull();
      expect(fuzzySearch).toHaveBeenCalledWith('', expect.any(Array), 10);
    });
  });

  describe('Assignee Completions', () => {
    it('should return assignee completions', () => {
      const mockResults = [
        { value: 'john', label: 'John', description: 'John Doe', category: 'Team' },
        { value: 'jane', label: 'Jane', description: 'Jane Smith', category: 'Team' },
        { value: 'alice', label: 'Alice', description: 'Alice Johnson', category: 'Team' }
      ];
      fuzzySearch.mockReturnValue(mockResults);

      const context = createMockContext('Task +', 6);
      const result = assigneeCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options).toHaveLength(3);
      expect(result?.options?.[0].label).toBe('John');
    });

    it('should handle team assignments', () => {
      fuzzySearch.mockReturnValue([
        { value: 'frontend', label: 'Frontend', description: 'Frontend team', category: 'Teams' }
      ]);

      const context = createMockContext('Task +front', 10);
      const result = assigneeCompletionSource(context);

      expect(result).not.toBeNull();
      expect(result?.options?.[0].label).toBe('Frontend');
    });

    it('should set validFor regex pattern', () => {
      fuzzySearch.mockReturnValue([
        { value: 'john', label: 'John', description: 'John Doe', category: 'Team' }
      ]);

      const context = createMockContext('Task +jo', 7);
      const result = assigneeCompletionSource(context);

      expect(result?.validFor).toEqual(/^\+[\w.-]*$/);
      expect(result?.filter).toBe(false);
    });
  });
});

describe('Fuzzy Search Integration', () => {
  beforeEach(() => {
    fuzzySearch.mockClear();
  });

  it('should call fuzzySearch with correct parameters', () => {
    fuzzySearch.mockReturnValue([]);

    const context = {
      pos: 10,
      state: EditorState.create({ doc: Text.of(['Task @tod']) }),
      explicit: false,
    } as CompletionContext;

    dateCompletionSource(context);

    expect(fuzzySearch).toHaveBeenCalledWith(
      'tod',
      expect.any(Array),
      10
    );
  });

  it('should handle fuzzy search results correctly', () => {
    const mockResults = [
      { value: 'today', label: 'Today', description: 'Current date', category: 'Quick', score: 0.9 },
      { value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick', score: 0.7 }
    ];
    fuzzySearch.mockReturnValue(mockResults);

    const context = {
      pos: 10,
      state: EditorState.create({ doc: Text.of(['Task @tod']) }),
      explicit: false,
    } as CompletionContext;

    const result = dateCompletionSource(context);

    expect(result?.options).toHaveLength(2);
    expect(result?.options?.[0].label).toBe('Today');
    expect(result?.options?.[1].label).toBe('Tomorrow');
  });
});

describe('Multi-Pattern Completion Scenarios', () => {
  const createMockContext = (text: string, position: number): CompletionContext => {
    const mockDocument = Text.of([text]);
    const mockEditorState = EditorState.create({ doc: mockDocument });
    
    return {
      pos: position,
      state: mockEditorState,
      explicit: false,
    } as CompletionContext;
  };

  beforeEach(() => {
    clearCompletionCache();
    fuzzySearch.mockClear();
  });

  it('should handle multiple patterns in same text', () => {
    fuzzySearch.mockReturnValue([
      { value: 'high', label: 'High', description: 'High priority', category: 'High' }
    ]);

    // Text with multiple patterns, cursor on the priority pattern
    const context = createMockContext('Task @today #hi [important] +john', 12);
    const result = priorityCompletionSource(context);

    expect(result).not.toBeNull();
    expect(fuzzySearch).toHaveBeenCalledWith('hi', expect.any(Array), 10);
  });

  it('should not interfere with other patterns', () => {
    // Test that date completion doesn't trigger on priority pattern
    const context = createMockContext('Task @today #high', 17);
    const result = dateCompletionSource(context);

    expect(result).toBeNull();
  });

  it('should handle adjacent patterns', () => {
    fuzzySearch.mockReturnValue([
      { value: 'important', label: 'Important', description: 'Important tag', category: 'Priority' }
    ]);

    // Adjacent patterns without spaces
    const context = createMockContext('Task@today#high[imp', 18);
    const result = tagCompletionSource(context);

    expect(result).not.toBeNull();
    expect(fuzzySearch).toHaveBeenCalledWith('imp', expect.any(Array), 10);
  });
});

describe('Performance and Memory Management', () => {
  beforeEach(() => {
    clearCompletionCache();
    fuzzySearch.mockClear();
  });

  it('should handle large completion lists efficiently', () => {
    // Create a large list of mock completions
    const largeCompletionList = Array.from({length: 1000}, (_, i) => ({
      value: `item${i}`,
      label: `Item ${i}`,
      description: `Description ${i}`,
      category: 'Large'
    }));
    
    fuzzySearch.mockReturnValue(largeCompletionList);

    const context = {
      pos: 10,
      state: EditorState.create({ doc: Text.of(['Task @search']) }),
      explicit: false,
    } as CompletionContext;

    const startTime = performance.now();
    const result = dateCompletionSource(context);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // Should be fast
    expect(result?.options).toHaveLength(1000);
  });

  it('should limit completion results to reasonable size', () => {
    // Even with large input, should limit results
    fuzzySearch.mockReturnValue([
      { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' }
    ]);

    const context = {
      pos: 10,
      state: EditorState.create({ doc: Text.of(['Task @tod']) }),
      explicit: false,
    } as CompletionContext;

    const result = dateCompletionSource(context);
    
    // The fuzzySearch should be called with limit parameter
    expect(fuzzySearch).toHaveBeenCalledWith('tod', expect.any(Array), 10);
  });

  it('should handle memory cleanup on cache eviction', () => {
    // Fill cache to capacity
    for (let i = 0; i < 60; i++) {
      fuzzySearch.mockReturnValue([
        { value: `test${i}`, label: `Test ${i}`, description: `Test ${i}`, category: 'Test' }
      ]);
      
      const context = {
        pos: 10 + i,
        state: EditorState.create({ doc: Text.of([`Task @test${i}`]) }),
        explicit: false,
      } as CompletionContext;
      
      dateCompletionSource(context);
    }

    // Cache should be limited and stable
    expect(getCompletionCacheSize()).toBeLessThanOrEqual(50);
  });
});

describe('Completion Categories and Ranking', () => {
  beforeEach(() => {
    fuzzySearch.mockClear();
  });

  it('should rank categories correctly', () => {
    const mockResults = [
      { value: 'week', label: 'Next Week', description: 'One week from now', category: 'Relative' },
      { value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
      { value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' }
    ];
    fuzzySearch.mockReturnValue(mockResults);

    const context = {
      pos: 8,
      state: EditorState.create({ doc: Text.of(['Task @']) }),
      explicit: false,
    } as CompletionContext;

    const result = dateCompletionSource(context);

    // Should have correct category ranks
    expect(result?.options?.[0].section?.rank).toBe(3); // Relative
    expect(result?.options?.[1].section?.rank).toBe(1); // Quick
    expect(result?.options?.[2].section?.rank).toBe(2); // Weekdays
  });

  it('should handle items without categories', () => {
    const mockResults = [
      { value: 'custom', label: 'Custom', description: 'Custom item' } // No category
    ];
    fuzzySearch.mockReturnValue(mockResults);

    const context = {
      pos: 12,
      state: EditorState.create({ doc: Text.of(['Task @custom']) }),
      explicit: false,
    } as CompletionContext;

    const result = dateCompletionSource(context);

    expect(result?.options?.[0].section).toBeUndefined();
  });
});

describe('Completion Source Integration', () => {
  it('should work with all completion sources', () => {
    const sources = [
      dateCompletionSource,
      priorityCompletionSource,
      colorCompletionSource,
      tagCompletionSource,
      assigneeCompletionSource
    ];

    sources.forEach(source => {
      const context = {
        pos: 5,
        state: EditorState.create({ doc: Text.of(['Test']) }),
        explicit: false,
      } as CompletionContext;

      // Should not crash
      expect(() => source(context)).not.toThrow();
    });
  });

  it('should maintain consistent API across all sources', () => {
    const testCases = [
      { source: dateCompletionSource, text: 'Task @tod', pos: 9 },
      { source: priorityCompletionSource, text: 'Task #hi', pos: 8 },
      { source: colorCompletionSource, text: 'Task color:#ff', pos: 14 },
      { source: tagCompletionSource, text: 'Task [imp', pos: 9 },
      { source: assigneeCompletionSource, text: 'Task +jo', pos: 8 }
    ];

    testCases.forEach(({ source, text, pos }) => {
      fuzzySearch.mockReturnValue([]);

      const context = {
        pos,
        state: EditorState.create({ doc: Text.of([text]) }),
        explicit: false,
      } as CompletionContext;

      const result = source(context);

      // All should return null for empty fuzzy results
      expect(result).toBeNull();
    });
  });
});