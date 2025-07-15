import { AppNode } from '@/types/app-node';
import { NodeData } from '@/types/node-data';

export function isAppNode(node: AppNode | NodeData): node is AppNode {
	return node?.data !== undefined;
}
