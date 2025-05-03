export interface EdgeData extends Record<string, unknown> {
  id: string;
  map_id: string;
  user_id: string;
  source: string;
  target: string;
  type?: string;
  label?: string | null;
  animated?: boolean;
  markerEnd?: string;
  created_at?: string;
  updated_at?: string;
  color?: string | null;
  strokeWidth?: number | null;
  metadata?: {
    [key: string]: unknown;
  } | null;
  isSuggested?: boolean | null;
  reason?: string | null;
}
