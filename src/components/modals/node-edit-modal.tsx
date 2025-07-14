import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { nodeTypesConfig } from '@/constants/node-types';
import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { SidePanel } from '../side-panel';
import { Button } from '../ui/button';
import { FormField } from '../ui/form-field';
import { Spinner } from '../ui/spinner';

// Define the interface for the props that each specific node form will receive
export interface NodeSpecificFormProps {
	initialData: Partial<NodeData>; // Changed from initialMetadata to initialData
	disabled?: boolean;
	nodeId: string;
}

// Define the interface for the ref that each specific node form must expose
export interface NodeFormRef {
	getFormData: () => Partial<NodeData> | null;
}

// Enhanced interface for real-time capable forms
export interface EnhancedNodeFormRef extends NodeFormRef {
	forceSync: () => void;
}

// Lazy load form components
const DefaultNodeForm = React.lazy(
	() => import('../node-forms/default-node-form')
);
const TextNodeForm = React.lazy(() => import('../node-forms/text-node-form'));
const ImageNodeForm = React.lazy(() => import('../node-forms/image-node-form'));
const ResourceNodeForm = React.lazy(
	() => import('../node-forms/resource-node-form')
);
const QuestionNodeForm = React.lazy(
	() => import('../node-forms/question-node-form')
);
const AnnotationNodeForm = React.lazy(
	() => import('../node-forms/annotation-node-form')
);
const CodeNodeForm = React.lazy(() => import('../node-forms/code-node-form'));
const TaskNodeForm = React.lazy(() => import('../node-forms/task-node-form'));
// Add other forms here

const nodeSpecificForms: Record<
	keyof typeof nodeTypesConfig,
	React.LazyExoticComponent<
		React.ForwardRefExoticComponent<
			NodeSpecificFormProps & React.RefAttributes<any>
		>
	>
> = {
	defaultNode: DefaultNodeForm,
	textNode: TextNodeForm,
	imageNode: ImageNodeForm,
	resourceNode: ResourceNodeForm,
	questionNode: QuestionNodeForm,
	annotationNode: AnnotationNodeForm,
	codeNode: CodeNodeForm,
	taskNode: TaskNodeForm,
	// map other node types to their respective form components
};

const getDefaultMetadataForType = (
	nodeType: string
): Partial<NodeData['metadata']> => {
	const config = nodeTypesConfig[nodeType as keyof typeof nodeTypesConfig];
	return config?.defaultMetadata || {};
};

export default function NodeEditModal() {
	const {
		popoverOpen,
		setPopoverOpen,
		updateNode,
		nodes,
		nodeInfo: node,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			updateNode: state.updateNode,
			nodes: state.nodes,
			nodeInfo: state.nodeInfo,
		}))
	);
	const isOpen = popoverOpen.nodeEdit;

	const [selectedNodeType, setSelectedNodeType] =
		useState<string>('defaultNode');
	const [isSaving, setIsSaving] = useState(false);
	const [nodeData, setNodeData] = useState<Partial<NodeData>>({});
	const formRef = useRef<NodeFormRef | EnhancedNodeFormRef>(null);

	useEffect(() => {
		if (node !== null && isOpen && !isSaving) {
			const currentType = node?.data?.node_type || 'defaultNode';
			setSelectedNodeType(currentType);
			setNodeData(node.data!);
		}
	}, [nodes, node, isOpen, isSaving]);

	const handleNodeTypeChange = (newType: string) => {
		if (!node || isSaving || newType === selectedNodeType) return;
		setSelectedNodeType(newType);
	};

	const handleSave = async () => {
		if (!node || !nodeData) return;

		let specificMetadata: Partial<NodeData['metadata']> | null = null;

		if (formRef.current && formRef.current.getFormData) {
			specificMetadata = formRef.current.getFormData()?.metadata;
		}

		const changes: Partial<NodeData> = {
			...nodeData,
			content: formRef.current?.getFormData()?.content ?? null,
			node_type: selectedNodeType,
			metadata: specificMetadata,
			aiData: formRef.current?.getFormData()?.aiData ?? null,
		};

		if (
			specificMetadata &&
			Object.keys(specificMetadata).length === 0 &&
			selectedNodeType !== 'defaultNode' &&
			selectedNodeType !== 'groupNode' &&
			selectedNodeType !== 'builderNode'
		) {
			const defaultMeta = getDefaultMetadataForType(selectedNodeType);

			if (
				JSON.stringify(specificMetadata) === JSON.stringify(defaultMeta) ||
				Object.keys(specificMetadata).length === 0
			) {
				changes.metadata = null;
			}
		} else if (
			!specificMetadata &&
			selectedNodeType !== 'defaultNode' &&
			selectedNodeType !== 'groupNode' &&
			selectedNodeType !== 'builderNode'
		) {
			changes.metadata = null;
		}

		setIsSaving(true);
		await updateNode({ nodeId: node.id!, data: changes });
		setIsSaving(false);
		setNodeData((prev) => ({
			...prev,
			...changes,
			content: changes.content || prev.content || null,
			metadata: {
				...prev.metadata,
				...changes.metadata,
			},
			aiData: {
				...prev.aiData,
				...changes.aiData,
			},
		}));
		handleOnClose();
	};

	const NodeSpecificFormComponent = nodeSpecificForms[selectedNodeType] || null;
	const nodeTypeLabel =
		nodeTypesConfig[selectedNodeType as keyof typeof nodeTypesConfig]?.label ||
		selectedNodeType;

	const handleOnClose = () => {
		setPopoverOpen({ nodeEdit: false });
	};

	return (
		<SidePanel
			isOpen={isOpen}
			onClose={handleOnClose}
			title={`Edit Node: ${nodeTypeLabel}`}
		>
			<div className='flex flex-col gap-4'>
				<FormField id='nodeType' label='Node Type'>
					<Select
						value={selectedNodeType}
						onValueChange={(value) => setSelectedNodeType(value)}
					>
						<SelectTrigger className='bg-zinc-900 border-zinc-700'>
							<SelectValue />
						</SelectTrigger>

						<SelectContent>
							{Object.keys(nodeTypesConfig).map((typeKey) => (
								<SelectItem key={typeKey} value={typeKey}>
									{nodeTypesConfig[typeKey as keyof typeof nodeTypesConfig]
										.label || typeKey}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>

				<Suspense
					fallback={
						<div className='flex justify-center items-center h-20'>
							<Spinner />
						</div>
					}
				>
					{NodeSpecificFormComponent && node?.id && (
						<NodeSpecificFormComponent
							ref={formRef}
							initialData={nodeData}
							nodeId={node.id}
						/>
					)}

					{!NodeSpecificFormComponent &&
						selectedNodeType !== 'defaultNode' &&
						selectedNodeType !== 'builderNode' && (
							<p className='text-sm text-zinc-500 italic'>
								No specific properties form configured for this node type.
							</p>
						)}
				</Suspense>

				<div className='mt-auto flex flex-shrink-0 justify-end gap-3 border-t border-zinc-700 pt-4'>
					<Button onClick={handleOnClose} variant='outline'>
						Cancel
					</Button>

					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</SidePanel>
	);
}
