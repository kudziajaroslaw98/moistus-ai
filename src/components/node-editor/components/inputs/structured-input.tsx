'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { createOrUpdateNodeFromCommand, transformNodeToFormData } from '../../node-updater';
import type { FieldConfig, StructuredInputProps } from '../../types';

const theme = {
	container: 'p-4',
	field: 'mb-4',
	label: 'text-xs font-medium text-zinc-300 mb-1.5 block',
	input:
		'bg-zinc-900 text-zinc-100 placeholder-zinc-500 border border-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500',
	select:
		'bg-zinc-900 text-zinc-100 border border-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500',
	error: 'text-xs text-red-400 mt-1',
	arrayContainer: 'space-y-2',
	arrayItem: 'flex items-center gap-2',
	addButton:
		'text-xs text-teal-500 hover:text-teal-400 flex items-center gap-1',
	removeButton: 'text-zinc-500 hover:text-red-400',
};

export const StructuredInput: React.FC<StructuredInputProps> = ({
	command,
	parentNode,
	position,
	mode = 'create',
	existingNode,
}) => {
	const firstInputRef = useRef<HTMLInputElement>(null);
	const [formData, setFormData] = useState<Record<string, any>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isCreating, setIsCreating] = useState(false);

	const { closeInlineCreator, closeNodeEditor, addNode, updateNode } = useAppStore(
		useShallow((state) => ({
			closeInlineCreator: state.closeInlineCreator,
			closeNodeEditor: state.closeNodeEditor,
			addNode: state.addNode,
			updateNode: state.updateNode,
		}))
	);

	// Initialize form data with default values or existing node data
	useEffect(() => {
		const initialData: Record<string, any> = {};

		if (mode === 'edit' && existingNode) {
			// Pre-populate with existing node data
			const existingData = transformNodeToFormData(existingNode, command.nodeType || 'defaultNode');
			setFormData(existingData);
		} else {
			// Initialize with default values for create mode
			command.fields?.forEach((field) => {
				if (field.type === 'array') {
					initialData[field.name] = [];
				} else if (field.type === 'checkbox') {
					initialData[field.name] = false;
				} else {
					initialData[field.name] = '';
				}
			});
			setFormData(initialData);
		}
	}, [command, mode, existingNode]);

	// Focus first input on mount
	useEffect(() => {
		setTimeout(() => {
			firstInputRef.current?.focus();
		}, 100);
	}, []);

	// Handle field change
	const handleFieldChange = useCallback((fieldName: string, value: any) => {
		setFormData((prev) => ({ ...prev, [fieldName]: value }));

		// Clear error for this field
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors[fieldName];
			return newErrors;
		});
	}, []);

	// Handle array field operations
	const handleArrayAdd = useCallback((fieldName: string, itemType?: string) => {
		setFormData((prev) => ({
			...prev,
			[fieldName]: [
				...prev[fieldName],
				itemType === 'task'
					? { id: nanoid(), text: '', isComplete: false }
					: '',
			],
		}));
	}, []);

	const handleArrayRemove = useCallback((fieldName: string, index: number) => {
		setFormData((prev) => ({
			...prev,
			[fieldName]: prev[fieldName].filter((_: any, i: number) => i !== index),
		}));
	}, []);

	const handleArrayItemChange = useCallback(
		(fieldName: string, index: number, value: any) => {
			setFormData((prev) => ({
				...prev,
				[fieldName]: prev[fieldName].map((item: any, i: number) =>
					i === index ? value : item
				),
			}));
		},
		[]
	);

	// Validate form
	const validateForm = useCallback((): boolean => {
		const newErrors: Record<string, string> = {};
		let isValid = true;

		command.fields?.forEach((field) => {
			const value = formData[field.name];

			// Check required fields
			if (field.required) {
				if (field.type === 'array' && (!value || value.length === 0)) {
					newErrors[field.name] = 'At least one item is required';
					isValid = false;
				} else if (
					!value &&
					field.type !== 'array' &&
					field.type !== 'checkbox'
				) {
					newErrors[field.name] = 'This field is required';
					isValid = false;
				}
			}

			// Custom validation
			if (field.validation && value) {
				const error = field.validation(value);

				if (error) {
					newErrors[field.name] = error;
					isValid = false;
				}
			}

			// URL validation
			if (field.type === 'url' && value) {
				try {
					new URL(value);
				} catch {
					newErrors[field.name] = 'Please enter a valid URL';
					isValid = false;
				}
			}
		});

		setErrors(newErrors);
		return isValid;
	}, [command.fields, formData]);

	// Handle form submission
	const handleSubmit = useCallback(async () => {
		if (!validateForm() || isCreating) return;

		setIsCreating(true);

		try {
			const result = await createOrUpdateNodeFromCommand({
				command,
				data: formData,
				mode,
				position,
				parentNode,
				existingNode,
				addNode,
				updateNode,
			});

			if (result.success) {
				// Close the appropriate editor based on context
				if (mode === 'edit') {
					closeNodeEditor();
				} else {
					closeInlineCreator();
				}
			} else {
				setErrors({ _form: result.error || `Failed to ${mode === 'edit' ? 'update' : 'create'} node` });
			}
		} catch {
			setErrors({ _form: `An error occurred while ${mode === 'edit' ? 'updating' : 'creating'} the node` });
		} finally {
			setIsCreating(false);
		}
	}, [
		validateForm,
		isCreating,
		command,
		formData,
		position,
		parentNode,
		addNode,
		updateNode,
		closeInlineCreator,
		closeNodeEditor,
		mode,
		existingNode,
	]);

	// Render field based on type
	const renderField = (field: FieldConfig, index: number) => {
		const value = formData[field.name];
		const error = errors[field.name];
		const isFirstField = index === 0;

		switch (field.type) {
			case 'text':
			case 'url':
				return (
					<div className={theme.field} key={field.name}>
						<label className={theme.label} htmlFor={field.name}>
							{field.label || field.name}

							{field.required && <span className='text-red-400 ml-1'>*</span>}
						</label>

						<input
							className={cn(theme.input, 'w-full px-3 py-2 text-sm rounded-md')}
							disabled={isCreating}
							id={field.name}
							placeholder={field.placeholder}
							ref={isFirstField ? firstInputRef : undefined}
							type={field.type === 'url' ? 'url' : 'text'}
							value={value || ''}
							onChange={(e) => handleFieldChange(field.name, e.target.value)}
						/>

						{error && <div className={theme.error}>{error}</div>}
					</div>
				);

			case 'textarea':
			case 'code':
				return (
					<div className={theme.field} key={field.name}>
						<label className={theme.label} htmlFor={field.name}>
							{field.label || field.name}

							{field.required && <span className='text-red-400 ml-1'>*</span>}
						</label>

						<textarea
							disabled={isCreating}
							id={field.name}
							placeholder={field.placeholder}
							rows={field.type === 'code' ? 10 : 4}
							value={value || ''}
							className={cn(
								theme.input,
								'w-full px-3 py-2 text-sm rounded-md resize-none',
								field.type === 'code' && 'font-mono'
							)}
							onChange={(e) => handleFieldChange(field.name, e.target.value)}
						/>

						{error && <div className={theme.error}>{error}</div>}
					</div>
				);

			case 'select':
				return (
					<div className={theme.field} key={field.name}>
						<label className={theme.label} htmlFor={field.name}>
							{field.label || field.name}

							{field.required && <span className='text-red-400 ml-1'>*</span>}
						</label>

						<select
							disabled={isCreating}
							id={field.name}
							value={value || ''}
							className={cn(
								theme.select,
								'w-full px-3 py-2 text-sm rounded-md'
							)}
							onChange={(e) => handleFieldChange(field.name, e.target.value)}
						>
							<option value=''>
								Select {field.label?.toLowerCase() || 'option'}
							</option>

							{field.options?.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>

						{error && <div className={theme.error}>{error}</div>}
					</div>
				);

			case 'date':
				return (
					<div className={theme.field} key={field.name}>
						<label className={theme.label} htmlFor={field.name}>
							{field.label || field.name}

							{field.required && <span className='text-red-400 ml-1'>*</span>}
						</label>

						<div className='relative'>
							<input
								disabled={isCreating}
								id={field.name}
								type='date'
								value={value || ''}
								className={cn(
									theme.input,
									'w-full px-3 py-2 text-sm rounded-md pr-10'
								)}
								onChange={(e) => handleFieldChange(field.name, e.target.value)}
							/>

							<Calendar className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none' />
						</div>

						{error && <div className={theme.error}>{error}</div>}
					</div>
				);

			case 'checkbox':
				return (
					<div className={theme.field} key={field.name}>
						<label className='flex items-center gap-2 cursor-pointer'>
							<input
								checked={value || false}
								className='w-4 h-4 bg-zinc-900 border-zinc-700 text-teal-500 rounded focus:ring-teal-500'
								disabled={isCreating}
								type='checkbox'
								onChange={(e) =>
									handleFieldChange(field.name, e.target.checked)
								}
							/>

							<span className='text-sm text-zinc-300'>
								{field.label || field.name}

								{field.required && <span className='text-red-400 ml-1'>*</span>}
							</span>
						</label>

						{error && <div className={theme.error}>{error}</div>}
					</div>
				);

			case 'array':
				return (
					<div className={theme.field} key={field.name}>
						<label className={theme.label}>
							{field.label || field.name}

							{field.required && <span className='text-red-400 ml-1'>*</span>}
						</label>

						<div className={theme.arrayContainer}>
							{(value || []).map((item: any, idx: number) => (
								<div className={theme.arrayItem} key={idx}>
									{field.itemType === 'task' ? (
										<>
											<input
												checked={item.isComplete || false}
												className='w-4 h-4 bg-zinc-900 border-zinc-700 text-teal-500 rounded'
												disabled={isCreating}
												type='checkbox'
												onChange={(e) =>
													handleArrayItemChange(field.name, idx, {
														...item,
														isComplete: e.target.checked,
													})
												}
											/>

											<input
												disabled={isCreating}
												placeholder='Task description'
												type='text'
												value={item.text || ''}
												className={cn(
													theme.input,
													'flex-1 px-3 py-1.5 text-sm rounded-md'
												)}
												onChange={(e) =>
													handleArrayItemChange(field.name, idx, {
														...item,
														text: e.target.value,
													})
												}
											/>
										</>
									) : (
										<input
											disabled={isCreating}
											placeholder={`Item ${idx + 1}`}
											type='text'
											value={item || ''}
											className={cn(
												theme.input,
												'flex-1 px-3 py-1.5 text-sm rounded-md'
											)}
											onChange={(e) =>
												handleArrayItemChange(field.name, idx, e.target.value)
											}
										/>
									)}

									<button
										className={theme.removeButton}
										disabled={isCreating}
										onClick={() => handleArrayRemove(field.name, idx)}
									>
										<Trash2 className='w-4 h-4' />
									</button>
								</div>
							))}

							<button
								className={theme.addButton}
								disabled={isCreating}
								onClick={() => handleArrayAdd(field.name, field.itemType)}
							>
								<Plus className='w-3 h-3' />

								Add {field.itemType || 'item'}
							</button>
						</div>

						{error && <div className={theme.error}>{error}</div>}
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className={theme.container}>
			<div className='flex items-center gap-2 mb-4'>
				<command.icon className='w-4 h-4 text-zinc-400' />

				<h3 className='text-sm font-medium text-zinc-100'>{command.label}</h3>
			</div>

			<form
				onKeyDown={(e) => {
					if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						handleSubmit();
					}
				}}
				onSubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				{command.fields?.map((field, index) => renderField(field, index))}

				{errors._form && (
					<motion.div
						animate={{ opacity: 1 }}
						className='text-xs text-red-400 mb-4'
						initial={{ opacity: 0 }}
					>
						{errors._form}
					</motion.div>
				)}

				<div className='flex items-center justify-between mt-6'>
					<span className='text-xs text-zinc-500'>
						Fill in the fields and press Ctrl+Enter to {mode === 'edit' ? 'update' : 'create'}
					</span>

					<button
						disabled={isCreating}
						type='submit'
						className={cn(
							'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
							'bg-teal-600 hover:bg-teal-700 text-white',
							'disabled:opacity-50 disabled:cursor-not-allowed'
						)}
					>
						{isCreating 
							? `${mode === 'edit' ? 'Updating' : 'Creating'}...`
							: mode === 'edit' ? 'Update' : 'Create'
						}
					</button>
				</div>
			</form>
		</div>
	);
};