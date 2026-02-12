'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	ANNOTATION_TYPES,
	type AnnotationTypeInfo,
} from '@/components/nodes/content/annotation-content';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface AnnotationTypePickerProps {
	annotationType: string;
	onTypeChange: (type: string) => void;
}

// Exclude 'default' — it's a fallback, not a user-selectable type
const VISIBLE_TYPES = Object.entries(ANNOTATION_TYPES).filter(
	([key]) => key !== 'default'
) as [string, AnnotationTypeInfo][];

export const AnnotationTypePicker = ({
	annotationType,
	onTypeChange,
}: AnnotationTypePickerProps) => {
	const theme = GlassmorphismTheme;
	const currentType = ANNOTATION_TYPES[annotationType] || ANNOTATION_TYPES.default;
	const CurrentIcon = currentType.icon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						className="h-8 px-2 gap-1.5"
						size="sm"
						variant="outline"
						style={{
							backgroundColor: 'transparent',
							border: `1px solid ${theme.borders.hover}`,
							color: theme.text.medium,
						}}
						title="Change annotation type"
					>
						<CurrentIcon
							className="w-3.5 h-3.5"
							style={{ color: `rgba(${currentType.colorRgb}, 0.87)` }}
						/>
						<span
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: `rgba(${currentType.colorRgb}, 1)` }}
						/>
						<span className="text-xs capitalize">{annotationType}</span>
					</Button>
				}
			/>
			<DropdownMenuContent align="center">
				<DropdownMenuRadioGroup
					value={annotationType}
					onValueChange={onTypeChange}
				>
					{VISIBLE_TYPES.map(([type, info]) => {
						const TypeIcon = info.icon;
						return (
							<DropdownMenuRadioItem key={type} value={type}>
								<TypeIcon
									className="w-4 h-4 mr-2"
									style={{ color: `rgba(${info.colorRgb}, 0.87)` }}
								/>
								<span className="capitalize">{type}</span>
								<span
									className="w-2 h-2 rounded-full ml-auto"
									style={{ backgroundColor: `rgba(${info.colorRgb}, 1)` }}
								/>
							</DropdownMenuRadioItem>
						);
					})}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
