import { BuilderElement, TagElementProperties } from '@/types/builder-node';
import { Tag } from 'lucide-react';
import { memo } from 'react';

interface TagElementProps {
	element: BuilderElement;
	isSelected?: boolean;
	isEditing?: boolean;
	onUpdate?: (element: BuilderElement) => void;
}

const TagElementComponent = ({
	element,
	isSelected = false,
	isEditing = false,
	onUpdate,
}: TagElementProps) => {
	const properties = element.properties as TagElementProperties;
	const {
		text = 'Tag',
		backgroundColor = '#374151',
		textColor = '#ffffff',
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
        w-full h-full flex items-center justify-center p-1 text-xs font-medium cursor-move rounded-md
        ${isSelected ? 'ring-2 ring-teal-500' : ''}
        ${isEditing ? 'bg-zinc-800' : ''}
      `}
			style={{
				backgroundColor,
				color: textColor,
			}}
		>
			<span>{text}</span>
		</div>
	);
};

export const TagElement = memo(TagElementComponent);

export const tagElementType = {
	id: 'tag',
	name: 'Tag',
	icon: Tag,
	defaultProperties: {
		text: 'New Tag',
		backgroundColor: '#374151',
		textColor: '#ffffff',
		borderRadius: 12,
	},
	defaultSize: {
		width: 2,
		height: 1,
	},
};
