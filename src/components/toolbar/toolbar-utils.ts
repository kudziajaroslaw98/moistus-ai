import type { Tool } from '@/types/tool';

export type CursorTool = 'default' | 'pan' | 'connector';

export const isCursorTool = (tool: Tool): tool is CursorTool =>
	tool === 'default' || tool === 'pan' || tool === 'connector';

export const getCursorToolTriggerVariant = (tool: Tool) =>
	isCursorTool(tool) ? 'default' : 'secondary';
