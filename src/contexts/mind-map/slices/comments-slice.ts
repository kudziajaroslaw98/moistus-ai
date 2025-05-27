export interface CommentsSlice {
  // Comments state
  nodeComments: Record<string, NodeComment[]>;
  mapComments: MapComment[];
  commentFilter: CommentFilter;
  commentSort: CommentSort;
  selectedCommentId: string | null;
  commentDrafts: Record<string, string>;

  // Comments actions
  fetchNodeComments: (nodeId: string) => Promise<void>;
  fetchMapComments: () => Promise<void>;
  addNodeComment: (
    nodeId: string,
    content: string,
    parentId?: string,
  ) => Promise<void>;
  addMapComment: (
    content: string,
    position?: { x: number; y: number },
    parentId?: string,
  ) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
  unresolveComment: (commentId: string) => Promise<void>;
  setCommentFilter: (filter: CommentFilter) => void;
  setCommentSort: (sort: CommentSort) => void;
  setSelectedComment: (commentId: string | null) => void;
  updateCommentDraft: (targetId: string, content: string) => void;
  clearCommentDraft: (targetId: string) => void;
}
