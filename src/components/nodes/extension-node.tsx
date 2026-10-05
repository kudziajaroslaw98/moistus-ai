'use client';

import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { Puzzle } from 'lucide-react';
import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { PluginNodeContent } from './content/plugin-node-content';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type ExtensionNodeProps = TypedNodeProps<'extensionNode'>;

/**
 * Host node for plugin-defined node kinds. The plugin's view is drawn by
 * PluginNodeContent (live when the plugin runs on this map, otherwise the saved view).
 */
const ExtensionNodeComponent = (props: ExtensionNodeProps) => {
	const { data, id } = props;
	const extension = data.metadata?.extension ?? null;
	const { canEdit } = usePermissions();

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			nodeClassName='extension-node'
			nodeIcon={<Puzzle className='size-4' />}
			nodeType='Extension'
		>
			{extension ? (
				<PluginNodeContent
					canEdit={canEdit}
					extension={extension}
					fallbackText={data.content ?? undefined}
					nodeId={id}
				/>
			) : (
				<div
					className='italic text-center py-4 text-sm'
					style={{ color: GlassmorphismTheme.text.disabled }}
				>
					Missing extension data
				</div>
			)}
		</BaseNodeWrapper>
	);
};

const ExtensionNode = memo(ExtensionNodeComponent);
ExtensionNode.displayName = 'ExtensionNode';
export default ExtensionNode;
