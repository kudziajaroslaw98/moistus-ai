'use client';

import { Puzzle } from 'lucide-react';
import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type ExtensionNodeProps = TypedNodeProps<'extensionNode'>;

/**
 * Host node for plugin-defined node kinds. Until a plugin runtime exists this always
 * renders the fallback card; the declarative snapshot renderer arrives with plugins.
 */
const ExtensionNodeComponent = (props: ExtensionNodeProps) => {
	const { data } = props;
	const extension = data.metadata?.extension ?? null;

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			nodeClassName='extension-node'
			nodeIcon={<Puzzle className='size-4' />}
			nodeType='Extension'
		>
			{extension ? (
				<div className='flex flex-col gap-2'>
					<span
						className='text-sm font-medium'
						style={{ color: GlassmorphismTheme.text.high }}
					>
						{extension.kind}
					</span>

					{data.content && (
						<p
							className='text-sm whitespace-pre-wrap'
							style={{ color: GlassmorphismTheme.text.medium }}
						>
							{data.content}
						</p>
					)}

					<span
						className='self-start rounded-sm px-2 py-0.5 text-xs'
						data-testid='extension-plugin-required'
						style={{
							backgroundColor: `${GlassmorphismTheme.elevation[4]}80`,
							color: GlassmorphismTheme.text.medium,
						}}
					>
						Requires plugin {extension.pluginId}
					</span>
				</div>
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
