'use client';

import type {
	PluginFieldSpec,
	PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import type { PluginData, PluginFieldValue } from '@/lib/plugins/plugin-fields';
import { useId, useState } from 'react';
import {
	FIELD_LABEL_CLASS,
	INPUT_CLASS,
	TEXTAREA_CLASS,
} from './playground-styles';

interface SampleDataFormProps {
	kind: PluginNodeKind;
	data: PluginData;
	onChange: (data: PluginData) => void;
	/** Field name to the problem with its value. */
	errors?: Record<string, string>;
}

function hintOf(spec: PluginFieldSpec): string {
	if ('setBy' in spec && spec.setBy === 'refresh') return 'set by Refresh';
	const required = 'required' in spec && spec.required ? ' · required' : '';
	return `${spec.type}${required}`;
}

/** A list field, edited as JSON: only a value that parses is passed up. */
function ListJsonField({
	id,
	value,
	onChange,
}: {
	id: string;
	value: PluginFieldValue | undefined;
	onChange: (value: PluginFieldValue) => void;
}) {
	const [text, setText] = useState(() => JSON.stringify(value ?? [], null, 2));
	const [problem, setProblem] = useState<string | null>(null);
	// The list this field last took in or passed up. A different `value` came from
	// elsewhere (a button in the preview, a loaded newer draft), so the text follows it;
	// what the person is typing never differs from it, so typing is left alone.
	const current = JSON.stringify(value ?? []);
	const [known, setKnown] = useState(current);
	if (current !== known) {
		setKnown(current);
		setText(JSON.stringify(value ?? [], null, 2));
		setProblem(null);
	}

	return (
		<>
			<textarea
				aria-describedby={problem ? `${id}-problem` : undefined}
				className={TEXTAREA_CLASS}
				id={id}
				rows={5}
				spellCheck={false}
				value={text}
				onChange={(event) => {
					setText(event.target.value);
					try {
						const parsed: unknown = JSON.parse(event.target.value);
						if (!Array.isArray(parsed)) throw new Error('not a list');
						setProblem(null);
						setKnown(JSON.stringify(parsed));
						onChange(parsed as PluginFieldValue);
					} catch {
						setProblem('This isn’t valid JSON for a list of rows yet.');
					}
				}}
			/>

			{problem && (
				<span className='text-xs text-red-300' id={`${id}-problem`}>
					{problem}
				</span>
			)}
		</>
	);
}

function FieldInput({
	id,
	name,
	spec,
	value,
	onValue,
}: {
	id: string;
	name: string;
	spec: PluginFieldSpec;
	value: PluginFieldValue | undefined;
	onValue: (value: PluginFieldValue | undefined) => void;
}) {
	const refreshed = 'setBy' in spec && spec.setBy === 'refresh';

	switch (spec.type) {
		case 'string':
		case 'date':
			return (
				<input
					className={INPUT_CLASS}
					disabled={refreshed}
					id={id}
					maxLength={spec.type === 'string' ? spec.maxLength : undefined}
					name={name}
					onChange={(event) => onValue(event.target.value || undefined)}
					type={spec.type === 'date' ? 'date' : 'text'}
					value={typeof value === 'string' ? value : ''}
				/>
			);
		case 'number':
		case 'integer':
			return (
				<input
					className={INPUT_CLASS}
					disabled={refreshed}
					id={id}
					max={spec.max}
					min={spec.min}
					name={name}
					step={spec.type === 'integer' ? 1 : 'any'}
					type='number'
					value={typeof value === 'number' ? value : ''}
					onChange={(event) => {
						if (event.target.value === '') return onValue(undefined);
						const next = Number(event.target.value);
						if (!Number.isNaN(next)) onValue(next);
					}}
				/>
			);
		case 'boolean':
			return (
				<input
					checked={value === true}
					className='size-4 accent-blue-600'
					disabled={refreshed}
					id={id}
					name={name}
					onChange={(event) => onValue(event.target.checked)}
					type='checkbox'
				/>
			);
		case 'enum':
			return (
				<select
					className={INPUT_CLASS}
					disabled={refreshed}
					id={id}
					name={name}
					onChange={(event) => onValue(event.target.value || undefined)}
					value={typeof value === 'string' ? value : ''}
				>
					<option value=''>—</option>

					{spec.options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			);
		case 'list':
			return <ListJsonField id={id} onChange={onValue} value={value} />;
	}
}

/**
 * Typed inputs for a node kind's fields: the data the preview node draws, the way a
 * person fills the node in. Fields the kind's `refresh` sets are shown but not editable.
 */
export function SampleDataForm({
	kind,
	data,
	onChange,
	errors = {},
}: SampleDataFormProps) {
	const base = useId();

	return (
		<div className='flex flex-col gap-3.5'>
			{Object.entries(kind.fields).map(([name, spec]) => {
				const id = `${base}-${name}`;
				return (
					<div className='flex flex-col gap-1.5' key={name}>
						<label
							className={`${FIELD_LABEL_CLASS} flex items-baseline justify-between gap-2`}
							htmlFor={id}
						>
							{spec.title}

							<span className='font-mono text-[11px] font-normal text-zinc-500'>
								{hintOf(spec)}
							</span>
						</label>

						<FieldInput
							id={id}
							name={name}
							spec={spec}
							value={data[name]}
							onValue={(value) => {
								const next = { ...data };
								if (value === undefined) delete next[name];
								else next[name] = value;
								onChange(next);
							}}
						/>

						{errors[name] && (
							<span className='text-xs text-red-300'>{errors[name]}</span>
						)}
					</div>
				);
			})}
		</div>
	);
}
