import { BuilderElement, TextElementProperties } from '@/types/builder-node';
import { Type } from 'lucide-react';
import { memo } from 'react';

interface TextElementProps {
	element: BuilderElement;
	isSelected?: boolean;
	isEditing?: boolean;
	onUpdate?: (element: BuilderElement) => void;
}

const TextElementComponent = ({
	element,
	isSelected = false,
	isEditing = false,
	onUpdate,
}: TextElementProps) => {
	const properties = element.properties as TextElementProperties;
	const {
		text = 'Sample Text',
		fontSize = 14,
		fontWeight = 'normal',
		color = '#ffffff',
		textAlign = 'left',
	} = properties;

	const handleTextChange = (newText: string) => {
		if (onUpdate) {
			onUpdate({
				...element,
				properties: { ...properties, text: newText },
			});
		}
	};

	return (
		<div
			className={`
        w-full h-full flex items-center justify-center p-2 rounded cursor-move
        ${isSelected ? 'ring-2 ring-teal-500' : ''}
        ${isEditing ? 'bg-zinc-800' : ''}
      `}
			style={{
				fontSize: `${fontSize}px`,
				fontWeight,
				color,
				textAlign: textAlign,
			}}
		>
			<span>{text}</span>
		</div>
	);
};

export const TextElement = memo(TextElementComponent);

export const textElementType = {
	id: 'text',
	name: 'Text',
	icon: Type,
	defaultProperties: {
		text: 'New Text',
		fontSize: 14,
		fontWeight: 'normal',
		color: '#ffffff',
		textAlign: 'left',
	},
	defaultSize: {
		width: 2,
		height: 1,
	},
};
