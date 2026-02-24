export interface SupabaseLikeError {
	message: string;
	details?: string | null;
	hint?: string | null;
	code?: string | null;
}
