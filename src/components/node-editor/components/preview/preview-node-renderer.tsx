'use client';

import { AnnotationContent } from '@/components/nodes/content/annotation-content';
import { CodeContent } from '@/components/nodes/content/code-content';
import { ImageContent } from '@/components/nodes/content/image-content';
import { MarkdownContent } from '@/components/nodes/content/markdown-content';
import { QuestionContent } from '@/components/nodes/content/question-content';
import { ReferenceContent } from '@/components/nodes/content/reference-content';
import { ResourceContent } from '@/components/nodes/content/resource-content';
import { TaskContent, type Task } from '@/components/nodes/content/task-content';
import { TextContent } from '@/components/nodes/content/text-content';
import { QuestionNodeMetadata, TaskNodeMetadata } from '@/components/nodes/core/types';
import { NodeData } from '@/types/node-data';
import { getSafeImageUrl } from '@/utils/secure-image-url';
import { memo, useMemo } from 'react';
import { PreviewModeProvider } from './preview-mode-context';
import { PreviewNodeFrame } from './preview-node-frame';
import { PreviewScaleContainer } from './preview-scale-container';
import {
	ParsedPreview,
	transformPreviewToNodeData,
} from './transform-preview-data';

interface PreviewNodeRendererProps {
	preview: ParsedPreview | null | undefined;
	nodeType: string;
}

/**
 * Preview Node Renderer
 *
 * Renders node content for preview using shared content components.
 * Extracts props from NodeData inline - no adapter layer needed.
 */
const PreviewNodeRendererComponent = ({
	preview,
	nodeType,
}: PreviewNodeRendererProps) => {
	// Transform preview data to node data format
	const nodeData = useMemo(
		() => transformPreviewToNodeData(preview, nodeType),
		[preview, nodeType]
	);

	// Don't render if no preview data
	if (!preview) {
		return null;
	}

	return (
		<PreviewModeProvider>
			<PreviewScaleContainer maxHeight={320}>
				{/* Disable all pointer events for static preview */}
				<div className='pointer-events-none select-none w-full'>
					<PreviewNodeFrame
						nodeType={nodeType}
						nodeData={nodeData}
						includePadding={shouldIncludePadding(nodeType)}
						elevation={1}
					>
						<PreviewContent nodeType={nodeType} data={nodeData} />
					</PreviewNodeFrame>
				</div>
			</PreviewScaleContainer>
		</PreviewModeProvider>
	);
};

/**
 * Determine if node type should include padding.
 * Some nodes like code and image handle their own padding.
 */
function shouldIncludePadding(nodeType: string): boolean {
	const noPaddingTypes = ['codeNode', 'imageNode', 'referenceNode'];
	return !noPaddingTypes.includes(nodeType);
}

/**
 * Preview Content Component
 *
 * Renders the appropriate shared content component based on node type.
 * Extracts props from NodeData inline - single place for all mappings.
 */
const PreviewContent = memo(({ nodeType, data }: { nodeType: string; data: NodeData }) => {
	switch (nodeType) {
		case 'defaultNode':
			return (
				<MarkdownContent
					content={data.content}
					placeholder='Add content...'
				/>
			);

		case 'taskNode': {
			const tasks: Task[] = (data.metadata as TaskNodeMetadata)?.tasks || [];
			return (
				<TaskContent
					tasks={tasks}
					placeholder='Add tasks...'
					showCelebrationEmoji={false}
				/>
			);
		}

		case 'codeNode':
			return (
				<CodeContent
					code={data.content || ''}
					language={(data.metadata?.language as string) || 'javascript'}
					showLineNumbers={Boolean(data.metadata?.showLineNumbers ?? true)}
					fileName={data.metadata?.fileName as string | undefined}
					maxHeight='300px'
				/>
			);

		case 'imageNode': {
			const rawImageUrl = (data.metadata?.imageUrl ||
				(data.metadata as Record<string, unknown>)?.image_url) as string | undefined;
			const imageUrl = getSafeImageUrl(rawImageUrl) ?? undefined;
			const showCaption = Boolean(data.metadata?.showCaption);
			const altText = (data.metadata?.altText as string) || data.content || 'Image';

			return (
				<ImageContent
					imageUrl={imageUrl}
					altText={altText}
					maxHeight='200px'
					minHeight='120px'
					caption={showCaption ? {
						content: data.content ?? undefined,
						placeholder: 'No caption',
					} : undefined}
				/>
			);
		}

		case 'annotationNode':
			return (
				<AnnotationContent
					content={data.content}
					annotationType={(data.metadata?.annotationType as string) || 'default'}
					fontSize={data.metadata?.fontSize as string | number | undefined}
					fontWeight={data.metadata?.fontWeight as string | number | undefined}
					author={data.metadata?.author as string | undefined}
				/>
			);

		case 'questionNode': {
			const metadata = data.metadata as QuestionNodeMetadata;
			return (
				<QuestionContent
					content={data.content}
					questionType={metadata?.questionType || 'binary'}
					options={metadata?.responseFormat?.options}
					userResponse={metadata?.userResponse}
					isAnswered={metadata?.isAnswered || metadata?.userResponse !== undefined}
				/>
			);
		}

		case 'resourceNode':
			return (
				<ResourceContent
					url={data.metadata?.url as string | undefined}
					title={(data.metadata?.title as string) || data.content || 'Resource'}
					description={data.content !== data.metadata?.title ? data.content ?? undefined : undefined}
					imageUrl={data.metadata?.imageUrl as string | undefined}
					summary={data.metadata?.summary as string | undefined}
					showThumbnail={Boolean(data.metadata?.showThumbnail)}
					showSummary={Boolean(data.metadata?.showSummary)}
				/>
			);

		case 'textNode': {
			const metadata = data.metadata as {
				fontSize?: string | number;
				fontWeight?: string | number;
				textAlign?: 'left' | 'center' | 'right';
				textColor?: string;
				fontStyle?: string;
			} | undefined;

			return (
				<TextContent
					content={data.content}
					fontSize={metadata?.fontSize}
					fontWeight={metadata?.fontWeight}
					textAlign={metadata?.textAlign}
					textColor={metadata?.textColor}
					fontStyle={metadata?.fontStyle}
				/>
			);
		}

		case 'referenceNode': {
			const metadata = data.metadata as {
				targetMapId?: string;
				targetNodeId?: string;
				targetMapTitle?: string;
				contentSnippet?: string;
			} | undefined;

			return (
				<ReferenceContent
					contentSnippet={metadata?.contentSnippet || data.content || undefined}
					targetMapTitle={metadata?.targetMapTitle}
					hasValidReference={Boolean(metadata?.targetMapId || metadata?.targetNodeId)}
				/>
			);
		}

		// Fallback to markdown content for unknown types
		default:
			return (
				<MarkdownContent
					content={data.content}
					placeholder='Add content...'
				/>
			);
	}
});

PreviewContent.displayName = 'PreviewContent';

export const PreviewNodeRenderer = memo(PreviewNodeRendererComponent);
PreviewNodeRenderer.displayName = 'PreviewNodeRenderer';
