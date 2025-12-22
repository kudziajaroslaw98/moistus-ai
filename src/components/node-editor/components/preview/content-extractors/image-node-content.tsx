'use client';

import { ImageContent } from '@/components/nodes/content/image-content';
import { NodeData } from '@/types/node-data';
import { getProxiedImageUrl } from '@/utils/image-proxy';
import { memo, useMemo } from 'react';

interface ImageNodeContentProps {
	data: NodeData;
}

/**
 * Image Node Content Adapter for Preview
 *
 * Thin wrapper around shared ImageContent component.
 * Read-only display without controls or export placeholder.
 */
const ImageNodeContentComponent = ({ data }: ImageNodeContentProps) => {
	const rawImageUrl = (data.metadata?.imageUrl ||
		(data.metadata as Record<string, unknown>)?.image_url) as
		| string
		| undefined;

	const imageUrl = getProxiedImageUrl(rawImageUrl);
	const showCaption = Boolean(data.metadata?.showCaption);
	const altText =
		(data.metadata?.altText as string) || data.content || 'Image';

	const captionProps = useMemo(
		() =>
			showCaption
				? {
						content: data.content ?? undefined,
						placeholder: 'No caption',
					}
				: undefined,
		[showCaption, data.content]
	);

	return (
		<ImageContent
			imageUrl={imageUrl}
			altText={altText}
			maxHeight='200px'
			minHeight='120px'
			caption={captionProps}
		/>
	);
};

export const ImageNodeContent = memo(ImageNodeContentComponent);
ImageNodeContent.displayName = 'ImageNodeContent';
