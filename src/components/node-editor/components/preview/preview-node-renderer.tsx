'use client';

import { memo, useMemo } from 'react';
import { getContentComponent } from './content-extractors';
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
 * Main orchestrator component that:
 * 1. Transforms preview data → node data format
 * 2. Gets the appropriate content component from registry
 * 3. Wraps in PreviewModeProvider + PreviewNodeFrame
 * 4. Applies scaling to fit the preview container
 * 5. Disables all pointer events for static preview
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

	// Get the appropriate content component
	const ContentComponent = useMemo(
		() => getContentComponent(nodeType),
		[nodeType]
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
						<ContentComponent data={nodeData} />
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

export const PreviewNodeRenderer = memo(PreviewNodeRendererComponent);
PreviewNodeRenderer.displayName = 'PreviewNodeRenderer';
