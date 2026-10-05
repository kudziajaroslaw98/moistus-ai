import metricManifest from '../../../public/plugins/shiko.metric/0.1.0/manifest.json';
import { pluginManifestSchema } from './manifest-schema';
import {
	parsePluginFieldInput,
	serializePluginFieldInput,
	validatePluginData,
} from './plugin-fields';

const metric = pluginManifestSchema.parse(metricManifest).nodeKinds[0];

describe('parsePluginFieldInput', () => {
	it('reads the kind’s fields and keeps the rest as the label', () => {
		const parsed = parsePluginFieldInput(
			'Weekly active users value:1240 target:2000 unit:users step:100',
			metric
		);

		expect(parsed.errors).toEqual([]);
		expect(parsed.label).toBe('Weekly active users');
		expect(parsed.data).toEqual({
			label: 'Weekly active users',
			value: 1240,
			target: 2000,
			unit: 'users',
			step: 100,
		});
		expect(parsed.tokens.map((token) => token.field)).toEqual([
			'value',
			'target',
			'unit',
			'step',
		]);
	});

	it('treats words that look like built-in syntax as label text', () => {
		const parsed = parsePluginFieldInput(
			'Signups #growth status:done target:300',
			metric
		);

		expect(parsed.label).toBe('Signups #growth status:done');
		expect(parsed.data.target).toBe(300);
	});

	it('supports quoted values and fields on any line', () => {
		const parsed = parsePluginFieldInput(
			'Revenue\nvalue:12 target:50 unit:"k €"',
			metric
		);

		expect(parsed.label).toBe('Revenue');
		expect(parsed.data.unit).toBe('k €');
	});

	it('applies defaults and reports required fields', () => {
		const parsed = parsePluginFieldInput('Weekly active users', metric);

		expect(parsed.data).toMatchObject({ value: 0, step: 1 });
		expect(parsed.errors).toEqual([
			{ field: 'target', message: 'Target is required' },
		]);
	});

	it('reports invalid values with the field title', () => {
		const parsed = parsePluginFieldInput('Users target:lots step:-5', metric);

		expect(parsed.errors).toEqual([
			{ field: 'target', message: 'Target must be a number' },
			{ field: 'step', message: 'Step must be at least 0' },
		]);
		expect(parsed.tokens.every((token) => !token.valid)).toBe(true);
	});

	it('uses the last value when a field repeats', () => {
		const parsed = parsePluginFieldInput('Users target:x target:10', metric);

		expect(parsed.errors).toEqual([]);
		expect(parsed.data.target).toBe(10);
	});
});

describe('serializePluginFieldInput', () => {
	it('round-trips through the parser', () => {
		const data = {
			label: 'Weekly active users',
			value: 1240,
			target: 2000,
			unit: 'k €',
			step: 100,
		};
		const text = serializePluginFieldInput(metric, data);

		expect(text).toBe(
			'Weekly active users value:1240 target:2000 unit:"k €" step:100'
		);
		expect(parsePluginFieldInput(text, metric).data).toEqual(data);
	});

	it('leaves out values equal to their default', () => {
		expect(
			serializePluginFieldInput(metric, {
				label: 'Users',
				value: 0,
				target: 10,
				step: 1,
			})
		).toBe('Users target:10');
	});

	it('quotes a label that would read back as fields', () => {
		const data = { label: 'Ratio value:3', value: 0, target: 10, step: 1 };
		const text = serializePluginFieldInput(metric, data);

		expect(text).toBe('label:"Ratio value:3" target:10');
		expect(parsePluginFieldInput(text, metric).data).toEqual(data);
	});
});

describe('validatePluginData', () => {
	it('accepts valid data and fills defaults', () => {
		expect(validatePluginData(metric, { label: 'Users', target: 10 })).toEqual({
			ok: true,
			data: { label: 'Users', target: 10, value: 0, step: 1 },
		});
	});

	it('does not coerce types or accept unknown fields', () => {
		const result = validatePluginData(metric, {
			label: 'Users',
			target: '10',
			secret: 1,
		});

		expect(result.ok).toBe(false);
		expect(!result.ok && result.errors.map((error) => error.field)).toEqual([
			'target',
			'secret',
		]);
	});

	it('rejects quotes in quoted fields but allows them in the label', () => {
		expect(
			validatePluginData(metric, { label: 'The "best" one', target: 1 }).ok
		).toBe(true);
		expect(
			validatePluginData(metric, { label: 'A', target: 1, unit: 'a"b' }).ok
		).toBe(false);
	});

	it('rejects oversized data', () => {
		expect(
			validatePluginData(metric, { label: 'x'.repeat(20_000), target: 1 }).ok
		).toBe(false);
	});
});
