import { NodeData } from '@/types/node-data';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface ImageNodeFormProps {
	initialData: Partial<NodeData>;
}

const ImageNodeForm = forwardRef<
	{ getFormData: () => Partial<NodeData> | null },
	ImageNodeFormProps
>(({ initialData }, ref) => {
	const [content, setContent] = useState(initialData?.content || '');
	const [imageUrl, setImageUrl] = useState(
		(initialData.metadata?.image_url as string) || ''
	);

	const [showCaption, setShowCaption] = useState(
		Boolean(initialData.metadata?.showCaption)
	);

	useEffect(() => {
		setContent(initialData?.content || '');
		setImageUrl((initialData.metadata?.image_url as string) || '');
		setShowCaption(Boolean(initialData.metadata?.showCaption));
	}, [
		initialData?.content,
		initialData.metadata?.image_url,
		initialData.metadata?.showCaption,
	]);

	useImperativeHandle(ref, () => ({
		getFormData: () => {
			return {
				content: content.trim(),
				metadata: {
					...(initialData.metadata || {}),
					image_url: imageUrl.trim(),
					showCaption: showCaption,
				},
			};
		},
	}));

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-2'>
				<label htmlFor='imageUrl' className='text-sm font-medium text-zinc-400'>
					Image URL
				</label>

				<input
					id='imageUrl'
					type='url'
					value={imageUrl}
					onChange={(e) => setImageUrl(e.target.value)}
					className='w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none'
					placeholder='Enter image URL here...'
				/>
			</div>

			<div className='flex flex-col gap-2'>
				<label
					htmlFor='imageCaption'
					className='text-sm font-medium text-zinc-400'
				>
					Image Caption/Description
				</label>

				<textarea
					id='imageCaption'
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={4}
					className='w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none'
					placeholder='Enter caption or description here...'
				/>
			</div>

			<div className='flex items-center gap-2'>
				<input
					type='checkbox'
					id='showCaption'
					checked={showCaption}
					onChange={(e) => setShowCaption(e.target.checked)}
					className='h-4 w-4 rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700'
				/>

				<label
					htmlFor='showCaption'
					className='text-sm font-medium text-zinc-400'
				>
					Show Caption
				</label>
			</div>
		</div>
	);
});

ImageNodeForm.displayName = 'ImageNodeForm';

export default ImageNodeForm;
