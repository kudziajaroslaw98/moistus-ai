import { FormField } from '@/components/ui/form-field'; // Added import
import type {
	BuilderElement,
	TextElementProperties,
} from '@/types/builder-node';
import React, { memo, useEffect, useState } from 'react';
// Assuming Input and Textarea are already imported or available globally, adjust if needed.
// For this example, I'll assume they are standard HTML elements or custom components that don't need specific import here unless they are from '@/components/ui'
// Let's assume you have Input and Textarea from '@/components/ui' like in text-node-form.tsx
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TextSettingsFormProps {
	element: BuilderElement; // Ensure element is of type 'text'
	// onUpdate will now update the entire element, not just properties, to handle size changes
	onUpdate: (updatedElement: Partial<BuilderElement>) => void;
}

const TextSettingsFormComponent = ({
	element,
	onUpdate,
}: TextSettingsFormProps) => {
	const textElementProperties = element.properties as TextElementProperties;
	const [textContent, setTextContent] = useState(
		textElementProperties?.text || ''
	);
	const [width, setWidth] = useState(element.position.width);
	const [height, setHeight] = useState(element.position.height);

	useEffect(() => {
		setTextContent(textElementProperties.text || '');
		setWidth(element.position.width);
		setHeight(element.position.height);
	}, [
		textElementProperties.text,
		element.position.width,
		element.position.height,
	]);

	const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setTextContent(event.target.value);
	};

	const handlePropertyChange = (
		property: keyof TextElementProperties,
		value: TextElementProperties[keyof TextElementProperties]
	) => {
		onUpdate({
			id: element.id, // Important to identify which element to update
			properties: { ...textElementProperties, [property]: value },
		});
	};

	const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
		const numericValue = parseInt(value, 10);

		if (!isNaN(numericValue) && numericValue > 0) {
			if (dimension === 'width') setWidth(numericValue);
			if (dimension === 'height') setHeight(numericValue);
			onUpdate({
				id: element.id, // Important to identify which element to update
				position: { ...element.position, [dimension]: numericValue },
			});
		}
	};

	// Auto-save on blur for text content
	const handleTextBlur = () => {
		handlePropertyChange('text', textContent);
	};

	// Auto-save on blur for size inputs
	const handleSizeInputBlur = (
		dimension: 'width' | 'height',
		value: number
	) => {
		onUpdate({
			id: element.id,
			position: { ...element.position, [dimension]: value },
		});
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// console.log("Form submitted, default prevented. Updates occur on blur.");
	};

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
			<FormField label='Text Content' id='textContent'>
				<Textarea
					id='textContent'
					name='textContent'
					rows={3}
					value={textContent}
					onChange={handleTextChange}
					onBlur={handleTextBlur}
				/>
			</FormField>

			<div className='grid grid-cols-2 gap-4'>
				<FormField label='Width (px)' id='elementWidth'>
					<Input
						type='number'
						id='elementWidth'
						name='width'
						value={width}
						onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
						onBlur={(e) =>
							handleSizeInputBlur(
								'width',
								parseInt(e.target.value, 10) || element.position.width
							)
						}
						min='10'
					/>
				</FormField>

				<FormField label='Height (px)' id='elementHeight'>
					<Input
						type='number'
						id='elementHeight'
						name='height'
						value={height}
						onChange={(e) => setHeight(parseInt(e.target.value, 10) || 0)}
						onBlur={(e) =>
							handleSizeInputBlur(
								'height',
								parseInt(e.target.value, 10) || element.position.height
							)
						}
						min='10'
					/>
				</FormField>
			</div>

			{/* Add more text settings here as per requirements (font, size, color, etc.) */}
			{/* No explicit submit button as per current design (updates on blur) */}
		</form>
	);
};

export const TextSettingsForm = memo(TextSettingsFormComponent);
TextSettingsForm.displayName = 'TextSettingsForm';
