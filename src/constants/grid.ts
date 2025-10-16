export const GRID_SIZE = 16;

export function ceilToGrid(value: number, grid: number = GRID_SIZE): number {
	if (!Number.isFinite(value)) return 0;
	return Math.ceil(value / grid) * grid;
}
