/**
 * CodeMirror Reference Node Completions Extension
 *
 * Provides dynamic database search for reference nodes:
 * - Triggers on @ after $reference command
 * - Async search across maps and nodes
 * - Debounced API calls for performance
 * - Rich completion display with node/map metadata
 */

import {
  CompletionContext,
  CompletionResult,
  Completion,
  autocompletion,
  CompletionSource,
} from '@codemirror/autocomplete';
import { EditorState, StateEffect, StateField, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
// Simple debounce implementation to avoid lodash dependency issues
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Search result interface from the API
 */
interface ReferenceSearchResult {
  node_id: string;
  node_content: string;
  map_id: string;
  map_title: string;
}

/**
 * Cache for search results to improve performance
 */
interface SearchCache {
  [key: string]: {
    results: ReferenceSearchResult[];
    timestamp: number;
  };
}

/**
 * Search cache with 5-minute TTL
 */
const searchCache: SearchCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Reference completion state tracking
 */
export interface ReferenceCompletionState {
  isSearching: boolean;
  lastSearchTerm: string;
  lastResults: ReferenceSearchResult[];
}

/**
 * State effect for updating reference search state
 */
const referenceSearchEffect = StateEffect.define<Partial<ReferenceCompletionState>>();

/**
 * State field to track reference completion state
 */
const referenceCompletionState = StateField.define<ReferenceCompletionState>({
  create(): ReferenceCompletionState {
    return {
      isSearching: false,
      lastSearchTerm: '',
      lastResults: []
    };
  },
  update(value, tr) {
    let newValue = { ...value };

    // Handle state effects
    for (const effect of tr.effects) {
      if (effect.is(referenceSearchEffect)) {
        newValue = {
          ...newValue,
          ...effect.value
        };
      }
    }

    return newValue;
  }
});

/**
 * Debounced search function to avoid excessive API calls
 */
const debouncedSearch = debounce(
  async (searchTerm: string, callback: (results: ReferenceSearchResult[]) => void) => {
    try {
      // Check cache first
      const cacheKey = searchTerm.toLowerCase().trim();
      const cached = searchCache[cacheKey];

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        callback(cached.results);
        return;
      }

      // Make API call
      const response = await fetch('/api/nodes/search-across-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm }),
      });

      if (!response.ok) {
        console.error('Reference search API error:', response.statusText);
        callback([]);
        return;
      }

      const data = await response.json();
      const results: ReferenceSearchResult[] = data.data || [];

      // Cache the results
      searchCache[cacheKey] = {
        results,
        timestamp: Date.now()
      };

      callback(results);

    } catch (error) {
      console.error('Reference search error:', error);
      callback([]);
    }
  },
  300 // 300ms debounce
);

/**
 * Clean up old cache entries
 */
function cleanupCache() {
  const now = Date.now();
  Object.keys(searchCache).forEach(key => {
    if (now - searchCache[key].timestamp > CACHE_TTL) {
      delete searchCache[key];
    }
  });
}

// Clean up cache every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

/**
 * Check if the current context is in reference search mode
 */
function isInReferenceSearchMode(context: CompletionContext): boolean {
  const { state, pos } = context;
  const text = state.doc.toString();

  // Look for $reference followed by @ and search term
  const beforeCursor = text.slice(Math.max(0, pos - 100), pos);

  // Pattern: $reference (optional whitespace) @ (search term)
  const referencePattern = /\$reference\s*@/;

  return referencePattern.test(beforeCursor);
}

/**
 * Extract the search term from the current context
 */
function extractSearchTerm(context: CompletionContext): {
  searchTerm: string;
  searchStart: number;
} | null {
  const { state, pos } = context;
  const text = state.doc.toString();

  // Look for @ followed by the search term
  const beforeCursor = text.slice(Math.max(0, pos - 100), pos);
  const atMatch = beforeCursor.match(/@([^@\s]*)$/);

  if (!atMatch) {
    return null;
  }

  const searchTerm = atMatch[1];
  const searchStart = pos - searchTerm.length;

  return { searchTerm, searchStart };
}

/**
 * Main reference completion source
 */
export function referenceCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
  return new Promise((resolve) => {
    try {
      // Check if we're in reference search mode
      if (!isInReferenceSearchMode(context)) {
        resolve(null);
        return;
      }

      // Extract search term
      const searchInfo = extractSearchTerm(context);
      if (!searchInfo) {
        resolve(null);
        return;
      }

      const { searchTerm, searchStart } = searchInfo;

      // Don't search for very short terms
      if (searchTerm.length < 2) {
        resolve(null);
        return;
      }

      // Update state to show we're searching
      const view = context.state.field(referenceCompletionState, false);
      if (view) {
        // TODO: Dispatch search state update
      }

      // Perform debounced search
      debouncedSearch(searchTerm, (results: ReferenceSearchResult[]) => {
        if (results.length === 0) {
          resolve(null);
          return;
        }

        // Convert results to completions
        const completions: Completion[] = results.map((result: ReferenceSearchResult, index: number) => ({
          label: truncateText(result.node_content, 50),
          detail: `📁 ${result.map_title}`,
          info: result.node_content,
          type: 'variable',
          boost: 100 - index, // Higher boost for earlier results
          section: {
            name: 'Referenced Nodes',
            rank: 1
          },
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            try {
              // Create reference display text
              const displayText = `[${truncateText(result.node_content, 30)}](ref:${result.node_id})`;

              // Apply the completion
              view.dispatch({
                changes: {
                  from: searchStart,
                  to: to,
                  insert: displayText
                },
                selection: {
                  anchor: searchStart + displayText.length
                }
              });

              // Dispatch custom event for parent components
              const event = new CustomEvent('referenceSelected', {
                detail: {
                  targetNodeId: result.node_id,
                  targetMapId: result.map_id,
                  targetMapTitle: result.map_title,
                  contentSnippet: result.node_content,
                  displayText
                },
                bubbles: true
              });

              view.dom.dispatchEvent(event);

            } catch (error) {
              console.error('Reference completion apply error:', error);
            }
          }
        }));

        resolve({
          from: searchStart,
          options: completions,
          filter: false, // We do server-side filtering
          validFor: /^[^@\s]*/
        });
      });

    } catch (error) {
      console.error('Reference completion source error:', error);
      resolve(null);
    }
  });
}

/**
 * Utility function to truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Create the reference completions extension
 */
export function createReferenceCompletions(): Extension {
  return [
    referenceCompletionState,
    autocompletion({
      override: [referenceCompletionSource],
      maxRenderedOptions: 10, // Limit to prevent overwhelming UI
      defaultKeymap: true,
      closeOnBlur: true,
      activateOnTyping: true,
      activateOnCompletion: () => true,
      interactionDelay: 100, // Slightly longer delay for async operations
      selectOnOpen: false,
      tooltipClass: () => 'reference-completion-tooltip',
      optionClass: (completion) => {
        return 'reference-completion-item';
      }
    })
  ];
}

// Export for testing
export {
  referenceCompletionState,
  referenceSearchEffect,
  isInReferenceSearchMode,
  extractSearchTerm,
  searchCache
};