export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

import { ClipboardSlice } from "./slices/clipboard-slice";
import { CommentsSlice } from "./slices/comments-slice";
import { CoreDataSlice } from "./slices/core-slice";
import { EdgesSlice } from "./slices/edges-slice";
import { GroupsSlice } from "./slices/groups-slice";
import { HistorySlice } from "./slices/history-slice";
import { LayoutSlice } from "./slices/layout-slice";
import { LoadingStatesSlice } from "./slices/loading-state-slice";
import { NodesSlice } from "./slices/nodes-slice";
import { UIStateSlice } from "./slices/ui-slice";

export interface AppState
  extends CoreDataSlice,
    NodesSlice,
    EdgesSlice,
    ClipboardSlice,
    UIStateSlice,
    LoadingStatesSlice,
    HistorySlice,
    LayoutSlice,
    GroupsSlice,
    CommentsSlice {}
