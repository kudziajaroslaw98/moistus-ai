/**
 * Jest tests for tag completion fix with comma-separated tags
 * Tests the detectPatternContext function for proper handling of comma-separated tag patterns
 */

import { detectPatternContext } from '../completion-data';

describe('Tag Completion Fix - Comma-separated Tags', () => {
  describe('Comma-separated tag scenarios', () => {
    it('should extract current tag from comma-separated tags with spaces', () => {
      const result = detectPatternContext('[todo, urgent, s');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s');
      expect(result?.pattern).toBe('[todo, urgent, s');
      // Match positions should target only the current tag "s"
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "s"
    });

    it('should handle comma-separated tags without spaces', () => {
      const result = detectPatternContext('[todo,urgent,s');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s');
      expect(result?.pattern).toBe('[todo,urgent,s');
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "s"
    });

    it('should show all completions when current tag is empty with trailing comma and space', () => {
      const result = detectPatternContext('[todo, urgent, ');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('');
      expect(result?.pattern).toBe('[todo, urgent, ');
      expect(result?.matchEnd - result?.matchStart).toBe(0); // Length of empty string
    });

    it('should handle extra spaces after comma', () => {
      const result = detectPatternContext('[todo, urgent,  ');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('');
      expect(result?.pattern).toBe('[todo, urgent,  ');
      expect(result?.matchEnd - result?.matchStart).toBe(0); // Length of empty string
    });

    it('should extract partial tag from comma-separated list', () => {
      const result = detectPatternContext('[todo, urgent, imp');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('imp');
      expect(result?.pattern).toBe('[todo, urgent, imp');
      expect(result?.matchEnd - result?.matchStart).toBe(3); // Length of "imp"
    });

    it('should handle longer comma-separated lists', () => {
      const result = detectPatternContext('[work, meeting, project, client, u');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('u');
      expect(result?.pattern).toBe('[work, meeting, project, client, u');
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "u"
    });
  });

  describe('Backwards compatibility - Single tags', () => {
    it('should still work for single tags', () => {
      const result = detectPatternContext('[s');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s');
      expect(result?.pattern).toBe('[s');
      // Match positions should cover the entire pattern for single tags
      expect(result?.matchEnd - result?.matchStart).toBe(2); // Length of "[s"
    });

    it('should still work for single complete tags', () => {
      const result = detectPatternContext('[todo');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('todo');
      expect(result?.pattern).toBe('[todo');
      // Match positions should cover the entire pattern for single tags
      expect(result?.matchEnd - result?.matchStart).toBe(5); // Length of "[todo"
    });

    it('should still work for empty tag pattern', () => {
      const result = detectPatternContext('[');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('');
      expect(result?.pattern).toBe('[');
      // Match positions should cover the entire pattern for empty tags
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "["
    });
  });

  describe('Edge cases', () => {
    it('should handle single comma gracefully', () => {
      const result = detectPatternContext('[,');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('');
      expect(result?.pattern).toBe('[,');
      expect(result?.matchEnd - result?.matchStart).toBe(0); // Length of empty string
    });

    it('should handle leading comma', () => {
      const result = detectPatternContext('[,s');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s');
      expect(result?.pattern).toBe('[,s');
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "s"
    });

    it('should handle trailing comma without space', () => {
      const result = detectPatternContext('[todo,');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('');
      expect(result?.pattern).toBe('[todo,');
      expect(result?.matchEnd - result?.matchStart).toBe(0); // Length of empty string
    });

    it('should handle multiple consecutive commas', () => {
      const result = detectPatternContext('[todo,, urgent');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('urgent');
      expect(result?.pattern).toBe('[todo,, urgent');
      expect(result?.matchEnd - result?.matchStart).toBe(6); // Length of "urgent"
    });

    it('should handle tags with special characters', () => {
      const result = detectPatternContext('[work-item, bug-fix, f');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('f');
      expect(result?.pattern).toBe('[work-item, bug-fix, f');
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "f"
    });

    it('should handle empty spaces in tags', () => {
      const result = detectPatternContext('[  todo  ,  urgent  ,  s  ');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s'); // Should be trimmed
      expect(result?.pattern).toBe('[  todo  ,  urgent  ,  s  ');
      expect(result?.matchEnd - result?.matchStart).toBe(1); // Length of "s"
    });
  });

  describe('Complex scenarios in context', () => {
    it('should work with text before the tag pattern', () => {
      const result = detectPatternContext('This is a task [todo, urgent, s');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s');
      expect(result?.pattern).toBe('[todo, urgent, s');
    });

    it('should work at the beginning of text', () => {
      const result = detectPatternContext('[work, meeting, p');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('p');
      expect(result?.pattern).toBe('[work, meeting, p');
    });

    it('should not interfere with other patterns', () => {
      // Test that other patterns still work normally
      const dateResult = detectPatternContext('@tod');
      expect(dateResult?.type).toBe('date');
      expect(dateResult?.query).toBe('tod');

      const priorityResult = detectPatternContext('#hig');
      expect(priorityResult?.type).toBe('priority');
      expect(priorityResult?.query).toBe('hig');

      const colorResult = detectPatternContext('color:red');
      expect(colorResult?.type).toBe('color');
      expect(colorResult?.query).toBe('red');

      const assigneeResult = detectPatternContext('+joh');
      expect(assigneeResult?.type).toBe('assignee');
      expect(assigneeResult?.query).toBe('joh');
    });
  });

  describe('Match position validation', () => {
    it('should set correct match positions for comma-separated tags', () => {
      const text = 'Task description [todo, urgent, important, s';
      const result = detectPatternContext(text);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('s');
      
      // Verify that the match positions point to just the "s" part
      const matchedText = text.substring(result!.matchStart, result!.matchEnd);
      expect(matchedText).toBe('s');
    });

    it('should set correct match positions for single tag', () => {
      const text = 'Task description [urgent';
      const result = detectPatternContext(text);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('tag');
      expect(result?.query).toBe('urgent');
      
      // Verify that the match positions point to the entire "[urgent" part
      const matchedText = text.substring(result!.matchStart, result!.matchEnd);
      expect(matchedText).toBe('[urgent');
    });
  });
});