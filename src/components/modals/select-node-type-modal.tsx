import { NodeRegistry, AvailableNodeTypes } from '@/registry';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';
import Modal from '../modal';
import { Button } from '../ui/button';

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
	// Get creatable types from registry and sort by label
	const availableTypes = NodeRegistry.getCreatableTypes()
		.filter((type) => type !== 'groupNode') // Exclude groupNode
		.sort((a, b) => {
			const labelA = NodeRegistry.getDisplayInfo(a).label;
			const labelB = NodeRegistry.getDisplayInfo(b).label;
			return labelA.localeCompare(labelB);
		});

	const onClose = () => {
		setPopoverOpen({ nodeType: false });
		setNodeInfo(null);
	};

	const handleOnSelectType = (type: string) => {
		if (nodeInfo && nodeInfo.id) {
			addNode({
				parentNode: nodeInfo,
				nodeType: type as AvailableNodeTypes,
			});
		} else {
			const position = {
				x: nodeInfo?.position?.x || 0,
				y: nodeInfo?.position?.y || 0,
			};

			addNode({
				parentNode: null,
				nodeType: type as AvailableNodeTypes,
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
					const { label, icon: Icon } = NodeRegistry.getDisplayInfo(type);
					return (
						<Button
							key={type}
							variant='secondary'
							onClick={() => handleOnSelectType(type)}
							className='flex h-auto items-center justify-center gap-4 p-4'
						>
							<>
								<Icon size={20} className='text-teal-400' />

								<span className='text-xs'>{label}</span>
							</>
						</Button>
					);
				})}
			</div>
		</Modal>
	);
}
