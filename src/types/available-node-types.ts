export type AvailableNodeTypes =
	| 'defaultNode'
	| 'textNode'
	| 'imageNode'
	| 'resourceNode'
	| 'questionNode'
	| 'annotationNode'
	| 'codeNode'
	| 'taskNode'
	| 'ghostNode'
	| (string & {});
