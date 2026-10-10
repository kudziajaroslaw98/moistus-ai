import {
	pluginManifestSchema,
	type PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import { NETWORK_EXAMPLE_MANIFEST } from '@/lib/plugins/network-example';
import type { PluginData } from '@/lib/plugins/plugin-fields';
import { STARTER_MANIFEST } from '@/lib/plugins/starter-plugin';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SampleDataForm } from './sample-data-form';

/** Holds the data the way the playground does, so typing builds on what was typed. */
function Harness({
	kind,
	initial,
	onChange,
}: {
	kind: PluginNodeKind;
	initial: PluginData;
	onChange: (data: PluginData) => void;
}) {
	const [data, setData] = useState(initial);
	return (
		<SampleDataForm
			data={data}
			kind={kind}
			onChange={(next) => {
				setData(next);
				onChange(next);
			}}
		/>
	);
}

const counter = pluginManifestSchema.parse(STARTER_MANIFEST).nodeKinds[0];
const issue = pluginManifestSchema.parse(NETWORK_EXAMPLE_MANIFEST).nodeKinds[0];

const withList = {
	...counter,
	fields: {
		...counter.fields,
		items: {
			type: 'list',
			title: 'Items',
			columns: [{ name: 'name', title: 'Name', type: 'string' }],
		},
	},
} as unknown as PluginNodeKind;

describe('SampleDataForm', () => {
	it('asks for each field by its title and shows what is filled in', () => {
		render(
			<SampleDataForm
				data={{ label: 'Coffees', count: 2 }}
				kind={counter}
				onChange={jest.fn()}
			/>
		);
		expect(screen.getByLabelText(/Label/)).toHaveValue('Coffees');
		expect(screen.getByLabelText(/Count/)).toHaveValue(2);
	});

	it('passes typed text up as the field’s value', async () => {
		const onChange = jest.fn();
		render(
			<Harness
				initial={{ label: 'A', count: 2 }}
				kind={counter}
				onChange={onChange}
			/>
		);
		await userEvent.type(screen.getByLabelText(/Label/), 'b');
		expect(onChange).toHaveBeenLastCalledWith({ label: 'Ab', count: 2 });
	});

	it('turns a number field’s text into a number', async () => {
		const onChange = jest.fn();
		render(
			<Harness
				initial={{ label: 'A', count: 2 }}
				kind={counter}
				onChange={onChange}
			/>
		);
		const count = screen.getByLabelText(/Count/);
		await userEvent.clear(count);
		expect(onChange).toHaveBeenLastCalledWith({ label: 'A' });
		await userEvent.type(count, '7');
		expect(onChange).toHaveBeenLastCalledWith({ label: 'A', count: 7 });
	});

	it('shows the problem a field has', () => {
		render(
			<SampleDataForm
				data={{ count: 2 }}
				errors={{ label: 'Label is required' }}
				kind={counter}
				onChange={jest.fn()}
			/>
		);
		expect(screen.getByText('Label is required')).toBeInTheDocument();
	});

	it('leaves fields that Refresh fills in for Refresh', () => {
		render(
			<SampleDataForm
				kind={issue}
				onChange={jest.fn()}
				data={{
					repo: 'vercel/next.js',
					number: 1,
					title: 'A title',
					state: 'open',
				}}
			/>
		);
		expect(screen.getByLabelText(/Title/)).toBeDisabled();
		expect(screen.getByLabelText(/State/)).toBeDisabled();
		expect(screen.getAllByText(/set by Refresh/i)).toHaveLength(2);
		expect(screen.getByLabelText(/Repository/)).toBeEnabled();
	});

	it('edits a list as JSON and only passes it up once it parses', async () => {
		const onChange = jest.fn();
		render(
			<Harness
				initial={{ label: 'A', items: [] }}
				kind={withList}
				onChange={onChange}
			/>
		);
		const items = screen.getByLabelText(/Items/);
		fireEvent.change(items, { target: { value: '[{"name":"x"}]' } });
		expect(onChange).toHaveBeenLastCalledWith({
			label: 'A',
			items: [{ name: 'x' }],
		});

		onChange.mockClear();
		fireEvent.change(items, { target: { value: '[{' } });
		expect(screen.getByText(/isn’t valid JSON/)).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});
});
