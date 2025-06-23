import { NodeTypes, nodeTypes } from '@/constants/node-types';
import useAppStore from '@/store/mind-map-store';
import {
	CheckSquare,
	Code,
	FileText,
	GroupIcon,
	HelpCircle,
	Image,
	Link,
	MessageSquare,
	Type, // Import Type icon for TextNode
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import Modal from '../modal';
import { Button } from '../ui/button';

const nodeTypeDisplayInfo: Record<
	string,
	{ name: string; icon: React.ElementType }
> = {
	defaultNode: { name: 'Basic Note', icon: FileText },
	taskNode: { name: 'Task', icon: CheckSquare },
	imageNode: { name: 'Image', icon: Image },
	questionNode: { name: 'Question', icon: HelpCircle },
	resourceNode: { name: 'Resource/Link', icon: Link },
	groupNode: { name: 'Group', icon: GroupIcon },
	annotationNode: { name: 'Annotation', icon: MessageSquare },
	codeNode: { name: 'Code Snippet', icon: Code },
	textNode: { name: 'Text', icon: Type }, // Add TextNode
};

export default function SelectNodeTypeModal() {
	const { popoverOpen, setPopoverOpen, nodeInfo, setNodeInfo, addNode } =
		useAppStore(
			useShallow((state) => ({
				addNode: state.addNode,
				setPopoverOpen: state.setPopoverOpen,
				popoverOpen: state.popoverOpen,
				nodeInfo: state.nodeInfo,
				setNodeInfo: state.setNodeInfo,
			}))
		);
	const availableTypes = Object.keys(nodeTypes).filter((type) =>
		nodeTypeDisplayInfo.hasOwnProperty(type)
	);

	availableTypes.sort((a, b) =>
		nodeTypeDisplayInfo[a].name.localeCompare(nodeTypeDisplayInfo[b].name)
	);

	const onClose = () => {
		setPopoverOpen({ nodeType: false });
		setNodeInfo(null);
	};

	const handleOnSelectType = (type: string) => {
		if (nodeInfo && nodeInfo.id) {
			addNode({
				parentNode: nodeInfo,
				nodeType: type as NodeTypes,
			});
		} else {
			const position = {
				x: nodeInfo?.position?.x || 0,
				y: nodeInfo?.position?.y || 0,
			};

			addNode({
				parentNode: null,
				nodeType: type as NodeTypes,
				position,
			});
		}

		onClose();
	};

	return (
		<Modal
			isOpen={popoverOpen.nodeType}
			onClose={onClose}
			title='Select Node Type'
		>
			<div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
				{availableTypes.map((type) => {
					if (type === 'groupNode') return null;

					const { name, icon: Icon } = nodeTypeDisplayInfo[type];
					return (
						<Button
							key={type}
							variant='secondary'
							onClick={() => handleOnSelectType(type)}
							className='flex h-auto items-center justify-center gap-4 p-4'
						>
							<>
								<Icon size={20} className='text-teal-400' />

								<span className='text-xs'>{name}</span>
							</>
						</Button>
					);
				})}
			</div>
		</Modal>
	);
}
