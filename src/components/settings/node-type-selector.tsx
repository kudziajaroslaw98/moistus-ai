'use client';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { NodeRegistry, NODE_REGISTRY, type AvailableNodeTypes } from '@/registry/node-registry';
import { useMemo } from 'react';

// Node types that have command triggers (user-creatable via commands)
type CommandCreatableNodeType = 'defaultNode' | 'textNode' | 'taskNode' | 'imageNode' | 'resourceNode' | 'questionNode' | 'codeNode' | 'annotationNode' | 'referenceNode';

interface NodeTypeSelectorProps {
	value: CommandCreatableNodeType;
	onChange: (value: CommandCreatableNodeType) => void;
	disabled?: boolean;
}

export function NodeTypeSelector({ value, onChange, disabled }: NodeTypeSelectorProps) {
	// Get creatable types with command triggers (excludes groupNode, commentNode, ghostNode)
	const selectableTypes = useMemo(() => {
		return NodeRegistry.getCreatableTypes()
			.filter((type) => NODE_REGISTRY[type].commandTrigger !== null)
			.map((type) => ({
				type: type as CommandCreatableNodeType,
				label: NODE_REGISTRY[type].label,
				description: NODE_REGISTRY[type].description,
				Icon: NODE_REGISTRY[type].icon,
			}));
	}, []);

	return (
		<Select
			disabled={disabled}
			value={value}
			onValueChange={(v) => onChange(v as CommandCreatableNodeType)}
		>
			<SelectTrigger>
				<SelectValue placeholder="Select default node type">
					{value && (
						<span className="flex items-center gap-2">
							{(() => {
								const config = NODE_REGISTRY[value];
								const Icon = config.icon;
								return (
									<>
										<Icon className="size-4 text-text-secondary" />
										<span>{config.label}</span>
									</>
								);
							})()}
						</span>
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{selectableTypes.map(({ type, label, description, Icon }) => (
					<SelectItem key={type} value={type}>
						<div className="flex items-center gap-2">
							<Icon className="size-4 text-text-secondary" />
							<div className="flex flex-col">
								<span>{label}</span>
								<span className="text-xs text-text-secondary">{description}</span>
							</div>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
