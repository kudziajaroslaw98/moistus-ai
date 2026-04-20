import { connectionSuggestionSchema } from '@/helpers/ai-connection-postprocess';
import z from 'zod';

export type AiConnectionSuggestion = z.infer<typeof connectionSuggestionSchema>;
