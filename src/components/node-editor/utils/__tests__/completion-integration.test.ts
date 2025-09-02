/**
 * Integration tests for the universal completion system
 * Tests to verify completions are properly triggered and returned
 */

import { universalCompletionSource } from '../universal-completion-source';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';

describe('Universal Completion System Integration', () => {
  // Mock completion context helper
  const createMockContext = (text: string, pos: number): CompletionContext => {
    const state = EditorState.create({ doc: text });
    return {
      state,
      pos,
      explicit: false,
      tokenBefore: (types) => null,
      matchBefore: (types) => null,
      aborted: false
    };
  };

  describe('Date Pattern Completions (@)', () => {
    test('should return completions for @to', () => {
      const context = createMockContext('@to', 3);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options).toBeDefined();
      expect(result?.options?.length).toBeGreaterThan(0);
      
      // Should include common date options
      const labels = result?.options?.map(opt => opt.label.toLowerCase()) || [];
      expect(labels.some(label => label.includes('today'))).toBe(true);
      expect(labels.some(label => label.includes('tomorrow'))).toBe(true);
    });

    test('should return completions for @mon', () => {
      const context = createMockContext('@mon', 4);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
      
      const labels = result?.options?.map(opt => opt.label.toLowerCase()) || [];
      expect(labels.some(label => label.includes('monday'))).toBe(true);
    });

    test('should return completions for @ (empty query)', () => {
      const context = createMockContext('@', 1);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
    });
  });

  describe('Priority Pattern Completions (#)', () => {
    test('should return completions for #h', () => {
      const context = createMockContext('#h', 2);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
      
      const labels = result?.options?.map(opt => opt.label.toLowerCase()) || [];
      expect(labels.some(label => label.includes('high'))).toBe(true);
    });

    test('should return completions for # (empty query)', () => {
      const context = createMockContext('#', 1);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
    });
  });

  describe('Color Pattern Completions (color:)', () => {
    test('should return completions for color:#', () => {
      const context = createMockContext('color:#', 7);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
    });

    test('should return completions for color:re', () => {
      const context = createMockContext('color:re', 8);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      const labels = result?.options?.map(opt => opt.label.toLowerCase()) || [];
      expect(labels.some(label => label.includes('red'))).toBe(true);
    });
  });

  describe('Tag Pattern Completions ([)', () => {
    test('should return completions for [me', () => {
      const context = createMockContext('[me', 3);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
      
      const labels = result?.options?.map(opt => opt.label.toLowerCase()) || [];
      expect(labels.some(label => label.includes('meeting'))).toBe(true);
    });
  });

  describe('Assignee Pattern Completions (+)', () => {
    test('should return completions for +te', () => {
      const context = createMockContext('+te', 3);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.options?.length).toBeGreaterThan(0);
      
      const labels = result?.options?.map(opt => opt.label.toLowerCase()) || [];
      expect(labels.some(label => label.includes('team'))).toBe(true);
    });
  });

  describe('No Pattern Match', () => {
    test('should return null for non-pattern text', () => {
      const context = createMockContext('regular text', 12);
      const result = universalCompletionSource(context);
      
      expect(result).toBeNull();
    });

    test('should return null for completed patterns', () => {
      const context = createMockContext('@today completed', 15);
      const result = universalCompletionSource(context);
      
      expect(result).toBeNull();
    });
  });

  describe('Context Detection', () => {
    test('should detect patterns at word boundaries', () => {
      const context = createMockContext('text @to', 8);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      expect(result?.from).toBe(5); // Start of '@to'
      expect(result?.to).toBe(8);   // End of '@to'
    });

    test('should work with mixed content', () => {
      const context = createMockContext('data, #high, @to', 16);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      // Should detect the @to pattern at the end
    });
  });

  describe('Completion Formatting', () => {
    test('should format date completions correctly', () => {
      const context = createMockContext('@to', 3);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      const todayOption = result?.options?.find(opt => opt.apply === 'today');
      expect(todayOption).toBeDefined();
      expect(todayOption?.label).toBe('Today');
      expect(todayOption?.type).toBe('keyword');
    });

    test('should format color completions correctly', () => {
      const context = createMockContext('color:re', 8);
      const result = universalCompletionSource(context);
      
      expect(result).not.toBeNull();
      const redOption = result?.options?.find(opt => opt.apply?.includes('red') || opt.label.toLowerCase().includes('red'));
      expect(redOption).toBeDefined();
    });
  });
});