'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { ClipboardCopy, Code, Eye, EyeOff, SquareCode } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

import { memo, useCallback, useState } from 'react';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Toggle } from '../ui/toggle';
import { BaseNodeWrapper } from './base-node-wrapper';

type CodeNodeProps = NodeProps<Node<NodeData>>;

const languageOptions = [
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'html', label: 'HTML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'sql', label: 'SQL' },
	{ value: 'json', label: 'JSON' },
	{ value: 'bash', label: 'Bash' },
	{ value: 'java', label: 'Java' },
	{ value: 'cpp', label: 'C++' },
	{ value: 'csharp', label: 'C#' },
	{ value: 'php', label: 'PHP' },
	{ value: 'ruby', label: 'Ruby' },
	{ value: 'go', label: 'Go' },
	{ value: 'rust', label: 'Rust' },
];

const CodeNodeComponent = (props: CodeNodeProps) => {
	const { id, data } = props;

	const { updateNode } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
		}))
	);

	const codeContent = data.content || '';
	const language = (data.metadata?.language as string) || 'javascript';
	const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);
	const [copied, setCopied] = useState(false);

	const handleNodeChange = useCallback(
		(change: Partial<NodeData['metadata']>) => {
			updateNode({
				nodeId: id,
				data: {
					metadata: {
						...data.metadata,
						...change,
					},
				},
			});
		},
		[updateNode, id, data.metadata]
	);

	const handleCopy = useCallback(async () => {
		if (!codeContent) return;

		try {
			await navigator.clipboard.writeText(codeContent);
			setCopied(true);
			toast.success('Code copied to clipboard!');
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
			toast.error('Failed to copy code');
		}
	}, [codeContent]);

	const toolbarContent = (
		<>
			{/* Language Selector */}
			<Select
				value={language}
				onValueChange={(value) => handleNodeChange({ language: value })}
			>
				<SelectTrigger className='h-8 w-32' size='sm'>
					<SelectValue />
				</SelectTrigger>

				<SelectContent>
					{languageOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Line Numbers Toggle */}
			<Toggle
				size={'sm'}
				variant={'outline'}
				pressed={showLineNumbers}
				onPressedChange={(pressed) => {
					handleNodeChange({ showLineNumbers: pressed });
				}}
				title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
			>
				{showLineNumbers ? (
					<Eye className='w-4 h-4' />
				) : (
					<EyeOff className='w-4 h-4' />
				)}
			</Toggle>

			{/* Copy Code Button (moved to toolbar) */}
			<Button
				onClick={handleCopy}
				size={'sm'}
				variant={'outline'}
				className='h-8 px-2'
				disabled={copied}
				title='Copy code to clipboard'
			>
				<ClipboardCopy className='w-4 h-4' />
			</Button>
		</>
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='code-node'
			nodeType='Code'
			nodeIcon={<Code className='size-4' />}
			includePadding={false}
			toolbarContent={toolbarContent}
		>
			<div className='w-full flex-grow overflow-auto '>
				<div className='flex justify-between p-4'>
					<div className=' flex flex-col w-full'>
						<div className='flex gap-4 items-center'>
							<SquareCode className='size-6 text-node-text-main' />

							<span className='capitalize text-lg text-node-text-main'>
								{data.metadata?.language}
							</span>
						</div>

						{data.metadata?.fileName && (
							<span className='ml-10 text-node-text-secondary'>
								{data.metadata?.fileName}
							</span>
						)}
					</div>
				</div>

				<SyntaxHighlighter
					language={language}
					style={vscDarkPlus}
					showLineNumbers={showLineNumbers}
					wrapLines={true}
					wrapLongLines={true}
					customStyle={{
						width: '100%',
						margin: 0,
						padding: '1rem',
						borderRadius: '0 0 0.5rem 0.5rem',
						fontSize: '0.8rem',
						backgroundColor: '',
					}}
					codeTagProps={{
						style: {
							fontFamily: 'var(--font-geist-mono)',
							lineHeight: '1.4',
						},
					}}
				>
					{codeContent || '// Add code snippet here...'}
				</SyntaxHighlighter>
			</div>
		</BaseNodeWrapper>
	);
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = 'CodeNode';
export default CodeNode;
