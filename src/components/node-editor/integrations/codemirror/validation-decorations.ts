/**
 * Validation Decorations - Error and warning highlighting
 * Shows validation errors from our validators
 */

import { StateEffect, StateField } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	Tooltip,
	ViewPlugin,
	ViewUpdate,
	hoverTooltip,
} from '@codemirror/view';
import { validateInput } from '../../core/validators/input-validator';

/**
 * State effect for updating validation decorations
 */
const updateValidations = StateEffect.define<DecorationSet>();

/**
 * State field to store validation decorations
 */
const validationField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(decorations, tr) {
		// Check for updates
		for (const effect of tr.effects) {
			if (effect.is(updateValidations)) {
				return effect.value;
			}
		}

		// Map decorations through document changes
		return decorations.map(tr.changes);
	},
	provide: (f) => EditorView.decorations.from(f),
});

/**
 * Build validation decorations from editor text
 */
function buildValidationDecorations(view: EditorView): DecorationSet {
	const decorations: Array<{
		from: number;
		to: number;
		decoration: Decoration;
	}> = [];
	const text = view.state.doc.toString();

	// Get validation result
	const validationResult = validateInput(text);

	// Combine all errors and warnings (with null-safety)
	const allErrors = [
		...(validationResult.errors || []),
		...(validationResult.warnings || []),
	];

	// Create decorations for each error
	for (const error of allErrors) {
		const from = error.startIndex ?? error.position?.start ?? 0;
		const to = error.endIndex ?? error.position?.end ?? from + 1;

		// Choose decoration style based on severity
		let className = 'cm-validation-error';

		if (error.type === 'warning') {
			className = 'cm-validation-warning';
		} else if (error.type === 'info' || error.type === 'suggestion') {
			className = 'cm-validation-info';
		}

		// Create decoration with attributes for tooltip
		decorations.push({
			from,
			to,
			decoration: Decoration.mark({
				class: className,
				attributes: {
					'data-error': error.message,
					'data-suggestion': error.suggestion || '',
				},
			}),
		});
	}

	// Sort by position and create decoration set
	decorations.sort((a, b) => a.from - b.from);
	return Decoration.set(
		decorations.map((d) => d.decoration.range(d.from, d.to))
	);
}

/**
 * View plugin for updating validation decorations
 */
const validationPlugin = ViewPlugin.fromClass(
	class {
		timeout: NodeJS.Timeout | null = null;

		constructor(view: EditorView) {
			// Schedule initial validation after construction
			this.timeout = setTimeout(() => {
				this.updateValidations(view);
			}, 0);
		}

		update(update: ViewUpdate) {
			if (update.docChanged) {
				// Debounce validation updates
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => {
					this.updateValidations(update.view);
				}, 300);
			}
		}

		updateValidations(view: EditorView) {
			const decorations = buildValidationDecorations(view);
			view.dispatch({
				effects: updateValidations.of(decorations),
			});
		}

		destroy() {
			if (this.timeout) clearTimeout(this.timeout);
		}
	}
);

/**
 * Create hover tooltips for validation errors
 */
const validationTooltips = hoverTooltip((view, pos) => {
	const decorations = view.state.field(validationField);
	let tooltip: Tooltip | null = null;

	decorations.between(pos, pos, (from, to, decoration) => {
		const spec = decoration.spec;

		if (spec?.attributes?.['data-error']) {
			const message = spec.attributes['data-error'];
			const suggestion = spec.attributes['data-suggestion'];

			// Create tooltip content
			let content = message;

			if (suggestion) {
				content += `\n💡 ${suggestion}`;
			}

			tooltip = {
				pos: from,
				end: to,
				above: true,
				create: () => {
					const dom = document.createElement('div');
					dom.className = 'cm-validation-tooltip';
					dom.textContent = content;
					return { dom };
				},
			};
		}
	});

	return tooltip;
});

/**
 * Create the validation decorations extension
 */
export function createValidationDecorations() {
	return [
		validationField,
		validationPlugin,
		validationTooltips,
		EditorView.baseTheme({
			// Error styles
			'.cm-validation-error': {
				textDecoration: 'underline wavy #dc2626',
				textUnderlineOffset: '3px',
			},

			// Warning styles
			'.cm-validation-warning': {
				textDecoration: 'underline wavy #f59e0b',
				textUnderlineOffset: '3px',
			},

			// Info styles
			'.cm-validation-info': {
				textDecoration: 'underline dotted #3b82f6',
				textUnderlineOffset: '3px',
			},

			// Tooltip styles
			'.cm-validation-tooltip': {
				backgroundColor: '#1f2937',
				color: '#f3f4f6',
				padding: '6px 10px',
				borderRadius: '6px',
				fontSize: '13px',
				lineHeight: '1.4',
				maxWidth: '300px',
				boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
				whiteSpace: 'pre-wrap',
			},

			// Hover effect
			'.cm-validation-error:hover, .cm-validation-warning:hover, .cm-validation-info:hover':
				{
					backgroundColor: '#fef2f2',
				},
		}),
	];
}
