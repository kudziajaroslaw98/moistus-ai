import { MapComment, NodeComment } from "@/types/comment-types";

export function isNodeComment(
  comment: NodeComment | MapComment,
): comment is NodeComment {
  // @ts-expect-error checking if comment is NodeComment
  return comment?.node_id !== undefined;
}
