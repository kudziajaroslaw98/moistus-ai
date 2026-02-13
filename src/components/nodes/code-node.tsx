'use client';

import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { cn } from '@/lib/utils';
import useAppStore from '@/store/mind-map-store';
import { Code, Hash } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { SharedNodeToolbar } from './components/node-toolbar';
import { LanguagePicker } from './components/language-picker';
import {
	CopyFeedback,
	ExpandControl,
	ToolbarSeparator,
} from './components/toolbar-controls';
import { CodeContent } from './content/code-content';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type CodeNodeProps = TypedNodeProps<'codeNode'>;

/**
 * Code Node Component
 *
 * Displays syntax-highlighted code with interactive features:
 * - Copy to clipboard (toolbar)
 * - Expand/collapse for long code (toolbar)
 * - Language picker dropdown (toolbar)
 * - Line numbers toggle (toolbar)
 *
 * Uses shared CodeContent from content/code-content.tsx
 */
const CodeNodeComponent = (props: CodeNodeProps) => {
	const { data } = props;
	const { canEdit } = usePermissions();
	const [copied, setCopied] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	const { updateNode, selectedNodes } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
		}))
	);

	const theme = GlassmorphismTheme;

	const codeContent = data.content || '';
	const language = (data.metadata?.language as string) || 'javascript';
	const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);
	const fileName = data.metadata?.fileName as string | undefined;

	const handleCopy = useCallback(async () => {
		if (!codeContent) return;

		try {
			await navigator.clipboard.writeText(codeContent);
			setCopied(true);
			toast.success('Code copied to clipboard!', {
				style: {
					background: 'var(--color-bg-elevated)',
					color: 'var(--color-text-primary)',
					border: `1px solid rgba(52, 211, 153, 0.3)`,
				},
			});
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
			toast.error('Failed to copy code', {
				style: {
					background: 'var(--color-bg-elevated)',
					color: 'var(--color-text-primary)',
					border: `1px solid rgba(239, 68, 68, 0.3)`,
				},
			});
		}
	}, [codeContent]);

	const handleLanguageChange = useCallback(
		(lang: string) => {
			updateNode({
				nodeId: data.id,
				data: { metadata: { ...data.metadata, language: lang } },
			});
		},
		[updateNode, data.id, data.metadata]
	);

	const handleToggleLineNumbers = useCallback(() => {
		updateNode({
			nodeId: data.id,
			data: { metadata: { ...data.metadata, showLineNumbers: !showLineNumbers } },
		});
	}, [showLineNumbers, updateNode, data.id, data.metadata]);

	// Calculate line count for display
	const lineCount = codeContent.split('\n').length;

	// Gradient overlay for collapsed state
	const codeOverlay =
		!isExpanded && lineCount > 20 ? (
			<div className='absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-linear-to-t from-elevation-0 to-transparent' />
		) : null;

	const buttonStyle = {
		backgroundColor: 'transparent',
		border: `1px solid ${theme.borders.hover}`,
		color: theme.text.medium,
	};

	const activeStyle = {
		backgroundColor: 'rgba(96, 165, 250, 0.2)',
		border: `1px solid ${theme.borders.accent}`,
		color: theme.text.high,
	};

	return (
		<>
			<SharedNodeToolbar
				isVisible={props.selected && selectedNodes.length === 1}
				readOnly={!canEdit}
			>
				<Button
					className="h-8 w-8 p-0"
					disabled={copied}
					onClick={handleCopy}
					size="sm"
					style={buttonStyle}
					title="Copy code"
					variant="outline"
				>
					<CopyFeedback copied={copied} />
				</Button>
				<ToolbarSeparator />
				<LanguagePicker
					disabled={!canEdit}
					language={language}
					onLanguageChange={handleLanguageChange}
				/>
				<Button
					className="h-8 w-8 p-0"
					disabled={!canEdit}
					onClick={handleToggleLineNumbers}
					size="sm"
					style={showLineNumbers ? activeStyle : buttonStyle}
					title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
					variant="outline"
				>
					<Hash className="w-4 h-4" />
				</Button>
				{lineCount > 20 && (
					<>
						<ToolbarSeparator />
						<ExpandControl
							isExpanded={isExpanded}
							onToggle={setIsExpanded}
							canExpand={true}
						/>
					</>
				)}
			</SharedNodeToolbar>

			<BaseNodeWrapper
				{...props}
				hideNodeType
				elevation={1}
				includePadding={false}
				nodeClassName='code-node'
				nodeIcon={<Code className='size-4' />}
				nodeType='Code'
			>
				<CodeContent
					code={codeContent}
					language={language}
					showLineNumbers={showLineNumbers}
					fileName={fileName}
					maxHeight={isExpanded ? 'none' : '400px'}
					codeOverlay={codeOverlay}
					codeClassName={cn(
						'transition-all duration-300 ease-spring',
						isExpanded ? 'max-h-none' : 'max-h-100'
					)}
				/>
			</BaseNodeWrapper>
		</>
	);
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = 'CodeNode';
export default CodeNode;
