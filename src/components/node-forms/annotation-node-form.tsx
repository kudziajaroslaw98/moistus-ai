import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { NodeData } from '@/types/node-data';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface AnnotationNodeFormProps {
	initialData: Partial<NodeData>;
}

const annotationTypes = ['comment', 'idea', 'quote', 'summary'];
type AnnotationTypes = 'comment' | 'idea' | 'quote' | 'summary';
const fontSizes = [
	{ value: '8px', label: '8 px' },
	{ value: '9px', label: '9 px' },
	{ value: '11px', label: '11 px' },
	{ value: '12px', label: '12 px' },
	{ value: '13px', label: '13 px' },
	{ value: '15px', label: '15 px' },
	{ value: '16px', label: '16 px' },
	{ value: '19px', label: '19 px' },
	{ value: '21px', label: '21 px' },
	{ value: '24px', label: '24 px' },
	{ value: '27px', label: '27 px' },
	{ value: '29px', label: '29 px' },
	{ value: '32px', label: '32 px' },
	{ value: '35px', label: '35 px' },
	{ value: '37px', label: '37 px' },
	{ value: '48px', label: '48 px' },
	{ value: '64px', label: '64 px' },
	{ value: '80px', label: '80 px' },
	{ value: '96px', label: '96 px' },
];

const AnnotationNodeForm = forwardRef<
	{ getFormData: () => Partial<NodeData> | null },
	AnnotationNodeFormProps
>(({ initialData }, ref) => {
	const [content, setContent] = useState(initialData?.content || '');

	const [fontSize, setFontSize] = useState<string>(
		(initialData.metadata?.fontSize as string) || '16px'
	);
	const [fontWeight, setFontWeight] = useState<number>(
		(initialData.metadata?.fontWeight as number) || 400
	);

	const [annotationType, setAnnotationType] = useState<AnnotationTypes>(
		initialData.metadata?.annotationType || 'comment'
	);

	useEffect(() => {
		setContent(initialData?.content || '');
		setFontSize((initialData.metadata?.fontSize as string) || '16px');
		setFontWeight((initialData.metadata?.fontWeight as number) || 400);
		setAnnotationType(initialData.metadata?.annotationType || 'comment');
	}, [initialData]);

	useImperativeHandle(ref, () => ({
		getFormData: () => {
			return {
				content: content.trim(),
				metadata: {
					...(initialData.metadata || {}),
					fontSize: fontSize || undefined,
					fontWeight: fontWeight || undefined,
					annotationType: annotationType || 'comment',
				},
			};
		},
	}));

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-2'>
				<label
					htmlFor='annotationContent'
					className='text-sm font-medium text-zinc-400'
				>
					Annotation Content
				</label>

				<textarea
					id='annotationContent'
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={6}
					className='w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:ring-2 focus:ring-teal-500 focus:outline-none sm:text-sm'
					placeholder='Enter your annotation here...'
				/>
			</div>

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
				{/* Annotation Type Select */}
				<div className='flex flex-col gap-2'>
					<label
						htmlFor='annotationType'
						className='block text-sm font-medium text-zinc-400'
					>
						Type
					</label>

					<Select
						value={annotationType}
						onValueChange={(value) =>
							setAnnotationType(value as AnnotationTypes)
						}
					>
						<SelectTrigger className='bg-zinc-900 border-zinc-700 w-full'>
							<SelectValue placeholder='Select Type' />
						</SelectTrigger>

						<SelectContent>
							{annotationTypes.map((type) => (
								<SelectItem key={type} value={type} className='capitalize'>
									{type.charAt(0).toUpperCase() + type.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Font Size Input */}
				<div className='flex flex-col gap-2'>
					<label
						htmlFor='fontSize'
						className='text-sm font-medium text-zinc-400'
					>
						Font Size (px)
					</label>

					<Select
						value={fontSize}
						onValueChange={(value) => setFontSize(value)} // Example: how to update state
						// defaultValue="12pt" // Or value={selectedSize} if controlled
					>
						<SelectTrigger className='bg-zinc-900 border-zinc-700 w-full'>
							<SelectValue placeholder='Select font size' />
						</SelectTrigger>

						<SelectContent>
							<SelectGroup>
								<SelectLabel>Font Sizes</SelectLabel>

								{fontSizes.map((size) => (
									<SelectItem key={size.value} value={size.value}>
										{size.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				{/* Font Weight Select */}
				<div className='flex flex-col gap-2'>
					<label
						htmlFor='fontWeight'
						className='block text-sm font-medium text-zinc-400'
					>
						Font Weight
					</label>

					<Select
						value={fontWeight.toString()}
						onValueChange={(value) => setFontWeight(parseInt(value))}
					>
						<SelectTrigger className='bg-zinc-900 border-zinc-700 w-full'>
							<SelectValue placeholder='Select Font Weight' />
						</SelectTrigger>

						<SelectContent>
							<SelectItem value='100'>Lighter</SelectItem>

							<SelectItem value='300'>Light</SelectItem>

							<SelectItem value='400'>Normal</SelectItem>

							<SelectItem value='500'>Medium</SelectItem>

							<SelectItem value='600'>Semibold</SelectItem>

							<SelectItem value='700'>Bold</SelectItem>

							<SelectItem value='800'>Bolder</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
});

AnnotationNodeForm.displayName = 'AnnotationNodeForm';

export default AnnotationNodeForm;
