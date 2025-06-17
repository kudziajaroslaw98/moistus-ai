export interface RealtimeFormState extends Record<string, any> {
	user_id: string;
	map_id: string;
	activeField: string | null;
}
