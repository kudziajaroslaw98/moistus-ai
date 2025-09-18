/**
 * CodeMirror Reference Node Completions Extension
 *
 * Provides dynamic database search for reference nodes:
 * - Triggers on text content after $reference command
 * - Strips metadata patterns (#priority, !status, ^date, @assignee, [tags])
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
import type { AvailableNodeTypes } from '../../../types/available-node-types';

// Simple debounce implementation to avoid lodash dependency issues
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Strip metadata patterns from search text
 * Removes: #priority, !status, ^date, @assignee, [tags], target:id, map:id, confidence:n
 */
function stripMetadataPatterns(text: string): string {
  return text
    // Remove priority patterns (#high, #medium, #low)
    .replace(/#[^#\s@\[\]+:]+/g, '')
    // Remove status patterns (!active, !done, !pending)
    .replace(/![^!\s@\[\]:]+/g, '')
    // Remove date patterns (^tomorrow, ^2024-01-15)
    .replace(/\^[^\^\s#\[\]+]+/g, '')
    // Remove assignee patterns (@john, @team-lead)
    .replace(/@[^@\s#\[\]:]+/g, '')
    // Remove tag patterns ([important], [meeting, notes])
    .replace(/\[[^\[\]@#+:]+\]/g, '')
    // Remove reference-specific patterns (target:id, map:id, confidence:0.9)
    .replace(/(?:target|map|confidence):[^\s]+/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
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
 * State effect for updating current node type
 */
const nodeTypeUpdateEffect = StateEffect.define<AvailableNodeTypes | null>();

/**
 * State field to track current node type
 */
const currentNodeTypeState = StateField.define<AvailableNodeTypes | null>({
  create(): AvailableNodeTypes | null {
    return null;
  },
  update(value, tr) {
    // Handle node type updates
    for (const effect of tr.effects) {
      if (effect.is(nodeTypeUpdateEffect)) {
        return effect.value;
      }
    }
    return value;
  }
});

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
      console.log('🌐 Making API call for search term:', JSON.stringify(searchTerm));

      // Check cache first
      const cacheKey = searchTerm.toLowerCase().trim();
      const cached = searchCache[cacheKey];

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('💾 Using cached results:', JSON.stringify(cached.results));
        callback(cached.results);
        return;
      }

      // Make API call
      const response = await fetch('/api/nodes/search-across-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm }),
      });

      console.log('📡 API response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('Reference search API error:', response.statusText);
        callback([]);
        return;
      }

      const data = await response.json();
      console.log('📦 Raw API response data:', JSON.stringify(data));

      const results: ReferenceSearchResult[] = data.data || [];
      console.log('🎯 Processed results:', JSON.stringify(results));

      // Verify the format of each result
      results.forEach((result, index) => {
        console.log(`📋 Result ${index}:`, JSON.stringify({
          node_id: result.node_id,
          node_content: result.node_content,
          map_id: result.map_id,
          map_title: result.map_title
        }));
      });

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

  // Check if current node type is referenceNode
  const currentNodeType = state.field(currentNodeTypeState, false);
  console.log('🔍 isInReferenceSearchMode - currentNodeType:', JSON.stringify(currentNodeType));

  if (currentNodeType === 'referenceNode') {
    console.log('✅ Reference search mode: TRUE (currentNodeType is referenceNode)');
    return true;
  }

  // Fallback: Look for $reference followed by content
  const text = state.doc.toString();
  const beforeCursor = text.slice(Math.max(0, pos - 100), pos);
  const referencePattern = /\$reference\s+/;
  const fallbackMatch = referencePattern.test(beforeCursor);

  console.log('🔍 Reference search mode fallback check:', JSON.stringify({
    text,
    beforeCursor,
    fallbackMatch
  }));

  if (fallbackMatch) {
    console.log('✅ Reference search mode: TRUE (fallback $reference pattern)');
  } else {
    console.log('❌ Reference search mode: FALSE');
  }

  return fallbackMatch;
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
  const currentNodeType = state.field(currentNodeTypeState, false);

  // If we're in reference node mode, use the entire text as search term
  if (currentNodeType === 'referenceNode') {
    const cleanText = stripMetadataPatterns(text.trim());

    console.log('📝 extractSearchTerm - reference mode:', JSON.stringify({
      originalText: text,
      cleanText,
      cleanTextLength: cleanText.length
    }));

    if (cleanText.length < 2) {
      console.log('❌ Search term too short (<2 chars)');
      return null;
    }

    console.log('✅ Extracted search term:', JSON.stringify(cleanText));
    return {
      searchTerm: cleanText,
      searchStart: 0
    };
  }

  // Fallback: Look for content after $reference
  const beforeCursor = text.slice(Math.max(0, pos - 200), pos);
  const referenceMatch = beforeCursor.match(/\$reference\s+(.*)$/);

  if (!referenceMatch) {
    return null;
  }

  const rawContent = referenceMatch[1];

  // Strip metadata patterns to get clean search term
  const searchTerm = stripMetadataPatterns(rawContent);

  // Find the start position after $reference and whitespace
  const referenceStart = beforeCursor.lastIndexOf('$reference');
  const contentStart = beforeCursor.indexOf(' ', referenceStart) + 1;
  const searchStart = Math.max(0, pos - beforeCursor.length + contentStart);

  return { searchTerm, searchStart };
}

/**
 * Main reference completion source
 */
export function referenceCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
  console.log('🚀 referenceCompletionSource called');

  return new Promise((resolve) => {
    try {
      // Check if we're in reference search mode
      if (!isInReferenceSearchMode(context)) {
        console.log('❌ Not in reference search mode, resolving null');
        resolve(null);
        return;
      }

      console.log('✅ In reference search mode, extracting search term');

      // Extract search term
      const searchInfo = extractSearchTerm(context);

      if (!searchInfo) {
        console.log('❌ No search info extracted, resolving null');
        resolve(null);
        return;
      }

      const { searchTerm, searchStart } = searchInfo;

      console.log('📊 Search info:', JSON.stringify({ searchTerm, searchStart }));

      // Don't search for very short terms
      if (searchTerm.length < 2) {
        console.log('❌ Search term too short, resolving null');
        resolve(null);
        return;
      }

      // Update state to show we're searching
      const view = context.state.field(referenceCompletionState, false);

      if (view) {
        // TODO: Dispatch search state update
      }

      console.log('🔍 Starting debounced search for:', JSON.stringify(searchTerm));

      // Perform debounced search
      debouncedSearch(searchTerm, (results: ReferenceSearchResult[]) => {
        console.log('🎯 Search results received:', JSON.stringify(results));

        if (results.length === 0) {
          console.log('❌ No results found, resolving null');
          resolve(null);
          return;
        }

        console.log('✅ Converting results to completions:', results.length, 'results');

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

        const completionResult = {
          from: searchStart,
          options: completions,
          filter: false, // We do server-side filtering
          validFor: /^[^@\s]*/
        };

        console.log('🎉 Resolving completion result:', JSON.stringify(completionResult));
        resolve(completionResult);
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
    currentNodeTypeState,
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
  currentNodeTypeState,
  referenceSearchEffect,
  nodeTypeUpdateEffect,
  isInReferenceSearchMode,
  extractSearchTerm,
  searchCache
};