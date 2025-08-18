import { describe, expect, it } from 'vitest';
import { parseTextInput } from '../parsers';

describe('parseTextInput', () => {
	describe('Font Size Parsing', () => {
		it('should parse font size with px unit', () => {
			const result = parseTextInput('Hello @24px');
			expect(result.content).toBe('Hello');
			expect(result.metadata?.fontSize).toBe('24px');
		});

		it('should parse font size with rem unit', () => {
			const result = parseTextInput('Text @2rem');
			expect(result.content).toBe('Text');
			expect(result.metadata?.fontSize).toBe('2rem');
		});

		it('should parse font size with em unit', () => {
			const result = parseTextInput('Content @1.5em');
			expect(result.content).toBe('Content');
			expect(result.metadata?.fontSize).toBe('1.5em');
		});

		it('should default to px when no unit specified', () => {
			const result = parseTextInput('Large text @32');
			expect(result.content).toBe('Large text');
			expect(result.metadata?.fontSize).toBe('32px');
		});

		it('should handle multiple size patterns and use the last one', () => {
			const result = parseTextInput('@16px Small @24px Medium @32px');
			expect(result.content).toBe('Small Medium');
			expect(result.metadata?.fontSize).toBe('32px');
		});
	});

	describe('Bold Text Parsing', () => {
		it('should parse bold text and set fontWeight', () => {
			const result = parseTextInput('**Bold text**');
			expect(result.content).toBe('Bold text');
			expect(result.metadata?.fontWeight).toBe('bold');
		});

		it('should handle multiple bold sections', () => {
			const result = parseTextInput('**First** and **Second**');
			expect(result.content).toBe('First and Second');
			expect(result.metadata?.fontWeight).toBe('bold');
		});

		it('should handle bold with other formatting', () => {
			const result = parseTextInput('**Bold** @24px');
			expect(result.content).toBe('Bold');
			expect(result.metadata?.fontWeight).toBe('bold');
			expect(result.metadata?.fontSize).toBe('24px');
		});
	});

	describe('Italic Text Parsing', () => {
		it('should parse italic text with asterisks', () => {
			const result = parseTextInput('*Italic text*');
			expect(result.content).toBe('Italic text');
			expect(result.metadata?.fontStyle).toBe('italic');
		});

		it('should parse italic text with underscores', () => {
			const result = parseTextInput('_Italic text_');
			expect(result.content).toBe('Italic text');
			expect(result.metadata?.fontStyle).toBe('italic');
		});

		it('should not confuse bold markers with italic', () => {
			const result = parseTextInput('**Bold** not italic');
			expect(result.content).toBe('Bold not italic');
			expect(result.metadata?.fontWeight).toBe('bold');
			expect(result.metadata?.fontStyle).toBeUndefined();
		});
	});

	describe('Text Alignment Parsing', () => {
		it('should parse left alignment', () => {
			const result = parseTextInput('Text align:left');
			expect(result.content).toBe('Text');
			expect(result.metadata?.textAlign).toBe('left');
		});

		it('should parse center alignment', () => {
			const result = parseTextInput('Centered text align:center');
			expect(result.content).toBe('Centered text');
			expect(result.metadata?.textAlign).toBe('center');
		});

		it('should parse right alignment', () => {
			const result = parseTextInput('Right aligned align:right');
			expect(result.content).toBe('Right aligned');
			expect(result.metadata?.textAlign).toBe('right');
		});

		it('should be case-insensitive', () => {
			const result = parseTextInput('Text align:CENTER');
			expect(result.content).toBe('Text');
			expect(result.metadata?.textAlign).toBe('center');
		});
	});

	describe('Color Parsing', () => {
		it('should parse named colors', () => {
			const result = parseTextInput('Red text color:red');
			expect(result.content).toBe('Red text');
			expect(result.metadata?.textColor).toBe('red');
		});

		it('should parse hex colors', () => {
			const result = parseTextInput('Custom color color:#ff0000');
			expect(result.content).toBe('Custom color');
			expect(result.metadata?.textColor).toBe('#ff0000');
		});

		it('should parse Tailwind color classes', () => {
			const result = parseTextInput('Blue text color:blue-500');
			expect(result.content).toBe('Blue text');
			expect(result.metadata?.textColor).toBe('blue-500');
		});

		it('should handle color with hyphens', () => {
			const result = parseTextInput('Teal text color:teal-400');
			expect(result.content).toBe('Teal text');
			expect(result.metadata?.textColor).toBe('teal-400');
		});
	});

	describe('Combined Patterns', () => {
		it('should handle all patterns together', () => {
			const result = parseTextInput(
				'**Bold** and *italic* @24px align:center color:red'
			);
			expect(result.content).toBe('Bold and italic');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				fontWeight: 'bold',
				fontStyle: 'italic',
				textAlign: 'center',
				textColor: 'red',
			});
		});

		it('should handle patterns in any order', () => {
			const result = parseTextInput(
				'color:blue align:right @32px **Important** message'
			);
			expect(result.content).toBe('Important message');
			expect(result.metadata).toEqual({
				fontSize: '32px',
				fontWeight: 'bold',
				textAlign: 'right',
				textColor: 'blue',
			});
		});

		it('should handle text with no patterns', () => {
			const result = parseTextInput('Plain text without any formatting');
			expect(result.content).toBe('Plain text without any formatting');
			expect(result.metadata).toBeUndefined();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty input', () => {
			const result = parseTextInput('');
			expect(result.content).toBe('');
			expect(result.metadata).toBeUndefined();
		});

		it('should handle only whitespace', () => {
			const result = parseTextInput('   ');
			expect(result.content).toBe('');
			expect(result.metadata).toBeUndefined();
		});

		it('should handle only patterns without content', () => {
			const result = parseTextInput('@24px align:center color:red');
			expect(result.content).toBe('');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				textAlign: 'center',
				textColor: 'red',
			});
		});

		it('should preserve special characters in content', () => {
			const result = parseTextInput('Text with @ and # symbols @24px');
			expect(result.content).toBe('Text with @ and # symbols');
			expect(result.metadata?.fontSize).toBe('24px');
		});

		it('should handle nested bold markers properly', () => {
			const result = parseTextInput('**Bold with ** inside**');
			expect(result.content).toBe('Bold with ** inside');
			expect(result.metadata?.fontWeight).toBe('bold');
		});
	});

	describe('Pattern Extraction', () => {
		it('should extract patterns and clean content properly', () => {
			const input = 'Hello @24px world align:center with color:blue text';
			const result = parseTextInput(input);
			expect(result.content).toBe('Hello world with text');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				textAlign: 'center',
				textColor: 'blue',
			});
		});

		it('should handle adjacent patterns', () => {
			const result = parseTextInput('@24pxalign:centercolor:red Text');
			expect(result.content).toBe('Text');
			expect(result.metadata).toEqual({
				fontSize: '24px',
				textAlign: 'center',
				textColor: 'red',
			});
		});
	});
});
