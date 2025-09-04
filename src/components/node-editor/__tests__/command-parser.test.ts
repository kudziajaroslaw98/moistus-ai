/**
 * Command Parser Tests
 * 
 * Tests the command parsing functionality for:
 * - Node type detection ($nodeType patterns)
 * - Slash command detection (/command patterns)  
 * - Text processing for node type switches
 * - Integration with command registry
 * - Cursor position handling
 * - Edge cases and error handling
 */

import {
  detectNodeTypeSwitch,
  detectSlashCommand,
  processNodeTypeSwitch,
  isValidNodeTypeTrigger,
  isValidSlashCommand,
  getValidNodeTypeTriggers,
  getValidSlashCommands,
  hasCommandTriggers,
  extractAllCommandTriggers,
  debugParseText
} from '../parsers/command-parser';
import { commandRegistry } from '../commands/command-registry';

describe('Node Type Detection', () => {
  describe('Basic Node Type Detection', () => {
    it('should detect node type trigger at cursor position', () => {
      const text = 'This is $task content';
      const cursorPos = 8; // At the 't' in '$task'
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).not.toBeNull();
      expect(result?.trigger).toBe('$task');
      expect(result?.nodeType).toBe('taskNode');
      expect(result?.start).toBe(8);
      expect(result?.end).toBe(13);
      expect(result?.remainingText).toBe('content');
      expect(result?.isValid).toBe(true);
    });

    it('should detect node type trigger when cursor is at start of trigger', () => {
      const text = '$note Some note content';
      const cursorPos = 0;
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).not.toBeNull();
      expect(result?.trigger).toBe('$note');
      expect(result?.nodeType).toBe('defaultNode');
      expect(result?.remainingText).toBe('Some note content');
      expect(result?.isValid).toBe(true);
    });

    it('should detect node type trigger when cursor is at end of trigger', () => {
      const text = '$code console.log("hello")';
      const cursorPos = 5; // Right after '$code'
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).not.toBeNull();
      expect(result?.trigger).toBe('$code');
      expect(result?.nodeType).toBe('codeNode');
      expect(result?.remainingText).toBe('console.log("hello")');
      expect(result?.isValid).toBe(true);
    });

    it('should return null when cursor is not at a node type trigger', () => {
      const text = 'Regular text without triggers';
      const cursorPos = 10;
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).toBeNull();
    });

    it('should return null when cursor is far from trigger', () => {
      const text = '$task content here';
      const cursorPos = 15; // Far from the trigger
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).toBeNull();
    });
  });

  describe('Node Type Validation', () => {
    it('should validate known node types', () => {
      const validTriggers = ['$task', '$note', '$code', '$image', '$link', '$question', '$annotation', '$text'];
      
      validTriggers.forEach(trigger => {
        const text = `${trigger} content`;
        const result = detectNodeTypeSwitch(text, 0);
        
        expect(result).not.toBeNull();
        expect(result?.isValid).toBe(true);
        expect(result?.error).toBeUndefined();
      });
    });

    it('should invalidate unknown node types', () => {
      const text = '$unknown content';
      const result = detectNodeTypeSwitch(text, 0);
      
      expect(result).not.toBeNull();
      expect(result?.isValid).toBe(false);
      expect(result?.error).toContain('Unknown node type');
    });

    it('should validate against command registry', () => {
      const text = '$task content';
      const result = detectNodeTypeSwitch(text, 0);
      
      // Should be valid because $task is registered in the command registry
      expect(result?.isValid).toBe(true);
      
      // Verify command exists in registry
      const command = commandRegistry.getCommand('$task');
      expect(command).toBeDefined();
    });
  });

  describe('Multiple Triggers', () => {
    it('should detect the trigger nearest to cursor position', () => {
      const text = '$note content $task more content';
      const cursorPos = 18; // Near '$task'
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).not.toBeNull();
      expect(result?.trigger).toBe('$task');
      expect(result?.nodeType).toBe('taskNode');
    });

    it('should return null if cursor is between triggers', () => {
      const text = '$note content $task more';
      const cursorPos = 10; // In the middle, away from both triggers
      
      const result = detectNodeTypeSwitch(text, cursorPos);
      
      expect(result).toBeNull();
    });
  });
});

describe('Slash Command Detection', () => {
  describe('Basic Slash Command Detection', () => {
    it('should detect slash command at start of text', () => {
      const text = '/date today';
      const cursorPos = 2; // At 'a' in '/date'
      
      const result = detectSlashCommand(text, cursorPos);
      
      expect(result).not.toBeNull();
      expect(result?.trigger).toBe('/date');
      expect(result?.command).toBe('date');
      expect(result?.start).toBe(0);
      expect(result?.end).toBe(5);
      expect(result?.isValidPosition).toBe(true);
      expect(result?.matches.length).toBeGreaterThan(0);
    });

    it('should detect slash command after whitespace', () => {
      const text = 'Some text /priority high';
      const cursorPos = 12; // At 'r' in '/priority'
      
      const result = detectSlashCommand(text, cursorPos);
      
      expect(result).not.toBeNull();
      expect(result?.trigger).toBe('/priority');
      expect(result?.command).toBe('priority');
      expect(result?.isValidPosition).toBe(true);
    });

    it('should not detect slash command in middle of word', () => {
      const text = 'url https://example.com/path';
      const cursorPos = 25; // At the slash in the URL
      
      const result = detectSlashCommand(text, cursorPos);
      
      // Should either be null or not valid position
      if (result) {
        expect(result.isValidPosition).toBe(false);
      }
    });

    it('should return null when cursor is not at slash command', () => {
      const text = 'Regular text without commands';
      const cursorPos = 10;
      
      const result = detectSlashCommand(text, cursorPos);
      
      expect(result).toBeNull();
    });
  });

  describe('Command Matching', () => {
    it('should find exact matches in registry', () => {
      const text = '/date';
      const result = detectSlashCommand(text, 2);
      
      expect(result).not.toBeNull();
      expect(result?.matches.length).toBeGreaterThan(0);
      
      // Should include exact match
      const exactMatch = result?.matches.find(cmd => cmd.trigger === '/date');
      expect(exactMatch).toBeDefined();
    });

    it('should find partial matches for autocompletion', () => {
      const text = '/da';
      const result = detectSlashCommand(text, 2);
      
      expect(result).not.toBeNull();
      expect(result?.isPartial).toBe(true);
      expect(result?.matches.length).toBeGreaterThan(0);
      
      // Should include commands that start with 'da'
      const hasDateCommand = result?.matches.some(cmd => cmd.trigger.includes('date'));
      expect(hasDateCommand).toBe(true);
    });

    it('should handle empty partial command', () => {
      const text = '/';
      const result = detectSlashCommand(text, 1);
      
      expect(result).not.toBeNull();
      expect(result?.command).toBe('');
      expect(result?.matches.length).toBeGreaterThan(0); // Should return all slash commands
    });
  });

  describe('Position Validation', () => {
    it('should validate position at start of line', () => {
      const text = '/command';
      const result = detectSlashCommand(text, 1);
      
      expect(result?.isValidPosition).toBe(true);
    });

    it('should validate position after whitespace', () => {
      const text = '  /command';
      const result = detectSlashCommand(text, 3);
      
      expect(result?.isValidPosition).toBe(true);
    });

    it('should invalidate position in middle of word', () => {
      const text = 'word/command';
      const result = detectSlashCommand(text, 5);
      
      if (result) {
        expect(result.isValidPosition).toBe(false);
      }
    });
  });
});

describe('Text Processing', () => {
  describe('Node Type Switch Processing', () => {
    it('should process valid node type switch', () => {
      const text = '$task Buy milk and eggs';
      const result = processNodeTypeSwitch(text, 0, 'defaultNode');
      
      expect(result.success).toBe(true);
      expect(result.text).toBe('Buy milk and eggs');
      expect(result.nodeType).toBe('taskNode');
      expect(result.cursorPos).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle trigger at different positions', () => {
      const text = 'Convert to $code console.log("test")';
      const result = processNodeTypeSwitch(text, 11, 'defaultNode');
      
      expect(result.success).toBe(true);
      expect(result.text).toBe('Convert to console.log("test")');
      expect(result.nodeType).toBe('codeNode');
    });

    it('should fail gracefully for invalid triggers', () => {
      const text = '$invalid content';
      const result = processNodeTypeSwitch(text, 0, 'defaultNode');
      
      expect(result.success).toBe(false);
      expect(result.nodeType).toBe('defaultNode'); // Should preserve current type
      expect(result.error).toBeDefined();
    });

    it('should handle no trigger detected', () => {
      const text = 'Regular text';
      const result = processNodeTypeSwitch(text, 5, 'defaultNode');
      
      expect(result.success).toBe(false);
      expect(result.text).toBe('Regular text'); // Should preserve original text
      expect(result.nodeType).toBe('defaultNode');
      expect(result.error).toContain('No node type switch detected');
    });

    it('should handle empty remaining text', () => {
      const text = '$note';
      const result = processNodeTypeSwitch(text, 0, 'defaultNode');
      
      expect(result.success).toBe(true);
      expect(result.text).toBe('');
      expect(result.nodeType).toBe('defaultNode');
      expect(result.cursorPos).toBe(0);
    });
  });

  describe('Cursor Position Handling', () => {
    it('should calculate cursor position correctly after removal', () => {
      const text = 'Start $task middle end';
      const result = processNodeTypeSwitch(text, 6, 'defaultNode');
      
      expect(result.success).toBe(true);
      expect(result.text).toBe('Start middle end');
      expect(result.cursorPos).toBe(6); // Should be at start of "middle"
    });

    it('should handle cursor at start of trigger', () => {
      const text = '$code function() {}';
      const result = processNodeTypeSwitch(text, 0, 'defaultNode');
      
      expect(result.success).toBe(true);
      expect(result.text).toBe('function() {}');
      expect(result.cursorPos).toBe(0); // Should be at start of remaining text
    });
  });
});

describe('Validation Functions', () => {
  describe('Node Type Trigger Validation', () => {
    it('should validate known node type triggers', () => {
      const validTriggers = ['$note', '$task', '$code', '$image', '$link', '$question', '$annotation', '$text'];
      
      validTriggers.forEach(trigger => {
        expect(isValidNodeTypeTrigger(trigger)).toBe(true);
      });
    });

    it('should reject invalid node type triggers', () => {
      const invalidTriggers = ['$invalid', '$unknown', 'task', '$', ''];
      
      invalidTriggers.forEach(trigger => {
        expect(isValidNodeTypeTrigger(trigger)).toBe(false);
      });
    });

    it('should get all valid node type triggers', () => {
      const triggers = getValidNodeTypeTriggers();
      
      expect(triggers).toContain('$note');
      expect(triggers).toContain('$task');
      expect(triggers).toContain('$code');
      expect(triggers.length).toBeGreaterThan(5);
    });
  });

  describe('Slash Command Validation', () => {
    it('should validate registered slash commands', () => {
      const registeredCommands = commandRegistry.getCommandsByTriggerType('slash');
      
      registeredCommands.forEach(cmd => {
        expect(isValidSlashCommand(cmd.trigger)).toBe(true);
      });
    });

    it('should reject invalid slash commands', () => {
      const invalidCommands = ['/invalid', '/unknown', 'date', '/', ''];
      
      invalidCommands.forEach(cmd => {
        expect(isValidSlashCommand(cmd)).toBe(false);
      });
    });

    it('should get all valid slash commands', () => {
      const commands = getValidSlashCommands();
      
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.every(cmd => cmd.startsWith('/'))).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('Command Trigger Detection', () => {
    it('should detect if text has command triggers', () => {
      expect(hasCommandTriggers('$task content')).toBe(true);
      expect(hasCommandTriggers('/date today')).toBe(true);
      expect(hasCommandTriggers('$note and /priority')).toBe(true);
      expect(hasCommandTriggers('regular text')).toBe(false);
    });

    it('should extract all command triggers', () => {
      const text = '$task content /date today $code snippet /priority high';
      const result = extractAllCommandTriggers(text);
      
      expect(result.nodeTypeTriggers).toEqual(['$task', '$code']);
      expect(result.slashCommands).toEqual(['/date', '/priority']);
    });

    it('should handle empty text', () => {
      expect(hasCommandTriggers('')).toBe(false);
      
      const result = extractAllCommandTriggers('');
      expect(result.nodeTypeTriggers).toHaveLength(0);
      expect(result.slashCommands).toHaveLength(0);
    });
  });

  describe('Debug Function', () => {
    it('should provide comprehensive debug information', () => {
      const text = '$task content /date today';
      const cursorPos = 2; // In the '$task' trigger
      
      const debug = debugParseText(text, cursorPos);
      
      expect(debug.text).toBe(text);
      expect(debug.cursorPos).toBe(cursorPos);
      expect(debug.nodeTypeSwitch).not.toBeNull();
      expect(debug.slashCommand).toBeNull(); // Cursor not at slash command
      expect(debug.hasAnyTriggers).toBe(true);
      expect(debug.allTriggers.nodeTypeTriggers).toContain('$task');
      expect(debug.allTriggers.slashCommands).toContain('/date');
    });

    it('should handle text with no triggers', () => {
      const text = 'regular text';
      const debug = debugParseText(text, 5);
      
      expect(debug.nodeTypeSwitch).toBeNull();
      expect(debug.slashCommand).toBeNull();
      expect(debug.hasAnyTriggers).toBe(false);
      expect(debug.allTriggers.nodeTypeTriggers).toHaveLength(0);
      expect(debug.allTriggers.slashCommands).toHaveLength(0);
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  describe('Input Validation', () => {
    it('should handle null and undefined inputs', () => {
      expect(detectNodeTypeSwitch(null as any, 0)).toBeNull();
      expect(detectNodeTypeSwitch(undefined as any, 0)).toBeNull();
      expect(detectSlashCommand(null as any, 0)).toBeNull();
      expect(detectSlashCommand(undefined as any, 0)).toBeNull();
    });

    it('should handle empty string inputs', () => {
      expect(detectNodeTypeSwitch('', 0)).toBeNull();
      expect(detectSlashCommand('', 0)).toBeNull();
    });

    it('should handle negative cursor positions', () => {
      expect(detectNodeTypeSwitch('$task content', -1)).toBeNull();
      expect(detectSlashCommand('/date today', -1)).toBeNull();
    });

    it('should handle cursor positions beyond text length', () => {
      const text = '$task content';
      expect(detectNodeTypeSwitch(text, 100)).toBeNull();
      expect(detectSlashCommand(text, 100)).toBeNull();
    });
  });

  describe('Malformed Patterns', () => {
    it('should handle incomplete node type triggers', () => {
      const incompletePatterns = ['$', '$ ', '$t'];
      
      incompletePatterns.forEach(pattern => {
        const result = detectNodeTypeSwitch(pattern, 0);
        // Should either be null or invalid
        if (result) {
          expect(result.isValid).toBe(false);
        }
      });
    });

    it('should handle incomplete slash commands', () => {
      const text = '/';
      const result = detectSlashCommand(text, 1);
      
      // Should still detect partial command
      expect(result).not.toBeNull();
      expect(result?.command).toBe('');
      expect(result?.isPartial).toBe(true);
    });

    it('should handle special characters in triggers', () => {
      const specialChars = ['$task!', '$task@domain', '/date#tag'];
      
      specialChars.forEach(text => {
        // Should not break, might return null or handle gracefully
        expect(() => {
          detectNodeTypeSwitch(text, 0);
          detectSlashCommand(text, 0);
        }).not.toThrow();
      });
    });
  });

  describe('Unicode and International Support', () => {
    it('should handle Unicode characters', () => {
      const unicodeText = '$task 购买牛奶 /date 今天';
      
      expect(() => {
        detectNodeTypeSwitch(unicodeText, 0);
        detectSlashCommand(unicodeText, 10);
      }).not.toThrow();
    });

    it('should handle emoji in text', () => {
      const emojiText = '$task Buy 🥛 and 🍞 /date 📅';
      
      expect(() => {
        detectNodeTypeSwitch(emojiText, 0);
        detectSlashCommand(emojiText, 20);
      }).not.toThrow();
    });
  });
});

describe('Performance', () => {
  describe('Large Input Handling', () => {
    it('should handle large text efficiently', () => {
      const prefix = 'word '.repeat(10000);
      const suffix = '$task content /date today';
      const largeText = prefix + suffix;
      
      const start = performance.now();
      const nodeResult = detectNodeTypeSwitch(largeText, prefix.length + 1); // At '$task'
      const slashResult = detectSlashCommand(largeText, largeText.indexOf('/date') + 1); // At '/date'
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should be fast
      expect(nodeResult).not.toBeNull();
      expect(slashResult).not.toBeNull();
    });

    it('should handle many triggers efficiently', () => {
      const manyTriggers = Array.from({ length: 100 }, (_, i) => `$task${i} content`).join(' ');
      
      const start = performance.now();
      hasCommandTriggers(manyTriggers);
      extractAllCommandTriggers(manyTriggers);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(500); // Should handle many triggers reasonably fast
    });
  });

  describe('Regex Performance', () => {
    it('should not have catastrophic backtracking', () => {
      // Test with input that could cause regex issues
      const problematicText = '$' + 'a'.repeat(1000) + ' content';
      
      const start = performance.now();
      detectNodeTypeSwitch(problematicText, 500);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should not take too long
    });
  });
});