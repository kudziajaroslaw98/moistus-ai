import { RecipesPageSkeleton } from './recipes-content';

/** Recipes content while it loads; the shell around it stays as it is. */
export default function RecipesLoading() {
	return <RecipesPageSkeleton />;
}
