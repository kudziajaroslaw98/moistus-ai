import { z } from 'zod';

/**
 * Schema for updating mind map metadata
 * All fields are optional since user may update only specific fields
 */
export const updateMapSchema = z.object({
	title: z
		.string()
		.min(1, 'Map title cannot be empty')
		.max(255, 'Map title is too long')
		.optional(),

	description: z
		.string()
		.max(2000, 'Description is too long')
		.nullable()
		.optional(),

	tags: z
		.array(z.string().min(1).max(50))
		.max(20, 'Maximum 20 tags allowed')
		.optional(),

	thumbnailUrl: z
		.string()
		.url('Invalid thumbnail URL')
		.nullable()
		.optional(),

	is_template: z.boolean().optional(),

	template_category: z
		.string()
		.min(1)
		.max(100, 'Template category is too long')
		.nullable()
		.optional(),
});

/**
 * Type inference for update map request
 */
export type UpdateMapData = z.infer<typeof updateMapSchema>;

/**
 * Schema for delete confirmation
 * Requires exact map title to confirm deletion
 */
export const deleteMapConfirmSchema = z.object({
	mapId: z.string().uuid('Invalid map ID'),
	confirmTitle: z.string().min(1, 'Please type the map name to confirm'),
});

/**
 * Type inference for delete confirmation
 */
export type DeleteMapConfirmData = z.infer<typeof deleteMapConfirmSchema>;

/**
 * Success response schema for map update
 */
export const mapUpdateSuccessSchema = z.object({
	status: z.literal('success'),
	data: z.object({
		map: z.object({
			id: z.string().uuid(),
			user_id: z.string().uuid(),
			title: z.string(),
			description: z.string().nullable(),
			tags: z.array(z.string()).optional(),
			thumbnailUrl: z.string().url().nullable().optional(),
			is_template: z.boolean().optional(),
			template_category: z.string().nullable().optional(),
			created_at: z.string(),
			updated_at: z.string(),
		}),
	}),
});

/**
 * Type inference for map update success response
 */
export type MapUpdateSuccessResponse = z.infer<typeof mapUpdateSuccessSchema>;

/**
 * Success response schema for map deletion
 * Includes counts of deleted related data
 */
export const mapDeleteSuccessSchema = z.object({
	status: z.literal('success'),
	data: z.object({
		mapId: z.string().uuid(),
		title: z.string(),
		deletedCounts: z.object({
			nodes: z.number().int().nonnegative(),
			edges: z.number().int().nonnegative(),
		}),
	}),
	statusNumber: z.number(),
	statusText: z.string().optional(),
});

/**
 * Type inference for map delete success response
 */
export type MapDeleteSuccessResponse = z.infer<typeof mapDeleteSuccessSchema>;
